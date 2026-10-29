-- Phase 1: tutorial completion tracking
-- Run this in the Supabase SQL Editor before starting the app.

ALTER TABLE Users ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMP;

-- Keep is_holiday / Ridership unaffected.
