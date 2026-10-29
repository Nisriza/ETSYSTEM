<<<<<<< HEAD
import { createClient, SupabaseClient } from '@supabase/supabase-js';
=======
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import mysql from 'mysql2/promise';
import pg from 'pg';
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413

export interface AppDatabase {
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  run(sql: string, params?: any[]): Promise<{ lastID?: number; changes?: number }>;
  exec(sql: string): Promise<void>;
}

<<<<<<< HEAD
function escapeParam(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function bindParams(sql: string, params: any[]): string {
  let idx = 0;
  return sql.replace(/\?/g, () => {
    if (idx < params.length) return escapeParam(params[idx++]);
    return '?';
  });
}

function createSupabaseAdapter(supabase: SupabaseClient): AppDatabase {
  return {
    async get(sql: string, params: any[] = []): Promise<any> {
      const finalSql = bindParams(sql, params);
      const { data, error } = await supabase.rpc('exec_sql', { query: finalSql });
      if (error) throw new Error(`Supabase get error: ${error.message}`);
      return data?.[0] ?? null;
    },
    async all(sql: string, params: any[] = []): Promise<any[]> {
      const finalSql = bindParams(sql, params);
      const { data, error } = await supabase.rpc('exec_sql', { query: finalSql });
      if (error) throw new Error(`Supabase all error: ${error.message}`);
      return data ?? [];
    },
    async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
      const finalSql = bindParams(sql, params);
      const lowerSql = sql.trim().toUpperCase();

      if (lowerSql.startsWith('BEGIN') || lowerSql.startsWith('COMMIT') || lowerSql.startsWith('ROLLBACK')) {
        return {};
      }

      if (lowerSql.startsWith('INSERT')) {
        const returnSql = finalSql.replace(/;$/, '') + ' RETURNING id';
        const { data, error } = await supabase.rpc('exec_sql', { query: returnSql });
        if (error) throw new Error(`Supabase insert error: ${error.message}`);
        let lastID = null;
        if (data && data.length > 0) {
          const row = data[0];
          if (row.id !== undefined) lastID = row.id;
          else if (row.result && row.result.id !== undefined) lastID = row.result.id;
        }
        return { lastID, changes: 1 };
      }

      if (lowerSql.startsWith('UPDATE') || lowerSql.startsWith('DELETE')) {
        let returnSql = finalSql.replace(/;$/, '');
        if (!returnSql.toUpperCase().includes('WHERE')) {
          returnSql += ' WHERE 1=1';
        }
        returnSql += ' RETURNING 1 as affected';
        const { error } = await supabase.rpc('exec_sql', { query: returnSql });
        if (error) {
          throw new Error(`Supabase run error: ${error.message}`);
        }
        return { changes: 1 };
      }

      const { data, error } = await supabase.rpc('exec_sql', { query: finalSql });
      if (error) throw new Error(`Supabase exec error: ${error.message}`);
      return { changes: 1 };
    },
    async exec(sql: string): Promise<void> {
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const stmt of statements) {
        const upper = stmt.toUpperCase();
        if (upper.startsWith('CREATE') || upper.startsWith('ALTER') || upper.startsWith('DROP')) {
          console.warn('Schema changes not supported via exec_sql RPC. Run supabase_schema.sql in Supabase SQL Editor manually. Skipping:', stmt.slice(0, 80));
          continue;
        }
        if (upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
          const { error } = await supabase.rpc('exec_sql', { query: stmt });
          if (error && !String(error.message).includes('already exists')) {
            console.warn('Supabase exec_sql warning:', error.message);
          }
        }
      }
    },
  };
}

let dbInstance: AppDatabase | null = null;

export async function getDB(): Promise<AppDatabase> {
  if (dbInstance) return dbInstance;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file. ' +
'Run supabase_schema.sql in your Supabase SQL Editor to set up the database schema.'
    );
  }

  console.log('Connecting to Supabase via RPC...');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
  });

  const adapter = createSupabaseAdapter(supabase);
  await adapter.get('SELECT 1 as ok');

  console.log('Successfully connected to Supabase PostgreSQL via RPC.');
  dbInstance = adapter;
  return dbInstance;
}
=======
let dbInstance: AppDatabase | null = null;

