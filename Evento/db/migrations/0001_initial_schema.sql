CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY NOT NULL,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  event_day TEXT NOT NULL,
  event_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  registration_price_cents INTEGER,
  prize_cents INTEGER,
  prize_note TEXT,
  max_participants INTEGER,
  min_participants_for_prize INTEGER,
  reference_file_limit INTEGER,
  reference_max_bytes INTEGER,
  reference_mime_types TEXT,
  audio_max_bytes INTEGER,
  audio_mime_types TEXT,
  registration_mode TEXT NOT NULL DEFAULT 'online_and_onsite',
  is_free INTEGER NOT NULL DEFAULT 0 CHECK (is_free IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS competitions_event_day_idx
  ON competitions (event_day, event_date, start_time);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY NOT NULL,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'online',
  drive_sync_status TEXT NOT NULL DEFAULT 'drive_pending',
  drive_last_error TEXT,
  event_access_included INTEGER NOT NULL DEFAULT 0 CHECK (event_access_included IN (0, 1)),
  submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (participant_id, competition_id)
);

CREATE INDEX IF NOT EXISTS registrations_competition_idx
  ON registrations (competition_id, status, created_at);

CREATE INDEX IF NOT EXISTS registrations_drive_sync_idx
  ON registrations (drive_sync_status, updated_at);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY NOT NULL,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted INTEGER NOT NULL CHECK (granted IN (0, 1)),
  policy_version TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  UNIQUE (registration_id, consent_type, policy_version)
);

CREATE TABLE IF NOT EXISTS guardians (
  id TEXT PRIMARY KEY NOT NULL,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS guardians_participant_idx
  ON guardians (participant_id);

CREATE TABLE IF NOT EXISTS minor_authorizations (
  id TEXT PRIMARY KEY NOT NULL,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  guardian_id TEXT NOT NULL REFERENCES guardians(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending',
  drive_file_id TEXT,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uploaded_at TEXT,
  received_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS minor_authorizations_registration_idx
  ON minor_authorizations (registration_id);

CREATE TABLE IF NOT EXISTS cosplay_entries (
  id TEXT PRIMARY KEY NOT NULL,
  registration_id TEXT NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
  stage_name TEXT,
  character_name TEXT NOT NULL,
  source_work TEXT NOT NULL,
  presentation_type TEXT NOT NULL,
  presentation_description TEXT,
  music_title TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registration_files (
  id TEXT PRIMARY KEY NOT NULL,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_hash TEXT,
  drive_file_id TEXT,
  drive_path TEXT,
  sync_status TEXT NOT NULL DEFAULT 'drive_pending',
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS registration_files_sync_idx
  ON registration_files (sync_status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS registration_files_hash_idx
  ON registration_files (registration_id, file_type, content_hash);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS admin_sessions_active_idx
  ON admin_sessions (admin_id, expires_at, revoked_at);
