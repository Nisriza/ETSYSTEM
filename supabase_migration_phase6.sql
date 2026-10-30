-- Phase 6: first-login tutorial tracking + language consistency
-- Run this in the Supabase SQL Editor before starting the app.

-- Count successful logins so the tutorial is only suggested on the first one.
ALTER TABLE Users ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;

-- Existing accounts have already used the app: their next login should be #2,
-- so they never get the tutorial auto-opened again. New registrations start at
-- 0, and their first login becomes 1.
UPDATE Users SET login_count = 1 WHERE login_count = 0;

-- The client writes 'bm'; the original schema only allowed 'en'/'ms'.
ALTER TABLE Users DROP CONSTRAINT IF EXISTS users_language_check;
UPDATE Users SET language = 'bm' WHERE language = 'ms';
ALTER TABLE Users
  ADD CONSTRAINT users_language_check CHECK (language IN ('en', 'bm'));
