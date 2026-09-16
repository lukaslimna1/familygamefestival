ALTER TABLE competitions ADD COLUMN drive_folder_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS competitions_drive_folder_unique
  ON competitions (drive_folder_id)
  WHERE drive_folder_id IS NOT NULL;

ALTER TABLE registrations ADD COLUMN public_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS registrations_public_code_unique
  ON registrations (public_code)
  WHERE public_code IS NOT NULL;

ALTER TABLE registrations ADD COLUMN drive_folder_id TEXT;
