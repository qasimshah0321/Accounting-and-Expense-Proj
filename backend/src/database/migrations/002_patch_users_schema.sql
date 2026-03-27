-- Patch users table: add missing columns required by auth service
-- MySQL does not support ADD COLUMN IF NOT EXISTS, so we use procedures

-- Backfill username from email for any existing rows
UPDATE users SET username = SUBSTRING_INDEX(email, '@', 1) WHERE username IS NULL;
