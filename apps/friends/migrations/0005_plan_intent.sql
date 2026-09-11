-- A reply is a decision, not an inference from a comment. Existing receipts remain unknown.
DROP VIEW commitments;
DROP TRIGGER rsvp_guard_insert;
DROP TRIGGER rsvp_guard_update;
DROP TRIGGER plans_capacity;
CREATE TABLE rsvps_next (
 plan_id TEXT NOT NULL REFERENCES plans(id), member_id TEXT NOT NULL REFERENCES members(id),
 choice TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('joined','interested','waitlist','declined')),
 accepted_revision INTEGER NOT NULL, acknowledge_conflict INTEGER NOT NULL DEFAULT 0,
 updated TEXT NOT NULL, accepted_body TEXT CHECK(accepted_body IS NULL OR json_valid(accepted_body)),
 PRIMARY KEY(plan_id,member_id)
);
INSERT INTO rsvps_next(plan_id,member_id,choice,status,accepted_revision,acknowledge_conflict,updated)
 SELECT plan_id,member_id,choice,status,accepted_revision,acknowledge_conflict,updated FROM rsvps;
DROP TABLE rsvps;
ALTER TABLE rsvps_next RENAME TO rsvps;
CREATE INDEX rsvps_member ON rsvps(member_id);
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


CREATE TRIGGER plans_capacity BEFORE UPDATE OF body ON plans BEGIN
 SELECT RAISE(ABORT,'capacity_below_members') WHERE json_extract(NEW.body,'$.capacity') IS NOT NULL AND
 json_extract(NEW.body,'$.capacity') < 1+(SELECT count(*) FROM rsvps r JOIN members m ON m.id=r.member_id WHERE r.plan_id=NEW.id AND r.status='joined' AND m.active=1);
 SELECT RAISE(ABORT,'solo_with_replies') WHERE json_extract(NEW.body,'$.joinStyle')='solo' AND EXISTS
 (SELECT 1 FROM rsvps r JOIN members m ON m.id=r.member_id WHERE r.plan_id=NEW.id AND r.status IN ('joined','interested','waitlist') AND m.active=1);
END;
-- Enforcement happens inside SQLite, not in a racy read-then-write check.
CREATE TRIGGER rsvp_guard_insert BEFORE INSERT ON rsvps WHEN COALESCE((SELECT value FROM app_meta WHERE key='restoring'),'0')!='1' BEGIN

 SELECT RAISE(ABORT,'invalid_member') WHERE NOT EXISTS (SELECT 1 FROM plans p JOIN members m ON m.id=NEW.member_id
 WHERE p.id=NEW.plan_id AND p.trip_id=m.trip_id AND m.active=1 AND p.host_id!=m.id);
 SELECT RAISE(ABORT,'stale_plan') WHERE NOT EXISTS (SELECT 1 FROM plans WHERE id=NEW.plan_id AND status='open' AND revision=NEW.accepted_revision);
 SELECT RAISE(ABORT,'solo_plan') WHERE (SELECT json_extract(body,'$.joinStyle') FROM plans WHERE id=NEW.plan_id)='solo';
 SELECT RAISE(ABORT,'choose_reunion') WHERE NEW.status!='declined' AND NEW.choice='all' AND (SELECT json_extract(body,'$.joinStyle') FROM plans WHERE id=NEW.plan_id)='reunion';
 SELECT RAISE(ABORT,'missing_part') WHERE NEW.status!='declined' AND NEW.choice!='all' AND NOT EXISTS (
 SELECT 1 FROM plans p,json_each(p.body,'$.segments') s WHERE p.id=NEW.plan_id AND json_extract(s.value,'$.id')=NEW.choice);
 SELECT RAISE(ABORT,'plan_full') WHERE NEW.status='joined' AND
 (SELECT json_extract(body,'$.capacity') FROM plans WHERE id=NEW.plan_id) IS NOT NULL AND
 1+(SELECT count(*) FROM rsvps r JOIN members m ON m.id=r.member_id WHERE r.plan_id=NEW.plan_id AND r.member_id!=NEW.member_id AND r.status='joined' AND m.active=1)
 >=(SELECT json_extract(body,'$.capacity') FROM plans WHERE id=NEW.plan_id);
 SELECT RAISE(ABORT,'overlap') WHERE NEW.status='joined' AND NEW.acknowledge_conflict=0 AND EXISTS (
 SELECT 1 FROM commitments c,plans p WHERE p.id=NEW.plan_id AND c.member_id=NEW.member_id AND c.plan_id!=NEW.plan_id
 AND c.day=json_extract(p.body,'$.date')
 AND c.start < COALESCE((SELECT json_extract(s.value,'$.end') FROM json_each(p.body,'$.segments') s WHERE json_extract(s.value,'$.id')=NEW.choice),json_extract(p.body,'$.end'))
 AND c.end > COALESCE((SELECT json_extract(s.value,'$.start') FROM json_each(p.body,'$.segments') s WHERE json_extract(s.value,'$.id')=NEW.choice),json_extract(p.body,'$.start')));

