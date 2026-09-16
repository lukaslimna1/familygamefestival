ALTER TABLE participants ADD COLUMN city TEXT NOT NULL DEFAULT '';

ALTER TABLE participants ADD COLUMN state TEXT NOT NULL DEFAULT '';

ALTER TABLE participants ADD COLUMN instagram TEXT;

ALTER TABLE participants ADD COLUMN tiktok TEXT;

ALTER TABLE participants ADD COLUMN facebook TEXT;

ALTER TABLE participants ADD COLUMN other_socials TEXT;

ALTER TABLE cosplay_entries ADD COLUMN stage_call_name TEXT NOT NULL DEFAULT '';

ALTER TABLE cosplay_entries ADD COLUMN cosplay_description TEXT NOT NULL DEFAULT '';

ALTER TABLE cosplay_entries ADD COLUMN presentation_notes TEXT;

CREATE TABLE IF NOT EXISTS registration_links (
  id TEXT PRIMARY KEY NOT NULL,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS registration_links_registration_idx
  ON registration_links (registration_id, created_at);
