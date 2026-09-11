-- Private helper results and explicit, cancellable website watches.
CREATE TABLE service_budget (id TEXT PRIMARY KEY, used INTEGER NOT NULL DEFAULT 0 CHECK(used>=0), reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved>=0));
CREATE TABLE travel_tasks (
 id TEXT NOT NULL, member_id TEXT NOT NULL REFERENCES members(id), trip_id TEXT NOT NULL REFERENCES trips(id),
 kind TEXT NOT NULL CHECK(kind IN ('translate','memory','places','route','search')),
 status TEXT NOT NULL CHECK(status IN ('running','complete','failed','cancelled')),
 result TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(result)), created TEXT NOT NULL, updated TEXT NOT NULL,
 PRIMARY KEY(member_id,id)
);
CREATE TABLE watches (
 id TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES members(id), trip_id TEXT NOT NULL REFERENCES trips(id),
 url TEXT NOT NULL, title TEXT NOT NULL, phrase TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL CHECK(status IN ('active','cancelled','expired','failed')),
 expires TEXT NOT NULL, next_check TEXT NOT NULL, last_checked TEXT, digest TEXT NOT NULL DEFAULT '',
 excerpt TEXT NOT NULL DEFAULT '', failures INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL,
 lease TEXT, lease_until TEXT,
 UNIQUE(member_id,url,phrase)
);
CREATE INDEX watches_due ON watches(status,next_check);
CREATE TABLE watch_events (
 id TEXT PRIMARY KEY, watch_id TEXT NOT NULL REFERENCES watches(id), member_id TEXT NOT NULL REFERENCES members(id),
 summary TEXT NOT NULL, before_text TEXT NOT NULL, after_text TEXT NOT NULL, created TEXT NOT NULL, seen INTEGER NOT NULL DEFAULT 0 CHECK(seen IN(0,1))
);

-- Idempotent companion edits use the same plan update action as the ordinary form.
ALTER TABLE plans ADD COLUMN last_edit_request TEXT;