// Query preprocessor to keep SQL dialect compatibility
function preprocessQuery(sql: string, dialect: 'sqlite' | 'mysql' | 'postgresql'): string {
  let processed = sql;

  if (dialect === 'mysql') {
    // Replace INSERT OR IGNORE with INSERT IGNORE
    processed = processed.replace(/INSERT\s+OR\s+IGNORE/gi, 'INSERT IGNORE');
    // Replace AUTOINCREMENT with AUTO_INCREMENT
    processed = processed.replace(/AUTOINCREMENT/gi, 'AUTO_INCREMENT');
  } else if (dialect === 'postgresql') {
    // Replace AUTOINCREMENT with serial / identity in PG
    processed = processed.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    
    // Replace TEXT check-level constraints of SQLite
    processed = processed.replace(/TEXT\s+CHECK\s*\(([^)]+)\)\s*NOT\s*NULL\s*DEFAULT\s*([^,;)]+)/gi, (m, checkVal, defVal) => {
      return `VARCHAR(255) DEFAULT ${defVal} CHECK (${checkVal})`;
    });

    processed = processed.replace(/TEXT\s+CHECK\s*\(([^)]+)\)/gi, 'VARCHAR(255) CHECK ($1)');

    // Replace BOOLEAN integers DEFAULT 0 / 1 to FALSE / TRUE
    processed = processed.replace(/BOOLEAN\s+DEFAULT\s+0/gi, 'BOOLEAN DEFAULT FALSE');
    processed = processed.replace(/BOOLEAN\s+DEFAULT\s+1/gi, 'BOOLEAN DEFAULT TRUE');

    // Replace DATETIME with TIMESTAMP
    processed = processed.replace(/DATETIME/gi, 'TIMESTAMP');

    // Replace INSERT OR IGNORE with ON CONFLICT DO NOTHING
    processed = processed.replace(/INSERT\s+OR\s+IGNORE\s+INTO\s+Routes\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi, (match, cols, vals) => {
      return `INSERT INTO Routes (${cols}) VALUES (${vals}) ON CONFLICT (origin_station_id, destination_station_id) DO NOTHING`;
    });

    processed = processed.replace(/INSERT\s+OR\s+IGNORE\s+INTO\s+Holidays\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi, (match, cols, vals) => {
      return `INSERT INTO Holidays (${cols}) VALUES (${vals}) ON CONFLICT (name, date) DO NOTHING`;
    });

    processed = processed.replace(/INSERT\s+OR\s+IGNORE\s+INTO\s+Stations\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi, (match, cols, vals) => {
      return `INSERT INTO Stations (${cols}) VALUES (${vals}) ON CONFLICT (name) DO NOTHING`;
    });

    // Replace postgres placeholders: ? -> $1, $2, $3, etc.
    let paramIndex = 1;
    processed = processed.replace(/\?/g, () => `$${paramIndex++}`);
  }

  return processed;
}