END;

-- Enforcement happens inside SQLite, not in a racy read-then-write check.
CREATE TRIGGER rsvp_guard_update BEFORE UPDATE ON rsvps WHEN COALESCE((SELECT value FROM app_meta WHERE key='restoring'),'0')!='1' BEGIN

 SELECT RAISE(ABORT,'invalid_member') WHERE NOT EXISTS (SELECT 1 FROM plans p JOIN members m ON m.id=NEW.member_id
 WHERE p.id=NEW.plan_id AND p.trip_id=m.trip_id AND m.active=1 AND p.host_id!=m.id);
 SELECT RAISE(ABORT,'stale_plan') WHERE NOT EXISTS (SELECT 1 FROM plans WHERE id=NEW.plan_id AND status='open' AND revision=NEW.accepted_revision);
 SELECT RAISE(ABORT,'solo_plan') WHERE (SELECT json_extract(body,'$.joinStyle') FROM plans WHERE id=NEW.plan_id)='solo';
 SELECT RAISE(ABORT,'choose_reunion') WHERE NEW.status!='declined' AND NEW.choice='all' AND (SELECT json_extract(body,'$.joinStyle') FROM plans WHERE id=NEW.plan_id)='reunion';
 SELECT RAISE(ABORT,'missing_part') WHERE NEW.status!='declined' AND NEW.choice!='all' AND NOT EXISTS (
 SELECT 1 FROM plans p,json_each(p.body,'$.segments') s WHERE p.id=NEW.plan_id AND json_extract(s.value,'$.id')=NEW.choice);
 SELECT RAISE(ABORT,'plan_full') WHERE NEW.status='joined' AND
 (SELECT json_extract(body,'$.capacity') FROM plans WHERE id=NEW.plan_id) IS NOT NULL AND
 1+(SELECT count(*) FROM rsvps r JOIN members m ON m.id=r.member_id WHERE r.plan_id=NEW.plan_id AND r.member_id!=NEW.member_id AND r.status='joined' AND m.active=1)
 >=(SELECT json_extract(body,'$.capacity') FROM plans WHERE id=NEW.plan_id);
 SELECT RAISE(ABORT,'overlap') WHERE NEW.status='joined' AND NEW.acknowledge_conflict=0 AND EXISTS (
 SELECT 1 FROM commitments c,plans p WHERE p.id=NEW.plan_id AND c.member_id=NEW.member_id AND c.plan_id!=NEW.plan_id
 AND c.day=json_extract(p.body,'$.date')
 AND c.start < COALESCE((SELECT json_extract(s.value,'$.end') FROM json_each(p.body,'$.segments') s WHERE json_extract(s.value,'$.id')=NEW.choice),json_extract(p.body,'$.end'))
 AND c.end > COALESCE((SELECT json_extract(s.value,'$.start') FROM json_each(p.body,'$.segments') s WHERE json_extract(s.value,'$.id')=NEW.choice),json_extract(p.body,'$.start')));

END;

CREATE TRIGGER rsvp_receipt_insert AFTER INSERT ON rsvps
 WHEN NEW.status='joined' AND COALESCE((SELECT value FROM app_meta WHERE key='restoring'),'0')!='1' AND
 (NEW.accepted_body IS NULL OR NEW.accepted_body != (SELECT body FROM plans WHERE id=NEW.plan_id))
 BEGIN
 UPDATE rsvps SET accepted_body=(SELECT body FROM plans WHERE id=NEW.plan_id)
 WHERE plan_id=NEW.plan_id AND member_id=NEW.member_id;
 END;
CREATE TRIGGER rsvp_receipt_update AFTER UPDATE ON rsvps
 WHEN NEW.status='joined' AND COALESCE((SELECT value FROM app_meta WHERE key='restoring'),'0')!='1' AND
 (NEW.accepted_body IS NULL OR NEW.accepted_body != (SELECT body FROM plans WHERE id=NEW.plan_id))
 BEGIN
 UPDATE rsvps SET accepted_body=(SELECT body FROM plans WHERE id=NEW.plan_id)
 WHERE plan_id=NEW.plan_id AND member_id=NEW.member_id;
 END;
UPDATE app_meta SET value='7' WHERE key='schema';
