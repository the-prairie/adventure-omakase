-- One deployment, one friends' trip. D1's batch() is the transaction boundary.
PRAGMA foreign_keys = ON;
CREATE TABLE trips (
 id TEXT PRIMARY KEY, singleton INTEGER NOT NULL DEFAULT 1 UNIQUE CHECK(singleton=1),
 name TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL,
 invite_token TEXT NOT NULL UNIQUE, invite_version INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL
);
CREATE TABLE members (
 id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id), name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('owner','member')), recovery_hash TEXT UNIQUE,
 profile TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(profile)), active INTEGER NOT NULL DEFAULT 1,
 read_seq INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL
);
CREATE UNIQUE INDEX active_names ON members(trip_id,lower(name)) WHERE active=1;
CREATE INDEX members_trip ON members(trip_id);
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES members(id), expires INTEGER NOT NULL
);
CREATE INDEX sessions_member ON sessions(member_id);
CREATE INDEX sessions_expiry ON sessions(expires);
CREATE TABLE plans (
 id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id), host_id TEXT NOT NULL REFERENCES members(id),
 body TEXT NOT NULL CHECK(json_valid(body)), revision INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','cancelled','completed')),
 request_id TEXT, created TEXT NOT NULL, updated TEXT NOT NULL, UNIQUE(host_id,request_id)
);
CREATE INDEX plans_trip ON plans(trip_id);
CREATE TABLE rsvps (
 plan_id TEXT NOT NULL REFERENCES plans(id), member_id TEXT NOT NULL REFERENCES members(id),
 choice TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('joined','interested','waitlist')),
 accepted_revision INTEGER NOT NULL, acknowledge_conflict INTEGER NOT NULL DEFAULT 0,
 updated TEXT NOT NULL, PRIMARY KEY(plan_id,member_id)
);
CREATE INDEX rsvps_member ON rsvps(member_id);
CREATE TABLE comments (
 id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES plans(id), member_id TEXT NOT NULL REFERENCES members(id),
 text TEXT NOT NULL, request_id TEXT, created TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
 UNIQUE(member_id,request_id)
);
CREATE INDEX comments_plan ON comments(plan_id,created);
CREATE TABLE picks (
 member_id TEXT NOT NULL REFERENCES members(id), catalogue_id TEXT NOT NULL, shared INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(member_id,catalogue_id)
);
CREATE TABLE discoveries (
 id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id), member_id TEXT NOT NULL REFERENCES members(id),
 body TEXT NOT NULL CHECK(json_valid(body)), revision INTEGER NOT NULL DEFAULT 1,
 deleted INTEGER NOT NULL DEFAULT 0, request_id TEXT, created TEXT NOT NULL, updated TEXT NOT NULL,
 UNIQUE(member_id,request_id)
);
CREATE INDEX discoveries_trip ON discoveries(trip_id);
CREATE TABLE photos (
 id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id), member_id TEXT NOT NULL REFERENCES members(id),
 object_key TEXT NOT NULL UNIQUE, bytes INTEGER NOT NULL, sha256 TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'uploading', created TEXT NOT NULL
);
CREATE INDEX photos_trip ON photos(trip_id);
CREATE TABLE moments (
 id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id), member_id TEXT NOT NULL REFERENCES members(id),
 body TEXT NOT NULL CHECK(json_valid(body)), visibility TEXT NOT NULL DEFAULT 'group' CHECK(visibility IN ('group','private')),
 revision INTEGER NOT NULL DEFAULT 1, deleted INTEGER NOT NULL DEFAULT 0, request_id TEXT,
 created TEXT NOT NULL, updated TEXT NOT NULL, UNIQUE(member_id,request_id)
);
CREATE INDEX moments_trip ON moments(trip_id,deleted,created);
CREATE TABLE changes (
 seq INTEGER PRIMARY KEY AUTOINCREMENT, trip_id TEXT NOT NULL REFERENCES trips(id), actor TEXT NOT NULL,
 kind TEXT NOT NULL, entity TEXT NOT NULL, summary TEXT NOT NULL,
 audience TEXT NOT NULL DEFAULT 'group', created TEXT NOT NULL
);
CREATE INDEX changes_trip_seq ON changes(trip_id,seq);
CREATE TABLE imports (
 member_id TEXT NOT NULL REFERENCES members(id), fingerprint TEXT NOT NULL, created TEXT NOT NULL,
 PRIMARY KEY(member_id,fingerprint)
);
CREATE TABLE limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO app_meta VALUES('schema','3');

