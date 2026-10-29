-- Phase 2: historical dataset audit, search history, model versioning
-- Run this in the Supabase SQL Editor before starting the app.

-- Dataset upload audit / versioning
CREATE TABLE IF NOT EXISTS DatasetVersions (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_file_name TEXT,
  uploaded_by INTEGER REFERENCES Users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  row_count INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  rejected_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'validated'
    CHECK (status IN ('pending','validating','validated','imported','failed')),
  source_period_start TEXT,
  source_period_end TEXT,
  checksum TEXT,
  error_summary TEXT,
  notes TEXT
);

-- Staging table for validated raw rows (audit/reprocessing). Optional import into Ridership.
CREATE TABLE IF NOT EXISTS DatasetStagingRows (
  id SERIAL PRIMARY KEY,
  dataset_version_id INTEGER NOT NULL REFERENCES DatasetVersions(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  ridership_count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_staging_version ON DatasetStagingRows (dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_staging_route_time ON DatasetStagingRows (origin, destination, date, time);

-- User route search history (separate from verified training data)
CREATE TABLE IF NOT EXISTS RouteSearches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES Users(id) ON DELETE SET NULL,
  session_id TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_date TEXT,
  travel_time TEXT,
  predicted_ridership INTEGER,
  demand_level TEXT
    CHECK (demand_level IN ('Low','Medium','High','Very High')),
  route_available BOOLEAN,
  search_source TEXT DEFAULT 'web',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_route_searches_user ON RouteSearches (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_route_searches_route ON RouteSearches (origin, destination, created_at);

-- Verified outcomes (actual observed ridership/travel time) for future model evaluation
CREATE TABLE IF NOT EXISTS RouteOutcomes (
  id SERIAL PRIMARY KEY,
  route_search_id INTEGER REFERENCES RouteSearches(id) ON DELETE SET NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_date TEXT NOT NULL,
  travel_time TEXT NOT NULL,
  actual_ridership INTEGER,
  observed_travel_minutes INTEGER,
  verified_by INTEGER REFERENCES Users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source TEXT DEFAULT 'operator'
);
CREATE INDEX IF NOT EXISTS idx_route_outcomes_route ON RouteOutcomes (origin, destination, travel_date);

-- Model versioning metadata
CREATE TABLE IF NOT EXISTS ModelVersions (
  id SERIAL PRIMARY KEY,
  version_label TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'random_forest',
  trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dataset_version_ids TEXT,
  total_records INTEGER NOT NULL DEFAULT 0,
  feature_count INTEGER NOT NULL DEFAULT 0,
  mae DOUBLE PRECISION,
  rmse DOUBLE PRECISION,
  r2 DOUBLE PRECISION,
  processing_time DOUBLE PRECISION,
  model_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_model_versions_active ON ModelVersions (is_active);

-- Optional: state-specific holidays (extend Holidays table)
ALTER TABLE Holidays ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'ALL';
ALTER TABLE Holidays ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE Holidays ADD COLUMN IF NOT EXISTS external_uid TEXT;
