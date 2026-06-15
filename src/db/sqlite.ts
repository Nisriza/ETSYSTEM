import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export async function getDB(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(process.cwd(), 'ets_system.db');
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign key support
  await dbInstance.run('PRAGMA foreign_keys = ON;');

  // Initialize Schema
  await initializeSchema(dbInstance);

  return dbInstance;
}

async function initializeSchema(db: Database) {
  // CREATE Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('passenger', 'operator', 'admin')) NOT NULL DEFAULT 'passenger',
      status TEXT CHECK(status IN ('active', 'suspended')) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // CREATE Stations Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);

  // CREATE Routes Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origin_station_id INTEGER NOT NULL,
      destination_station_id INTEGER NOT NULL,
      FOREIGN KEY (origin_station_id) REFERENCES Stations(id),
      FOREIGN KEY (destination_station_id) REFERENCES Stations(id),
      UNIQUE(origin_station_id, destination_station_id)
    );
  `);

  // CREATE Ridership Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Ridership (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      ridership_count INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_origin_dest ON Ridership (origin, destination);
    CREATE INDEX IF NOT EXISTS idx_date_time ON Ridership (date, time);
  `);

  // CREATE Predictions Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      travel_date TEXT NOT NULL,
      travel_time TEXT NOT NULL,
      predicted_ridership INTEGER NOT NULL,
      demand_level TEXT CHECK(demand_level IN ('Low', 'Medium', 'High', 'Very High')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );
  `);

  // CREATE SavedTrips Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS SavedTrips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      travel_date TEXT NOT NULL,
      travel_time TEXT NOT NULL,
      predicted_ridership INTEGER,
      demand_level TEXT CHECK(demand_level IN ('Low', 'Medium', 'High', 'Very High')),
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );
  `);

  // CREATE Feedback Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      travel_date TEXT NOT NULL,
      crowd_level TEXT CHECK(crowd_level IN ('Low', 'Medium', 'High', 'Very High')) NOT NULL,
      comfort_rating INTEGER NOT NULL CHECK (comfort_rating BETWEEN 1 AND 5),
      delay_reported BOOLEAN DEFAULT 0,
      delay_minutes INTEGER DEFAULT 0,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );
  `);

  // CREATE Holidays Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      country TEXT DEFAULT 'Malaysia',
      UNIQUE(name, date)
    );
  `);

  // CREATE Reports Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      year INTEGER NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      report_data TEXT,
      FOREIGN KEY (operator_id) REFERENCES Users(id) ON DELETE CASCADE,
      UNIQUE(operator_id, month, year)
    );
  `);

  // --- SEED STATIONS ---
  const stationCount = await db.get('SELECT COUNT(*) as count FROM Stations');
  if (stationCount && stationCount.count === 0) {
    const etsStations = [
      'Padang Besar', 'Arau', 'Alor Setar', 'Sungai Petani', 'Butterworth',
      'Bukit Mertajam', 'Taiping', 'Kuala Kangsar', 'Ipoh', 'Batu Gajah',
      'Kampar', 'Tapah Road', 'Sungkai', 'Slim River', 'Tanjung Malim',
      'Rawang', 'Kuala Lumpur', 'KL Sentral', 'Kajang', 'Bandar Tasik Selatan',
      'Seremban', 'Tampin', 'Batang Melaka', 'Gemas'
    ];
    for (const station of etsStations) {
      await db.run('INSERT INTO Stations (name) VALUES (?)', [station]);
    }

    // --- SEED ROUTES ---
    // Let's seed routes between standard adjacent pairs
    // Stations ID's from 1 to 24
    for (let i = 1; i < etsStations.length; i++) {
      await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [i, i + 1]);
      await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [i + 1, i]);
    }
    // Also seed some larger express routes, e.g., Butterworth to KL Sentral, Padang Besar to KL Sentral
    const butterworthId = etsStations.indexOf('Butterworth') + 1;
    const klSentralId = etsStations.indexOf('KL Sentral') + 1;
    const padangBesarId = etsStations.indexOf('Padang Besar') + 1;
    const ipohId = etsStations.indexOf('Ipoh') + 1;

    await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [butterworthId, klSentralId]);
    await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [klSentralId, butterworthId]);
    await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [padangBesarId, klSentralId]);
    await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [klSentralId, padangBesarId]);
    await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [ipohId, klSentralId]);
    await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [klSentralId, ipohId]);
  }

  // --- SEED HOLIDAYS ---
  const holidayCount = await db.get('SELECT COUNT(*) as count FROM Holidays');
  if (holidayCount && holidayCount.count === 0) {
    const malaysiaHolidays = [
      { name: "New Year's Day", date: '2026-01-01' },
      { name: 'Chinese New Year', date: '2026-02-17' },
      { name: 'Chinese New Year (Day 2)', date: '2026-02-18' },
      { name: 'Nuzul Al-Quran', date: '2026-03-06' },
      { name: 'Hari Raya Aidilfitri', date: '2026-03-20' },
      { name: 'Hari Raya Aidilfitri (Day 2)', date: '2026-03-21' },
      { name: 'Labour Day', date: '2026-05-01' },
      { name: 'Wesak Day', date: '2026-05-31' },
      { name: 'Agong\'s Birthday', date: '2026-06-01' },
      { name: 'Hari Raya Aidiladha', date: '2026-05-27' },
      { name: 'Awal Muharram', date: '2026-06-16' },
      { name: 'Maulidur Rasul', date: '2026-08-25' },
      { name: 'Hari Merdeka (National Day)', date: '2026-08-31' },
      { name: 'Malaysia Day', date: '2026-09-16' },
      { name: 'Deepavali', date: '2026-11-08' },
      { name: 'Christmas Day', date: '2026-12-25' }
    ];
    for (const h of malaysiaHolidays) {
      await db.run('INSERT OR IGNORE INTO Holidays (name, date, country) VALUES (?, ?, ?)', [h.name, h.date, 'Malaysia']);
    }
  }

  // --- SEED INITIAL ADMIN USER ---
  // Default Admin: admin / admin123
  // Default Operator: operator / operator123
  // Default Passenger: passenger / passenger123
  const userCount = await db.get('SELECT COUNT(*) as count FROM Users');
  if (userCount && userCount.count === 0) {
    // We'll use a pre-calculated hash or hash it at runtime (it runs once, so it's super fast, bcryptjs handles it)
    // For fast seed we can hash on the fly
    const bcrypt = await import('bcryptjs');
    const adminHash = await bcrypt.hash('admin123', 10);
    const operatorHash = await bcrypt.hash('operator123', 10);
    const passengerHash = await bcrypt.hash('passenger123', 10);

    await db.run('INSERT INTO Users (full_name, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?)', [
      'System Admin', 'admin', adminHash, 'admin', 'active'
    ]);
    await db.run('INSERT INTO Users (full_name, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?)', [
      'ETS Station Controller', 'operator', operatorHash, 'operator', 'active'
    ]);
    await db.run('INSERT INTO Users (full_name, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?)', [
      'John Doe Passenger', 'passenger', passengerHash, 'passenger', 'active'
    ]);
  }

  // --- SEED SAMPLE RIDERSHIP DATA FOR PREDICTION MODEL BASICS ---
  const ridershipCount = await db.get('SELECT COUNT(*) as count FROM Ridership');
  if (ridershipCount && ridershipCount.count === 0) {
    const list = [
      { date: '2026-04-01', time: '08:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 320 },
      { date: '2026-04-01', time: '12:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 210 },
      { date: '2026-04-01', time: '18:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 380 },
      { date: '2026-04-02', time: '08:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 290 },
      { date: '2026-04-02', time: '18:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 410 },
      { date: '2026-04-03', time: '08:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 450 }, // Friday peak
      { date: '2026-04-03', time: '18:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 580 }, // Friday weekend peak
      { date: '2026-04-04', time: '09:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 520 }, // Saturday peak
      { date: '2026-04-05', time: '15:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 490 }, // Sunday return peak
      { date: '2026-04-01', time: '08:00:00', origin: 'Ipoh', destination: 'KL Sentral', count: 240 },
      { date: '2026-04-01', time: '18:00:00', origin: 'Ipoh', destination: 'KL Sentral', count: 280 }
    ];

    for (const item of list) {
      await db.run(
        'INSERT INTO Ridership (date, time, origin, destination, ridership_count) VALUES (?, ?, ?, ?, ?)',
        [item.date, item.time, item.origin, item.destination, item.count]
      );
    }
  }
}
