ALTER TABLE registrations ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS registrations_review_status_idx
  ON registrations (review_status, updated_at);
