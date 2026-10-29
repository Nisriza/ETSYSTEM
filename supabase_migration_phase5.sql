-- Phase 5: Supabase Google sign-in (auth bridge)
-- Run this in the Supabase SQL Editor before testing "Sign in with Google".
--
-- The app keeps its own bearer-token sessions, so Supabase Auth is only used as
-- the identity provider. These columns let POST /api/auth/supabase link a
-- Supabase (Google) identity to an existing Users row instead of duplicating
-- accounts.

-- Email allows Google accounts to be matched against password accounts.
ALTER TABLE Users ADD COLUMN IF NOT EXISTS email TEXT;

-- Supabase auth.users.id for this person (stable even if their email changes).
ALTER TABLE Users ADD COLUMN IF NOT EXISTS supabase_uid UUID;

-- 'password' (default) or 'google'. Informational only.
ALTER TABLE Users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'password';

-- Profile picture URL from Google (user_metadata.avatar_url).
ALTER TABLE Users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- One account per Supabase identity.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_supabase_uid
  ON Users (supabase_uid) WHERE supabase_uid IS NOT NULL;

-- One account per email address, case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
  ON Users (LOWER(email)) WHERE email IS NOT NULL;

-- Quick lookup during the auth bridge.
CREATE INDEX IF NOT EXISTS idx_users_email ON Users (LOWER(email));