-- Commitments always derive times from the current plan, including chosen parts.
CREATE VIEW commitments AS
 SELECT p.id AS plan_id,p.trip_id,p.host_id AS member_id,json_extract(p.body,'$.title') AS title,
 json_extract(p.body,'$.date') AS day,json_extract(p.body,'$.start') AS start,json_extract(p.body,'$.end') AS end
 FROM plans p JOIN members m ON m.id=p.host_id WHERE p.status='open' AND m.active=1
 UNION ALL
 SELECT p.id,p.trip_id,r.member_id,json_extract(p.body,'$.title'),json_extract(p.body,'$.date'),
 COALESCE((SELECT json_extract(s.value,'$.start') FROM json_each(p.body,'$.segments') s WHERE json_extract(s.value,'$.id')=r.choice),json_extract(p.body,'$.start')),
 COALESCE((SELECT json_extract(s.value,'$.end') FROM json_each(p.body,'$.segments') s WHERE json_extract(s.value,'$.id')=r.choice),json_extract(p.body,'$.end'))
 FROM plans p JOIN rsvps r ON r.plan_id=p.id JOIN members m ON m.id=r.member_id
 WHERE p.status='open' AND r.status='joined' AND m.active=1;

CREATE TRIGGER members_limit BEFORE INSERT ON members WHEN COALESCE((SELECT value FROM app_meta WHERE key='restoring'),'0')!='1' BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM members WHERE trip_id=NEW.trip_id AND active=1)>=60
 THEN RAISE(ABORT,'trip_full') END;
END;
CREATE TRIGGER plans_capacity BEFORE UPDATE OF body ON plans BEGIN
 SELECT CASE WHEN json_extract(NEW.body,'$.capacity') IS NOT NULL AND
 json_extract(NEW.body,'$.capacity') < 1+(SELECT count(*) FROM rsvps r JOIN members m ON m.id=r.member_id WHERE r.plan_id=NEW.id AND r.status='joined' AND m.active=1)
 THEN RAISE(ABORT,'capacity_below_members') END;
END;

-- Enforcement happens inside SQLite, not in a racy read-then-write check.
CREATE TRIGGER rsvp_guard_insert BEFORE INSERT ON rsvps WHEN COALESCE((SELECT value FROM app_meta WHERE key='restoring'),'0')!='1' BEGIN

 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM plans p JOIN members m ON m.id=NEW.member_id
 WHERE p.id=NEW.plan_id AND p.trip_id=m.trip_id AND m.active=1 AND p.host_id!=m.id)
 THEN RAISE(ABORT,'invalid_member') END;
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM plans WHERE id=NEW.plan_id AND status='open' AND revision=NEW.accepted_revision)
 THEN RAISE(ABORT,'stale_plan') END;
 SELECT CASE WHEN NEW.choice='all' AND (SELECT json_extract(body,'$.joinStyle') FROM plans WHERE id=NEW.plan_id)='reunion'
 THEN RAISE(ABORT,'choose_reunion') END;
 SELECT CASE WHEN NEW.choice!='all' AND NOT EXISTS (
 SELECT 1 FROM plans p,json_each(p.body,'$.segments') s WHERE p.id=NEW.plan_id AND json_extract(s.value,'$.id')=NEW.choice)
 THEN RAISE(ABORT,'missing_part') END;
 SELECT CASE WHEN NEW.status='joined' AND
 (SELECT json_extract(body,'$.capacity') FROM plans WHERE id=NEW.plan_id) IS NOT NULL AND
 1+(SELECT count(*) FROM rsvps r JOIN members m ON m.id=r.member_id WHERE r.plan_id=NEW.plan_id AND r.member_id!=NEW.member_id AND r.status='joined' AND m.active=1)
 >=(SELECT json_extract(body,'$.capacity') FROM plans WHERE id=NEW.plan_id)
 THEN RAISE(ABORT,'plan_full') END;
 SELECT CASE WHEN NEW.status='joined' AND NEW.acknowledge_conflict=0 AND EXISTS (
 SELECT 1 FROM commitments c,plans p WHERE p.id=NEW.plan_id AND c.member_id=NEW.member_id AND c.plan_id!=NEW.plan_id
 AND c.day=json_extract(p.body,'$.date')
 AND c.start < COALESCE((SELECT json_extract(s.value,'$.end') FROM json_each(p.body,'$.segments') s WHERE json_extract(s.value,'$.id')=NEW.choice),json_extract(p.body,'$.end'))
 AND c.end > COALESCE((SELECT json_extract(s.value,'$.start') FROM json_each(p.body,'$.segments') s WHERE json_extract(s.value,'$.id')=NEW.choice),json_extract(p.body,'$.start')))
 THEN RAISE(ABORT,'overlap') END;

