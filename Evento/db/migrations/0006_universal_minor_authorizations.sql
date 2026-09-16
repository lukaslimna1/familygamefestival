-- A autorização pertence ao participante e pode cobrir várias inscrições.
-- A linha antiga era uma autorização por registration_id; preservamos os dados
-- existentes e passamos a versioná-los por participante.
ALTER TABLE minor_authorizations ADD COLUMN participant_id TEXT;

ALTER TABLE minor_authorizations ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE minor_authorizations ADD COLUMN competition_ids TEXT NOT NULL DEFAULT '[]';

ALTER TABLE minor_authorizations ADD COLUMN signed_drive_file_id TEXT;

ALTER TABLE minor_authorizations ADD COLUMN delivery_type TEXT;

UPDATE minor_authorizations
SET participant_id = (
  SELECT participant_id FROM registrations
  WHERE registrations.id = minor_authorizations.registration_id
),
competition_ids = (
  SELECT '["' || competition_id || '"]' FROM registrations
  WHERE registrations.id = minor_authorizations.registration_id
)
WHERE participant_id IS NULL;

DROP INDEX IF EXISTS minor_authorizations_registration_unique;
DROP INDEX IF EXISTS minor_authorizations_registration_idx;

CREATE INDEX IF NOT EXISTS minor_authorizations_participant_idx
  ON minor_authorizations (participant_id, version);

CREATE UNIQUE INDEX IF NOT EXISTS minor_authorizations_participant_version_unique
  ON minor_authorizations (participant_id, version);

ALTER TABLE cosplay_entries ADD COLUMN technical_notes TEXT;

ALTER TABLE cosplay_entries ADD COLUMN judge_notes TEXT;

ALTER TABLE registration_files ADD COLUMN authorization_version INTEGER;
