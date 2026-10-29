-- ==========================================================
-- ETS Rider Predict System - Complete Supabase Schema & Seed Data
-- Run this entire script in Supabase SQL Editor
-- ==========================================================

-- ==========================================================
-- 1. exec_sql RPC Function (required by the application code)
-- ==========================================================
CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE 'WITH _r AS (' || query || ') SELECT row_to_json(_r.*)::jsonb FROM _r';
EXCEPTION
  WHEN feature_not_supported THEN
    EXECUTE query;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'exec_sql error: %', SQLERRM;
END;
$$;

-- ==========================================================
-- 2. TABLES CREATION
-- ==========================================================

-- Users Table
CREATE TABLE IF NOT EXISTS Users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'passenger'
    CHECK (role IN ('passenger', 'operator', 'admin')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'pending', 'approved', 'rejected')),
  language TEXT DEFAULT 'en'
    CHECK (language IN ('en', 'ms')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stations Table
CREATE TABLE IF NOT EXISTS Stations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'Other'
);

-- Routes Table (for route availability checks)
CREATE TABLE IF NOT EXISTS Routes (
  id SERIAL PRIMARY KEY,
  origin_station_id INTEGER NOT NULL,
  destination_station_id INTEGER NOT NULL,
  FOREIGN KEY (origin_station_id) REFERENCES Stations(id) ON DELETE CASCADE,
  FOREIGN KEY (destination_station_id) REFERENCES Stations(id) ON DELETE CASCADE,
  UNIQUE(origin_station_id, destination_station_id)
);

-- RouteConnections Table (admin-managed connections)
CREATE TABLE IF NOT EXISTS RouteConnections (
  id SERIAL PRIMARY KEY,
  origin_station_id INTEGER NOT NULL,
  destination_station_id INTEGER NOT NULL,
  FOREIGN KEY (origin_station_id) REFERENCES Stations(id) ON DELETE CASCADE,
  FOREIGN KEY (destination_station_id) REFERENCES Stations(id) ON DELETE CASCADE,
  UNIQUE(origin_station_id, destination_station_id)
);

-- Ridership Table (historical dataset)
CREATE TABLE IF NOT EXISTS Ridership (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  ridership_count INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ridership_origin_dest ON Ridership (origin, destination);
CREATE INDEX IF NOT EXISTS idx_ridership_date_time ON Ridership (date, time);

-- Predictions Table
CREATE TABLE IF NOT EXISTS Predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_date TEXT NOT NULL,
  travel_time TEXT NOT NULL,
  predicted_ridership INTEGER NOT NULL,
  demand_level TEXT NOT NULL
    CHECK (demand_level IN ('Low', 'Medium', 'High', 'Very High')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- SavedTrips Table
CREATE TABLE IF NOT EXISTS SavedTrips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_date TEXT NOT NULL,
  travel_time TEXT NOT NULL,
  predicted_ridership INTEGER,
  demand_level TEXT
    CHECK (demand_level IN ('Low', 'Medium', 'High', 'Very High')),
  note TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS Feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_date TEXT NOT NULL,
  crowd_level TEXT NOT NULL
    CHECK (crowd_level IN ('Low', 'Medium', 'High', 'Very High')),
  comfort_rating INTEGER NOT NULL
    CHECK (comfort_rating BETWEEN 1 AND 5),
  delay_reported BOOLEAN DEFAULT FALSE,
  delay_minutes INTEGER DEFAULT 0,
  comment TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Holidays Table (static Malaysian holidays)
CREATE TABLE IF NOT EXISTS Holidays (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  country TEXT DEFAULT 'Malaysia',
  UNIQUE(name, date)
);

-- Reports Table
CREATE TABLE IF NOT EXISTS Reports (
  id SERIAL PRIMARY KEY,
  operator_id INTEGER NOT NULL,
  month INTEGER NOT NULL
    CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  report_data TEXT,
  FOREIGN KEY (operator_id) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE(operator_id, month, year)
);

-- HistoricalData Table (aggregated predictions for retraining)
CREATE TABLE IF NOT EXISTS HistoricalData (
  id SERIAL PRIMARY KEY,
  origin_station TEXT NOT NULL,
  destination_station TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL
    CHECK (month BETWEEN 1 AND 12),
  demand_count INTEGER NOT NULL DEFAULT 0,
  demand_level TEXT NOT NULL DEFAULT 'Low'
    CHECK (demand_level IN ('Low', 'Medium', 'High', 'Very High')),
  UNIQUE(origin_station, destination_station, year, month)
);

-- ==========================================================
-- 3. SEED DATA
-- ==========================================================

-- Seed Stations (ETS route stations with states)
INSERT INTO Stations (name, state) VALUES
  ('Padang Besar', 'Perlis'),
  ('Arau', 'Perlis'),
  ('Anak Bukit', 'Kedah'),
  ('Alor Setar', 'Kedah'),
  ('Sungai Petani', 'Kedah'),
  ('Butterworth', 'Penang'),
  ('Bukit Mertajam', 'Penang'),
  ('Nibong Tebal', 'Penang'),
  ('Parit Buntar', 'Perak'),
  ('Bagan Serai', 'Perak'),
  ('Kamunting', 'Perak'),
  ('Taiping', 'Perak'),
  ('Kuala Kangsar', 'Perak'),
  ('Ipoh', 'Perak'),
  ('Batu Gajah', 'Perak'),
  ('Kampar', 'Perak'),
  ('Tapah Road', 'Perak'),
  ('Sungkai', 'Perak'),
  ('Slim River', 'Perak'),
  ('Tanjung Malim', 'Perak'),
  ('Kuala Kubu Bharu', 'Selangor'),
  ('Rawang', 'Selangor'),
  ('Kajang', 'Selangor'),
  ('Kepong Sentral', 'Kuala Lumpur'),
  ('Kuala Lumpur', 'Kuala Lumpur'),
  ('KL Sentral', 'Kuala Lumpur'),
  ('Bandar Tasik Selatan', 'Kuala Lumpur'),
  ('Nilai', 'Negeri Sembilan'),
  ('Seremban', 'Negeri Sembilan'),
  ('Tampin', 'Negeri Sembilan'),
  ('Gemas', 'Negeri Sembilan'),
  ('Batang Melaka', 'Melaka'),
  ('Segamat', 'Johor'),
  ('Kluang', 'Johor'),
  ('Kempas Baru', 'Johor'),
  ('JB Sentral', 'Johor')
ON CONFLICT (name) DO NOTHING;

-- Seed Routes (adjacent station connections + popular direct routes)
-- Adjacent station pairs (bidirectional)
WITH station_ids AS (
  SELECT id, name FROM Stations
)
INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT o.id, d.id FROM
  (SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn FROM Stations) o
  JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn FROM Stations) d
    ON d.rn = o.rn + 1
WHERE o.id < 36
ON CONFLICT DO NOTHING;

WITH station_ids AS (
  SELECT id, name FROM Stations
)
INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT d.id, o.id FROM
  (SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn FROM Stations) o
  JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn FROM Stations) d
    ON d.rn = o.rn + 1
