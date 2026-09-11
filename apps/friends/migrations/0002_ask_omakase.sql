-- Companion tasks hold private, expiring research results, never an itinerary.
CREATE TABLE ask_tasks (
  id TEXT NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id),
  trip_id TEXT NOT NULL REFERENCES trips(id),
  status TEXT NOT NULL CHECK(status IN ('running','complete','cancelled','failed','published')),
  stage TEXT NOT NULL,
  input TEXT NOT NULL CHECK(json_valid(input)),
  result TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(result)),
  usage TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(usage)),
  context_seq INTEGER NOT NULL,
  plan_id TEXT,
  budget_day TEXT NOT NULL,
  settled INTEGER NOT NULL DEFAULT 0 CHECK(settled IN (0,1)),
  created TEXT NOT NULL,
  updated TEXT NOT NULL,
  PRIMARY KEY(member_id,id)
);
CREATE INDEX ask_tasks_trip_created ON ask_tasks(trip_id,created);
CREATE TABLE ask_budget (
  trip_id TEXT NOT NULL REFERENCES trips(id),
  day TEXT NOT NULL,
  reserved REAL NOT NULL DEFAULT 0 CHECK(reserved>=0),
  used REAL NOT NULL DEFAULT 0 CHECK(used>=0),
  PRIMARY KEY(trip_id,day)
);
CREATE TABLE place_research (
  trip_id TEXT NOT NULL REFERENCES trips(id),
  discovery_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  evidence TEXT NOT NULL CHECK(json_valid(evidence)),
  checked_at TEXT NOT NULL,
  PRIMARY KEY(trip_id,discovery_id,source_url)
);
-- Keep editable trip bounds and canonical plan dates atomic under concurrent edits.
CREATE TRIGGER trip_window_guard BEFORE UPDATE OF start,end ON trips
WHEN NOT EXISTS(SELECT 1 FROM app_meta WHERE key='restoring') AND (
 EXISTS(SELECT 1 FROM plans WHERE trip_id=NEW.id AND json_extract(body,'$.date') NOT BETWEEN NEW.start AND NEW.end)
 OR EXISTS(SELECT 1 FROM moments WHERE trip_id=NEW.id AND json_extract(body,'$.date') NOT BETWEEN NEW.start AND NEW.end)
)
BEGIN SELECT RAISE(ABORT,'outside_trip_window'); END;
CREATE TRIGGER plan_window_insert BEFORE INSERT ON plans
WHEN NOT EXISTS(SELECT 1 FROM app_meta WHERE key='restoring') AND NOT EXISTS(SELECT 1 FROM trips WHERE id=NEW.trip_id AND json_extract(NEW.body,'$.date') BETWEEN start AND end)
BEGIN SELECT RAISE(ABORT,'outside_trip_window'); END;
CREATE TRIGGER plan_window_update BEFORE UPDATE OF body ON plans
WHEN NOT EXISTS(SELECT 1 FROM app_meta WHERE key='restoring') AND NOT EXISTS(SELECT 1 FROM trips WHERE id=NEW.trip_id AND json_extract(NEW.body,'$.date') BETWEEN start AND end)
BEGIN SELECT RAISE(ABORT,'outside_trip_window'); END;
CREATE TRIGGER moment_window_insert BEFORE INSERT ON moments
WHEN NOT EXISTS(SELECT 1 FROM app_meta WHERE key='restoring') AND NOT EXISTS(SELECT 1 FROM trips WHERE id=NEW.trip_id AND json_extract(NEW.body,'$.date') BETWEEN start AND end)
BEGIN SELECT RAISE(ABORT,'outside_trip_window'); END;
CREATE TRIGGER moment_window_update BEFORE UPDATE OF body ON moments
WHEN NOT EXISTS(SELECT 1 FROM app_meta WHERE key='restoring') AND NOT EXISTS(SELECT 1 FROM trips WHERE id=NEW.trip_id AND json_extract(NEW.body,'$.date') BETWEEN start AND end)
BEGIN SELECT RAISE(ABORT,'outside_trip_window'); END;
