ALTER TABLE admins ADD COLUMN username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS admins_username_unique
  ON admins (username)
  WHERE username IS NOT NULL;