END;

-- Enforcement happens inside SQLite, not in a racy read-then-write check.
CREATE TRIGGER rsvp_guard_update BEFORE UPDATE ON rsvps WHEN COALESCE((SELECT value FROM app_meta WHERE key='restoring'),'0')!='1' BEGIN

 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM plans p JOIN members m ON m.id=NEW.member_id
 WHERE p.id=NEW.plan_id AND p.trip_id=m.trip_id AND m.active=1 AND p.host_id!=m.id)
 THEN RAISE(ABORT,'invalid_member') END;
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM plans WHERE id=NEW.plan_id AND status='open' AND revision=NEW.accepted_revision)
 THEN RAISE(ABORT,'stale_plan') END;
 SELECT CASE WHEN NEW.choice='all' AND (SELECT json_extract(body,'$.joinStyle') FROM plans WHERE id=NEW.plan_id)='reunion'
 THEN RAISE(ABORT,'choose_reunion') END;
 SELECT CASE WHEN NEW.choice!='all' AND NOT EXISTS (
 SELECT 1 FROM plans p,json_each(p.body,'$.segments') s WHERE p.id=NEW.plan_id AND json_extract(s.value,'$.id')=NEW.choice)
 THEN RAISE(ABORT,'missing_part') END;
 SELECT CASE WHEN NEW.status='joined' AND
 (SELECT json_extract(body,'$.capacity') FROM plans WHERE id=NEW.plan_id) IS NOT NULL AND
 1+(SELECT count(*) FROM rsvps r JOIN members m ON m.id=r.member_id WHERE r.plan_id=NEW.plan_id AND r.member_id!=NEW.member_id AND r.status='joined' AND m.active=1)
 >=(SELECT json_extract(body,'$.capacity') FROM plans WHERE id=NEW.plan_id)
 THEN RAISE(ABORT,'plan_full') END;
 SELECT CASE WHEN NEW.status='joined' AND NEW.acknowledge_conflict=0 AND EXISTS (
 SELECT 1 FROM commitments c,plans p WHERE p.id=NEW.plan_id AND c.member_id=NEW.member_id AND c.plan_id!=NEW.plan_id
 AND c.day=json_extract(p.body,'$.date')
 AND c.start < COALESCE((SELECT json_extract(s.value,'$.end') FROM json_each(p.body,'$.segments') s WHERE json_extract(s.value,'$.id')=NEW.choice),json_extract(p.body,'$.end'))
 AND c.end > COALESCE((SELECT json_extract(s.value,'$.start') FROM json_each(p.body,'$.segments') s WHERE json_extract(s.value,'$.id')=NEW.choice),json_extract(p.body,'$.start')))
 THEN RAISE(ABORT,'overlap') END;

END;

-- Prevent attaching a photo concurrently claimed by abandoned-upload cleanup.
CREATE TRIGGER memory_photos_insert BEFORE INSERT ON moments
WHEN COALESCE((SELECT value FROM app_meta WHERE key='restoring'),'0')!='1' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.body,'$.photos') j
 WHERE NOT EXISTS(SELECT 1 FROM photos p WHERE p.id=j.value AND p.status='ready'
 AND p.trip_id=NEW.trip_id AND p.member_id=NEW.member_id)) THEN RAISE(ABORT,'photo_unavailable') END;
END;
CREATE TRIGGER memory_photos_update BEFORE UPDATE OF body ON moments
WHEN COALESCE((SELECT value FROM app_meta WHERE key='restoring'),'0')!='1' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.body,'$.photos') j
 WHERE NOT EXISTS(SELECT 1 FROM photos p WHERE p.id=j.value AND p.status='ready'
 AND p.trip_id=NEW.trip_id AND p.member_id=NEW.member_id)) THEN RAISE(ABORT,'photo_unavailable') END;
END;
