-- ==========================================================
-- ETS Rider Predict System - Supabase Schema (fresh database)
-- Run this whole script once in the new Supabase project's SQL Editor.
--
-- This is the ONLY schema file needed for a clean install. It replaces the
-- old supabase_schema.sql + supabase_migration_phase1..6.sql sequence.
-- ==========================================================

-- ==========================================================
-- 1. exec_sql RPC (required by src/db/sqlite.ts)
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
-- 2. TABLES (8 core tables only)
-- ==========================================================

-- Accounts for all three roles. Google sign-in links to these rows through
-- supabase_uid / email, so no separate accounts table is needed.
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
    CHECK (language IN ('en', 'bm')),
  email TEXT,
  supabase_uid UUID,
  auth_provider TEXT DEFAULT 'password',
  avatar_url TEXT,
  login_count INTEGER NOT NULL DEFAULT 0,
  tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE,
  tutorial_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_supabase_uid
  ON Users (supabase_uid) WHERE supabase_uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
  ON Users (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON Users (LOWER(email));

-- Stations served by ETS.
CREATE TABLE IF NOT EXISTS Stations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'Other'
);

-- Routes connects stations. Used for availability checks and admin CRUD.
-- (The old duplicate RouteConnections table is intentionally gone.)
CREATE TABLE IF NOT EXISTS Routes (
  id SERIAL PRIMARY KEY,
  origin_station_id INTEGER NOT NULL REFERENCES Stations(id) ON DELETE CASCADE,
  destination_station_id INTEGER NOT NULL REFERENCES Stations(id) ON DELETE CASCADE,
  UNIQUE(origin_station_id, destination_station_id)
);

-- Imported historical ridership dataset used by analytics and retraining.
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

-- Passenger-saved itineraries.
CREATE TABLE IF NOT EXISTS SavedTrips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_date TEXT NOT NULL,
  travel_time TEXT NOT NULL,
  predicted_ridership INTEGER,
  demand_level TEXT CHECK (demand_level IN ('Low', 'Medium', 'High', 'Very High')),
  note TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_saved_trips_user ON SavedTrips (user_id, created_at);

-- Crowd feedback submitted by passengers/operators.
CREATE TABLE IF NOT EXISTS Feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_date TEXT NOT NULL,
  crowd_level TEXT NOT NULL CHECK (crowd_level IN ('Low', 'Medium', 'High', 'Very High')),
  comfort_rating INTEGER NOT NULL CHECK (comfort_rating BETWEEN 1 AND 5),
  delay_reported BOOLEAN DEFAULT FALSE,
  delay_minutes INTEGER DEFAULT 0,
  comment TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON Feedback (user_id, created_at);

-- Holidays stay in the database: the prediction engine reads them to set the
-- is_holiday feature, and the dashboard lists them. Google Calendar can be a
-- source (see external_uid) or a destination, but it cannot replace this table.
CREATE TABLE IF NOT EXISTS Holidays (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  country TEXT DEFAULT 'Malaysia',
  state TEXT DEFAULT 'ALL',
  source TEXT DEFAULT 'manual',
  external_uid TEXT,
  UNIQUE(name, date)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_holidays_external_uid
  ON Holidays (external_uid) WHERE external_uid IS NOT NULL;

-- Monthly reports generated by operators.
CREATE TABLE IF NOT EXISTS Reports (
  id SERIAL PRIMARY KEY,
  operator_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  report_data TEXT,
  UNIQUE(operator_id, month, year)
);

-- ==========================================================
-- 3. SEED DATA
-- ==========================================================

-- Stations
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

-- Adjacent station connections (both directions)
INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT o.id, d.id
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY id) rn FROM Stations) o
JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY id) rn FROM Stations) d
  ON d.rn = o.rn + 1
ON CONFLICT DO NOTHING;

INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT d.id, o.id
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY id) rn FROM Stations) o
JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY id) rn FROM Stations) d
  ON d.rn = o.rn + 1
ON CONFLICT DO NOTHING;

-- Popular direct routes (both directions)
INSERT INTO Routes (origin_station_id, destination_station_id)
SELECT o.id, d.id FROM Stations o, Stations d
WHERE (o.name, d.name) IN (
  ('Butterworth', 'KL Sentral'),
  ('KL Sentral', 'Butterworth'),
  ('Padang Besar', 'KL Sentral'),
  ('KL Sentral', 'Padang Besar'),
  ('Ipoh', 'KL Sentral'),
  ('KL Sentral', 'Ipoh')
)
ON CONFLICT DO NOTHING;

-- Malaysian public holidays 2026
INSERT INTO Holidays (name, date, country) VALUES
  ('New Year''s Day', '2026-01-01', 'Malaysia'),
  ('Chinese New Year', '2026-02-17', 'Malaysia'),
  ('Chinese New Year (Day 2)', '2026-02-18', 'Malaysia'),
  ('Nuzul Al-Quran', '2026-03-06', 'Malaysia'),
  ('Hari Raya Aidilfitri', '2026-03-20', 'Malaysia'),
  ('Hari Raya Aidilfitri (Day 2)', '2026-03-21', 'Malaysia'),
  ('Labour Day', '2026-05-01', 'Malaysia'),
  ('Wesak Day', '2026-05-31', 'Malaysia'),
  ('Agong''s Birthday', '2026-06-01', 'Malaysia'),
  ('Hari Raya Aidiladha', '2026-05-27', 'Malaysia'),
  ('Awal Muharram', '2026-06-16', 'Malaysia'),
  ('Maulidur Rasul', '2026-08-25', 'Malaysia'),
  ('Hari Merdeka (National Day)', '2026-08-31', 'Malaysia'),
  ('Malaysia Day', '2026-09-16', 'Malaysia'),
  ('Deepavali', '2026-11-08', 'Malaysia'),
  ('Christmas Day', '2026-12-25', 'Malaysia')
ON CONFLICT (name, date) DO NOTHING;

-- ==========================================================
-- 4. SEED ACCOUNTS (same roles/passwords as before, new usernames)
--    Change these immediately after first login.
--
--    Role       Username        Password
--    admin      ets_admin       Admin@12345!
--    operator   ets_operator    Operator@12345!
--    passenger  ets_passenger   Passenger@12345!
-- ==========================================================
INSERT INTO Users (full_name, username, password_hash, role, status, language) VALUES
  ('System Admin', 'ets_admin', '$2b$10$BZbV.cwnP6S9DgBseMNhaeufp1Nkx.bAEZN8ykNJqFyo27fclwZJm', 'admin', 'active', 'en'),
  ('ETS Station Controller', 'ets_operator', '$2b$10$ZPRckVq/Fg.1o1.I3vO5BulPLViqvgLiXIPhXmOgycDB4LDNdVdni', 'operator', 'approved', 'en'),
  ('John Doe Passenger', 'ets_passenger', '$2b$10$n0rHu3m6FQvEreYCttUtluExFghjUOs6STWFBwHjtT5h8iQi5s35W', 'passenger', 'active', 'en')
ON CONFLICT (username) DO NOTHING;

-- ==========================================================
-- 5. VERIFY (optional)
-- ==========================================================
-- SELECT 'Users' AS table_name, COUNT(*) FROM Users
-- UNION ALL SELECT 'Stations', COUNT(*) FROM Stations
-- UNION ALL SELECT 'Routes', COUNT(*) FROM Routes
-- UNION ALL SELECT 'Holidays', COUNT(*) FROM Holidays
-- UNION ALL SELECT 'Ridership', COUNT(*) FROM Ridership;