export async function getDB(): Promise<AppDatabase> {
  if (dbInstance) return dbInstance;

  // 1. Check for Supabase / PostgreSQL Credentials
  const usePostgres = !!(
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.PGHOST ||
    process.env.POSTGRES_HOST
  );

  if (usePostgres) {
    try {
      console.log('Connecting to Supabase PostgreSQL Database...');
      const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

      let pool: pg.Pool;
      if (connectionString) {
        pool = new pg.Pool({
          connectionString,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000 // fail fast in 3 seconds to avoid blocking the server startup
        });
      } else {
        const host = process.env.PGHOST || process.env.POSTGRES_HOST || '127.0.0.1';
        const user = process.env.PGUSER || process.env.POSTGRES_USER || 'postgres';
        const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '';
        const database = process.env.PGDATABASE || process.env.POSTGRES_DB || 'postgres';
        const port = parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10);
        pool = new pg.Pool({
          host,
          user,
          password,
          database,
          port,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000 // fail fast in 3 seconds
        });
      }

      await pool.query('SELECT NOW()');
      console.log('Successfully connected to Supabase PostgreSQL database.');

      const postgresAdapter: AppDatabase = {
        async get(sql: string, params: any[] = []): Promise<any> {
          const processedSql = preprocessQuery(sql, 'postgresql');
          const res = await pool.query(processedSql, params);
          return res.rows && res.rows.length > 0 ? res.rows[0] : null;
        },
        async all(sql: string, params: any[] = []): Promise<any[]> {
          const processedSql = preprocessQuery(sql, 'postgresql');
          const res = await pool.query(processedSql, params);
          return Array.isArray(res.rows) ? res.rows : [];
        },
        async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
          const processedSql = preprocessQuery(sql, 'postgresql');
          const res = await pool.query(processedSql, params);
          const lastRow = res.rows && res.rows.length > 0 ? res.rows[0] : null;
          return {
            lastID: lastRow ? lastRow.id : undefined,
            changes: res.rowCount !== null ? res.rowCount : undefined
          };
        },
        async exec(sql: string): Promise<void> {
          const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);
          for (const rawStatement of statements) {
            const processedStatement = preprocessQuery(rawStatement, 'postgresql');
            await pool.query(processedStatement);
          }
        }
      };

      await initializeSchema(postgresAdapter);
      dbInstance = postgresAdapter;
      return dbInstance;
    } catch (pgError) {
      console.warn('Supabase PostgreSQL connection failed. Falling back...', pgError);
    }
  }

  // 2. Fallback to MySQL Database
  const useMySQL = !!(
    process.env.DB_HOST ||
    process.env.MYSQL_HOST ||
    process.env.DB_USER ||
    process.env.DB_PASSWORD ||
    process.env.DB_NAME
  );

  if (useMySQL) {
    try {
      console.log('Connecting to MySQL Database...');
      const host = process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1';
      const user = process.env.DB_USER || 'root';
      const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
      const database = process.env.DB_NAME || 'ets_system';
      const port = parseInt(process.env.DB_PORT || '3306', 10);

      const connection = await mysql.createConnection({
        host,
        user,
        password,
        database,
        port,
        connectTimeout: 3000 // fail fast in 3 seconds to avoid blocking the server startup
      });

      console.log('Successfully connected to MySQL database:', database);

      const mysqlAdapter: AppDatabase = {
        async get(sql: string, params: any[] = []): Promise<any> {
          const processedSql = preprocessQuery(sql, 'mysql');
          const [rows]: [any, any] = await connection.execute(processedSql, params);
          return rows && rows.length > 0 ? rows[0] : null;
        },
        async all(sql: string, params: any[] = []): Promise<any[]> {
          const processedSql = preprocessQuery(sql, 'mysql');
          const [rows]: [any, any] = await connection.execute(processedSql, params);
          return Array.isArray(rows) ? rows : [];
        },
        async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
          const processedSql = preprocessQuery(sql, 'mysql');
          const [result]: [any, any] = await connection.execute(processedSql, params);
          return {
            lastID: result ? result.insertId : undefined,
            changes: result ? result.affectedRows : undefined
          };
        },
        async exec(sql: string): Promise<void> {
          const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);
          for (const rawStatement of statements) {
            const processedStatement = preprocessQuery(rawStatement, 'mysql');
            await connection.query(processedStatement);
          }
        }
      };

      await initializeSchema(mysqlAdapter);
      dbInstance = mysqlAdapter;
      return dbInstance;
    } catch (mysqlError) {
      console.warn('MySQL connection failed, falling back to local SQLite database...', mysqlError);
    }
  }

  // 3. Fallback to local SQLite Database
  console.log('Initializing local SQLite database (SQLITE3_LOADED_SUCCESSFULLY)...');
  const dbPath = path.resolve(process.cwd(), 'ets_system.db');
  
  const sqliteDB = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign key support
  await sqliteDB.run('PRAGMA foreign_keys = ON;');

  const sqliteAdapter: AppDatabase = {
    async get(sql: string, params: any[] = []): Promise<any> {
      const processedSql = preprocessQuery(sql, 'sqlite');
      return await sqliteDB.get(processedSql, params);
    },
    async all(sql: string, params: any[] = []): Promise<any[]> {
      const processedSql = preprocessQuery(sql, 'sqlite');
      return await sqliteDB.all(processedSql, params);
    },
    async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
      const processedSql = preprocessQuery(sql, 'sqlite');
      const result = await sqliteDB.run(processedSql, params);
      return {
        lastID: result.lastID,
        changes: result.changes
      };
    },
    async exec(sql: string): Promise<void> {
      const processedSql = preprocessQuery(sql, 'sqlite');
      await sqliteDB.exec(processedSql);
    }
  };

  await initializeSchema(sqliteAdapter);
  dbInstance = sqliteAdapter;
  return dbInstance;
}

