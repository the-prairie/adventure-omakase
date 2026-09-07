-- Preserve existing private helper drafts while adding booking extraction.
-- No table references travel_tasks; D1 applies this migration atomically.
CREATE TABLE travel_tasks_with_bookings (
 id TEXT NOT NULL, member_id TEXT NOT NULL REFERENCES members(id), trip_id TEXT NOT NULL REFERENCES trips(id),
 kind TEXT NOT NULL CHECK(kind IN ('translate','memory','places','route','search','profile-import')),
 status TEXT NOT NULL CHECK(status IN ('running','complete','failed','cancelled')),
 result TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(result)), created TEXT NOT NULL, updated TEXT NOT NULL,
 PRIMARY KEY(member_id,id)
);
INSERT INTO travel_tasks_with_bookings SELECT id,member_id,trip_id,kind,status,result,created,updated FROM travel_tasks;
DROP TABLE travel_tasks;
ALTER TABLE travel_tasks_with_bookings RENAME TO travel_tasks;
