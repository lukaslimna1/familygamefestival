CREATE TABLE IF NOT EXISTS kpop_entries (
  id TEXT PRIMARY KEY NOT NULL,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  stage_name TEXT,
  original_artist TEXT NOT NULL,
  song_title TEXT NOT NULL,
  song_version TEXT,
  edited_cut TEXT NOT NULL,
  reference_url TEXT NOT NULL,
  audio_notes TEXT,
  judge_notes TEXT,
  pendrive_acknowledged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS kpop_entries_registration_unique
  ON kpop_entries (registration_id);
