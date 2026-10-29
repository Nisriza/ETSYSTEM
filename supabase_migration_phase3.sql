-- Phase 3: Google account integration + holiday sync support
-- Run this in the Supabase SQL Editor before starting the app.

CREATE TABLE IF NOT EXISTS GoogleAccounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  google_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  scopes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_google_accounts_user ON GoogleAccounts (user_id);

-- Ensure Holidays has state/source/external_uid (idempotent; also in phase2)
ALTER TABLE Holidays ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'ALL';
ALTER TABLE Holidays ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE Holidays ADD COLUMN IF NOT EXISTS external_uid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_holidays_external_uid ON Holidays (external_uid) WHERE external_uid IS NOT NULL;