WHERE o.id < 36
ON CONFLICT DO NOTHING;

-- Popular direct routes (Butterworth ↔ KL Sentral)
INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT o.id, d.id FROM Stations o, Stations d
WHERE o.name = 'Butterworth' AND d.name = 'KL Sentral'
ON CONFLICT DO NOTHING;

INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT o.id, d.id FROM Stations o, Stations d
WHERE o.name = 'KL Sentral' AND d.name = 'Butterworth'
ON CONFLICT DO NOTHING;

-- Padang Besar ↔ KL Sentral
INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT o.id, d.id FROM Stations o, Stations d
WHERE o.name = 'Padang Besar' AND d.name = 'KL Sentral'
ON CONFLICT DO NOTHING;

INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT o.id, d.id FROM Stations o, Stations d
WHERE o.name = 'KL Sentral' AND d.name = 'Padang Besar'
ON CONFLICT DO NOTHING;

-- Ipoh ↔ KL Sentral
INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT o.id, d.id FROM Stations o, Stations d
WHERE o.name = 'Ipoh' AND d.name = 'KL Sentral'
ON CONFLICT DO NOTHING;

INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT o.id, d.id FROM Stations o, Stations d
WHERE o.name = 'KL Sentral' AND d.name = 'Ipoh'
ON CONFLICT DO NOTHING;

-- Seed Holidays (Malaysia 2026)
INSERT INTO Holidays (name, date, country) VALUES
  ('New Year''s Day', '2026-01-01', 'Malaysia'),
  ('Chinese New Year', '2026-02-17', 'Malaysia'),
  ('Chinese New Year (Day 2)', '2026-02-18', 'Malaysia'),
  ('Nuzul Al-Quran', '2026-03-06', 'Malaysia'),
  ('Hari Raya Aidilfitri', '2026-03-20', 'Malaysia'),
  ('Hari Raya Aidilfitri (Day 2)', '2026-03-21', 'Malaysia'),
  ('Labour Day', '2026-05-01', 'Malaysia'),
  ('Wesak Day', '2026-05-31', 'Malaysia'),
  ('Agong''s Birthday', '2020-06-01', 'Malaysia'),
  ('Hari Raya Aidiladha', '2026-05-27', 'Malaysia'),
  ('Awal Muharram', '2026-06-16', 'Malaysia'),
  ('Maulidur Rasul', '2026-08-25', 'Malaysia'),
  ('Hari Merdeka (National Day)', '2026-08-31', 'Malaysia'),
  ('Malaysia Day', '2026-09-16', 'Malaysia'),
  ('Deepavali', '2026-11-08', 'Malaysia'),
  ('Christmas Day', '2026-12-25', 'Malaysia')
ON CONFLICT (name, date) DO NOTHING;

-- ==========================================================
-- 4. SEED INITIAL USERS (commented out - register users via the app)
-- Password: Admin@12345!, Operator@12345!, Passenger@12345!
-- To enable, uncomment the INSERT below.
-- ==========================================================
-- INSERT INTO Users (full_name, username, password_hash, role, status, language) VALUES
--   ('System Admin', 'admin', '$2b$10$0T.gnMnlvPZPqOnNlgCrAeyT1/4qrQ8YP478YEsl4eyHfp8CXkbAq', 'admin', 'active', 'en'),
--   ('ETS Station Controller', 'operator', '$2b$10$QK9bNzsMH21GyzZ4Uaoki.aITbDnvhMr10z/L6gcfdTGfLbmKewti', 'operator', 'pending', 'en'),
--   ('John Doe Passenger', 'passenger', '$2b$10$lb2j8BpVV4ttVbPPOvDNd.Wd01BE.3JLEa9DRLYVaTlNRndtCmQAa', 'passenger', 'active', 'en')
-- ON CONFLICT (username) DO NOTHING;

-- ==========================================================
-- 5. VERIFICATION QUERIES (run these individually to confirm setup)
-- ==========================================================
-- SELECT 'Users' as table_name, COUNT(*) as count FROM Users
-- UNION ALL SELECT 'Stations', COUNT(*) FROM Stations
-- UNION ALL SELECT 'Routes', COUNT(*) FROM Routes
-- UNION ALL SELECT 'Holidays', COUNT(*) FROM Holidays
-- UNION ALL SELECT 'Ridership', COUNT(*) FROM Ridership
-- ORDER BY table_name;
