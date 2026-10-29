-- Phase 4: AI assistant support data
-- Run this in the Supabase SQL Editor before starting the app.

-- Destinations (points of interest) mapped to nearest stations.
-- Empty by default; populate with verified data (name, category, nearest station).
CREATE TABLE IF NOT EXISTS Destinations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  nearest_station_id INTEGER REFERENCES Stations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_destinations_station ON Destinations (nearest_station_id);
CREATE INDEX IF NOT EXISTS idx_destinations_name ON Destinations (name);