async function initializeSchema(db: AppDatabase) {
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
      name TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL DEFAULT 'Other'
    );
  `);

  // Migrate state column to SQLite/MySQL if table already existed without it
  try {
    await db.exec("ALTER TABLE Stations ADD COLUMN state TEXT NOT NULL DEFAULT 'Other';");
  } catch (err) {
    // Column already exists, safe to ignore
  }

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
  `);

  // Index creation
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_origin_dest ON Ridership (origin, destination);`);
  } catch (e) {}
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_date_time ON Ridership (date, time);`);
  } catch (e) {}

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

  // --- SEED STATIONS by state matching online.ktmb.com.my ---
  const stationCount = await db.get('SELECT COUNT(*) as count FROM Stations');
  if (stationCount && (stationCount.count === 0 || stationCount.count === '0')) {
    const etsStationsWithStates = [
      // Perlis
      { name: 'Padang Besar', state: 'Perlis' },
      { name: 'Arau', state: 'Perlis' },
      
      // Kedah
      { name: 'Anak Bukit', state: 'Kedah' },
      { name: 'Alor Setar', state: 'Kedah' },
      { name: 'Sungai Petani', state: 'Kedah' },
      
      // Penang (Pulau Pinang)
      { name: 'Butterworth', state: 'Penang' },
      { name: 'Bukit Mertajam', state: 'Penang' },
      { name: 'Nibong Tebal', state: 'Penang' },
      
      // Perak
      { name: 'Parit Buntar', state: 'Perak' },
      { name: 'Bagan Serai', state: 'Perak' },
      { name: 'Kamunting', state: 'Perak' },
      { name: 'Taiping', state: 'Perak' },
      { name: 'Kuala Kangsar', state: 'Perak' },
      { name: 'Ipoh', state: 'Perak' },
      { name: 'Batu Gajah', state: 'Perak' },
      { name: 'Kampar', state: 'Perak' },
      { name: 'Tapah Road', state: 'Perak' },
      { name: 'Sungkai', state: 'Perak' },
      { name: 'Slim River', state: 'Perak' },
      { name: 'Tanjung Malim', state: 'Perak' },
      
      // Selangor
      { name: 'Kuala Kubu Bharu', state: 'Selangor' },
      { name: 'Rawang', state: 'Selangor' },
      { name: 'Kajang', state: 'Selangor' },
      
      // Kuala Lumpur
      { name: 'Kepong Sentral', state: 'Kuala Lumpur' },
      { name: 'Kuala Lumpur', state: 'Kuala Lumpur' },
      { name: 'KL Sentral', state: 'Kuala Lumpur' },
      { name: 'Bandar Tasik Selatan', state: 'Kuala Lumpur' },
      
      // Negeri Sembilan
      { name: 'Nilai', state: 'Negeri Sembilan' },
      { name: 'Seremban', state: 'Negeri Sembilan' },
      { name: 'Tampin', state: 'Negeri Sembilan' },
      { name: 'Gemas', state: 'Negeri Sembilan' },
      
      // Melaka
      { name: 'Batang Melaka', state: 'Melaka' },
      
      // Johor
      { name: 'Segamat', state: 'Johor' },
      { name: 'Kluang', state: 'Johor' },
      { name: 'Kempas Baru', state: 'Johor' },
      { name: 'JB Sentral', state: 'Johor' }
    ];

    for (const station of etsStationsWithStates) {
      await db.run('INSERT INTO Stations (name, state) VALUES (?, ?)', [station.name, station.state]);
    }

    // --- SEED ROUTES BETWEEN ADJACENT STATIONS ---
    // Stations ID's from 1 to 36
    for (let i = 1; i < etsStationsWithStates.length; i++) {
      await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [i, i + 1]);
      await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [i + 1, i]);
    }
    
    // Add additional popular direct route links for the simulator
    const findId = (name: string) => etsStationsWithStates.findIndex(s => s.name === name) + 1;
    const butterworthId = findId('Butterworth');
    const klSentralId = findId('KL Sentral');
    const padangBesarId = findId('Padang Besar');
    const ipohId = findId('Ipoh');

    if (butterworthId && klSentralId) {
      await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [butterworthId, klSentralId]);
      await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [klSentralId, butterworthId]);
    }
    if (padangBesarId && klSentralId) {
      await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [padangBesarId, klSentralId]);
      await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [klSentralId, padangBesarId]);
    }
    if (ipohId && klSentralId) {
      await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [ipohId, klSentralId]);
      await db.run('INSERT OR IGNORE INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)', [klSentralId, ipohId]);
    }
  }

  // --- SEED HOLIDAYS ---
  const holidayCount = await db.get('SELECT COUNT(*) as count FROM Holidays');
  if (holidayCount && (holidayCount.count === 0 || holidayCount.count === '0')) {
    const malaysiaHolidays = [
      { name: "New Year's Day", date: '2026-01-01' },
      { name: 'Chinese New Year', date: '2026-02-17' },
      { name: 'Chinese New Year (Day 2)', date: '2026-02-18' },
      { name: 'Nuzul Al-Quran', date: '2026-03-06' },
      { name: 'Hari Raya Aidilfitri', date: '2026-03-20' },
      { name: 'Hari Raya Aidilfitri (Day 2)', date: '2026-03-21' },
      { name: 'Labour Day', date: '2026-05-01' },
      { name: 'Wesak Day', date: '2026-05-31' },
      { name: "Agong's Birthday", date: '2020-06-01' },
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

  // --- SEED INITIAL USER WITH HASHED PASSWORDS ---
  const userCount = await db.get('SELECT COUNT(*) as count FROM Users');
  if (userCount && (userCount.count === 0 || userCount.count === '0')) {
    const bcrypt = await import('bcryptjs');
    // Strong complex default passwords matching encryption hardness
    const adminHash = await bcrypt.hash('Admin@12345!', 10);
    const operatorHash = await bcrypt.hash('Operator@12345!', 10);
    const passengerHash = await bcrypt.hash('Passenger@12345!', 10);

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

  // --- SEED SAMPLE RIDERSHIP DATA ---
  const ridershipCount = await db.get('SELECT COUNT(*) as count FROM Ridership');
  if (ridershipCount && (ridershipCount.count === 0 || ridershipCount.count === '0')) {
    const list = [
      { date: '2026-04-01', time: '08:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 320 },
      { date: '2026-04-01', time: '12:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 210 },
      { date: '2026-04-01', time: '18:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 380 },
      { date: '2026-04-02', time: '08:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 290 },
      { date: '2026-04-02', time: '18:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 410 },
      { date: '2026-04-03', time: '08:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 450 },
      { date: '2026-04-03', time: '18:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 580 },
      { date: '2026-04-04', time: '09:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 520 },
      { date: '2026-04-05', time: '15:00:00', origin: 'Butterworth', destination: 'KL Sentral', count: 490 },
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
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
