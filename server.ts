// `.env.local` wins over `.env` (dotenv never overwrites an already-set key).
// Real process environment variables always win over both, which is how
// Render/Railway/Vercel inject configuration.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import multer from 'multer';
import { getDB } from './src/db/sqlite.ts';
import { predictRidership, getModelMetrics, resetModel, startTraining, trainingState, getTrainingReport } from './src/lib/predictor.ts';

function normalizeDate(dateStr: string): string {
  const s = dateStr.trim().replace(/^"|"$/g, '');
  // Already DD/MM/YYYY → strip day leading zero
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    if (parseInt(d) >= 1 && parseInt(d) <= 31 && parseInt(m) >= 1 && parseInt(m) <= 12) return `${parseInt(d)}/${m}/${y}`;
  }
  // Already DD-MM-YYYY → convert to D/MM/YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split('-');
    if (parseInt(d) >= 1 && parseInt(d) <= 31 && parseInt(m) >= 1 && parseInt(m) <= 12) return `${parseInt(d)}/${m}/${y}`;
  }
  // YYYY-MM-DD (e.g. from <input type="date">) → D/MM/YYYY
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [_, y, m, d] = isoMatch;
    return `${parseInt(d)}/${m}/${y}`;
  }
  // D-M-YYYY → D/MM/YYYY
  const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [_, d, m, y] = dashMatch;
    return `${parseInt(d)}/${m.padStart(2, '0')}/${y}`;
  }
  // M/D/YYYY or D/M/YYYY → D/MM/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [_, a, b, y] = slashMatch;
    return `${parseInt(b)}/${a.padStart(2, '0')}/${y}`;
  }
  return dateStr;
}

function formatDateDMY(dateStr: string): string {
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

function normalizeCsvDates(content: string): string {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return content;
  const header = lines[0];
  const dataLines = lines.slice(1);
  const normalized = dataLines.map(line => {
    const parts = line.split(',');
    if (parts.length > 0) parts[0] = normalizeDate(parts[0]);
    return parts.join(',');
  });
  return [header, ...normalized].join('\n');
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ==========================================
// CORS
// ------------------------------------------
// In production the SPA is served from a different origin (Vercel) than this
// API (Render/Railway), so the browser needs explicit permission. CORS_ORIGINS
// is a comma-separated allowlist, e.g.
//   CORS_ORIGINS=https://ets-rider.vercel.app,http://localhost:3000
// Requests with no Origin header (curl, same-origin, server-to-server) pass.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use((req: any, res: any, next: any) => {
  const origin = (req.headers.origin || '').replace(/\/$/, '');

  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || 'Authorization, Content-Type'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Memory session store mapping token -> user
const sessionStore = new Map<string, { id: number; full_name: string; username: string; role: string; status: string }>();

// Auth Middleware
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  const userSession = sessionStore.get(token);
  if (!userSession) {
    return res.status(403).json({ error: 'Session expired or invalid' });
  }

  // Guest sessions are in-memory only and have no Users row
  if (userSession.role === 'guest') {
    req.user = userSession;
    return next();
  }

  // Double check user still exists and is not suspended
  const db = await getDB();
  const dbUser = await db.get('SELECT id, full_name, username, role, status FROM Users WHERE id = ?', [userSession.id]);

  if (!dbUser) {
    sessionStore.delete(token);
    return res.status(403).json({ error: 'User record deleted' });
  }

  if (dbUser.status !== 'active' && dbUser.status !== 'approved') {
    sessionStore.delete(token);
    return res.status(403).json({ error: 'User is suspended' });
  }

  req.user = dbUser;
  next();
}

// Guard middleware: guests may only use read-only/search features
function blockGuests(req: any, res: any, next: any) {
  if (req.user?.role === 'guest') {
    return res.status(403).json({ error: 'Please register or log in to use this feature.' });
  }
  next();
}

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, username, password, role } = req.body;

    if (!full_name || !username || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!['passenger', 'operator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user type selection.' });
    }

    const db = await getDB();

    // Validate unique username
    const existing = await db.get('SELECT id FROM Users WHERE username = ?', [username.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Username is already taken. Please choose another one.' });
    }

    // Hash Password
    const password_hash = await bcrypt.hash(password, 10);

    // Set initial status based on role
    const initialStatus = role === 'operator' ? 'pending' : 'active';

    // Save user record
    const result = await db.run(
      'INSERT INTO Users (full_name, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [full_name.trim(), username.toLowerCase().trim(), password_hash, role, initialStatus]
    );

    const newUser = {
      id: result.lastID,
      full_name,
      username: username.toLowerCase().trim(),
      role,
      status: initialStatus
    };

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Failed to register new user.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, language } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db = await getDB();
    const user = await db.get('SELECT * FROM Users WHERE username = ?', [username.toLowerCase().trim()]);

    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    if (user.role === 'operator' && user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending approval. Please wait for an administrator to approve your account.' });
    }

    if (user.role === 'operator' && user.status === 'rejected') {
      return res.status(403).json({ error: 'Your registration was rejected. Please contact an administrator for details.' });
    }

    if (user.role === 'operator' && user.status !== 'active' && user.status !== 'approved') {
      return res.status(403).json({ error: 'Your account has not been approved yet.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Generate Session Token
    const sessionToken = randomBytes(32).toString('hex');
    const sessionUser = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      status: user.status
    };

    sessionStore.set(sessionToken, sessionUser);

    // Save language preference if provided
    if (language) {
      await db.run('UPDATE Users SET language = ? WHERE id = ?', [language, user.id]);
    }

    res.json({
      token: sessionToken,
      user: { ...sessionUser, language: language || user.language || 'en', tutorial_completed: !!user.tutorial_completed, tutorial_completed_at: user.tutorial_completed_at || null }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal system error during sign-in.' });
  }
});

app.post('/api/auth/guest', async (req, res) => {
  try {
    const sessionToken = randomBytes(32).toString('hex');
    const guestUser = {
      id: 0,
      full_name: 'Guest',
      username: 'guest',
      role: 'guest',
      status: 'active'
    };

    sessionStore.set(sessionToken, guestUser);

    res.json({ token: sessionToken, user: guestUser });
  } catch (error) {
    console.error('Guest session error:', error);
    res.status(500).json({ error: 'Failed to start guest session.' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No active session' });
  }

  const sessionUser = sessionStore.get(token);
  if (!sessionUser) {
    return res.status(401).json({ error: 'Session invalid or expired' });
  }

  if (sessionUser.role === 'guest') {
    return res.json({ user: sessionUser });
  }

  // Fresh DB Fetch to check status
  const db = await getDB();
  const dbUser = await db.get('SELECT id, full_name, username, role, status, language, tutorial_completed, tutorial_completed_at FROM Users WHERE id = ?', [sessionUser.id]);

  if (!dbUser || (dbUser.status !== 'active' && dbUser.status !== 'approved')) {
    sessionStore.delete(token);
    return res.status(403).json({ error: 'User is suspended or deleted' });
  }

  res.json({ user: dbUser });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    sessionStore.delete(token);
  }
  res.json({ success: true });
});

// ==========================================
// SUPABASE GOOGLE AUTH BRIDGE
// ------------------------------------------
// The browser runs the Google OAuth flow through Supabase
// (supabase.auth.signInWithOAuth({ provider: 'google' })). Once Supabase has a
// session, the client posts the Supabase access token here. We verify that
// token with Supabase, find-or-create the matching row in Users, and hand back
// the same custom session token every other endpoint already expects.
// ==========================================

function supabaseApiKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

function buildUsernameFromEmail(email: string): string {
  const local = (email.split('@')[0] || 'rider').toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return (local || 'rider').slice(0, 24);
}

app.post('/api/auth/supabase', async (req, res) => {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const accessToken = req.body?.access_token as string | undefined;

  if (!supabaseUrl || !supabaseApiKey()) {
    return res.status(503).json({
      error:
        'Google sign-in is not configured on the server. Set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).',
    });
  }
  if (!accessToken) {
    return res.status(400).json({ error: 'Missing Supabase access token.' });
  }

  try {
    // Verify the token against Supabase Auth and read the confirmed profile.
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseApiKey(),
      },
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: 'Supabase session is invalid or expired. Please sign in again.' });
    }

    const supabaseUser: any = await userRes.json();
    const email: string | undefined = supabaseUser?.email;
    const supabaseUid: string | undefined = supabaseUser?.id;
    if (!email || !supabaseUid) {
      return res.status(400).json({ error: 'Google account did not return an email address.' });
    }

    const metadata = supabaseUser?.user_metadata || {};
    const fullName: string =
      metadata.full_name || metadata.name || email.split('@')[0] || 'ETS Rider';
    const avatarUrl: string | null = metadata.avatar_url || metadata.picture || null;

    const db = await getDB();

    // 1. Match on the Supabase user id, 2. fall back to the email address, so a
    //    rider who registered with the same email keeps one account.
    let user = await db.get('SELECT * FROM Users WHERE supabase_uid = ?', [supabaseUid]);
    if (!user) {
      user = await db.get('SELECT * FROM Users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    }

    if (user) {
      await db.run(
        `UPDATE Users
            SET supabase_uid = ?, auth_provider = COALESCE(auth_provider, 'google'),
                email = COALESCE(email, ?), avatar_url = COALESCE(?, avatar_url),
                full_name = COALESCE(NULLIF(full_name, ''), ?)
          WHERE id = ?`,
        [supabaseUid, email, avatarUrl, fullName, user.id]
      );
    } else {
      // Google accounts never use a password, but Users.password_hash is NOT NULL
      // and other code paths still compare against it, so store an unusable hash.
      const unusableHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

      // Usernames are unique; append a short suffix until the handle is free.
      const base = buildUsernameFromEmail(email);
      let username = base;
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await db.get('SELECT id FROM Users WHERE username = ?', [username]);
        if (!clash) break;
        username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const result = await db.run(
        `INSERT INTO Users (full_name, username, password_hash, role, status, email, supabase_uid, auth_provider, avatar_url)
         VALUES (?, ?, ?, 'passenger', 'active', ?, ?, 'google', ?)`,
        [fullName, username, unusableHash, email, supabaseUid, avatarUrl]
      );
      user = await db.get('SELECT * FROM Users WHERE id = ?', [result.lastID]);
    }

    if (!user) {
      return res.status(500).json({ error: 'Could not resolve a local account for this Google login.' });
    }

    if (user.role === 'operator' && user.status === 'pending') {
      return res.status(403).json({ error: 'Your operator account is pending administrator approval.' });
    }
    if (user.role === 'operator' && user.status === 'rejected') {
      return res.status(403).json({ error: 'Your registration was rejected. Please contact an administrator.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    const sessionToken = randomBytes(32).toString('hex');
    const sessionUser = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      status: user.status,
    };
    sessionStore.set(sessionToken, sessionUser);

    res.json({
      token: sessionToken,
      user: {
        ...sessionUser,
        email: user.email || email,
        avatar_url: user.avatar_url || avatarUrl,
        language: user.language || 'en',
        tutorial_completed: !!user.tutorial_completed,
        tutorial_completed_at: user.tutorial_completed_at || null,
      },
    });
  } catch (error: any) {
    console.error('Supabase auth bridge error:', error);
    const message = String(error?.message || '');
    if (/column .*(supabase_uid|auth_provider|avatar_url|email)|does not exist/i.test(message)) {
      return res.status(500).json({
        error:
          'Database migration missing. Run supabase_migration_phase5.sql in the Supabase SQL editor, then try again.',
      });
    }
    res.status(500).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

app.post('/api/user/change-password', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Both old and new passwords are required.' });
    }

    const db = await getDB();
    const user = await db.get('SELECT * FROM Users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User session not found.' });
    }

    // Compare with current password hash
    const match = await bcrypt.compare(oldPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'The old password you entered is incorrect.' });
    }

    // Verify password hardness security rules
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
    const hasMinLength = newPassword.length >= 8;

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and contain at least: one uppercase letter, one lowercase letter, one number, and one special character (e.g., @, #, $, %, etc.).'
      });
    }

    // Generate highly safe new bcrypt hash and update
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE Users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully! Keep it secure.' });
  } catch (error) {
    console.error('Password change error details:', error);
    res.status(500).json({ error: 'Failed to update password due to a system error.' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { fullname, username, newPassword } = req.body;
    if (!fullname || !username || !newPassword) {
      return res.status(400).json({ error: 'Full name, username, and new password are required.' });
    }

    const db = await getDB();
    const user = await db.get("SELECT * FROM Users WHERE full_name = ? AND username = ?", [fullname.trim(), username.toLowerCase().trim()]);
    if (!user) {
      return res.status(404).json({ error: 'No account found matching that full name and username.' });
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
    const hasMinLength = newPassword.length >= 8;
    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and contain: uppercase, lowercase, number, and special character.'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE Users SET password_hash = ? WHERE id = ?', [newHash, user.id]);

    res.json({ success: true, message: 'Password has been reset. You can now log in with your new password.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to reset password due to a system error.' });
  }
});

app.post('/api/user/delete-account', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const db = await getDB();
    const user = await db.get('SELECT * FROM Users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be self-deleted.' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Current password is required to delete account.' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Password is incorrect.' });
    }

    // Delete associated data
    await db.run('DELETE FROM Feedback WHERE user_id = ?', [user.id]);
    await db.run('DELETE FROM SavedTrips WHERE user_id = ?', [user.id]);
    await db.run('DELETE FROM Users WHERE id = ?', [user.id]);

    res.json({ success: true, message: 'Your account has been permanently deleted.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account due to a system error.' });
  }
});

app.put('/api/user/language', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const { language } = req.body;
    if (!language) {
      return res.status(400).json({ error: 'Language is required.' });
    }
    const db = await getDB();
    await db.run('UPDATE Users SET language = ? WHERE id = ?', [language, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Language update error:', error);
    res.status(500).json({ error: 'Failed to save language preference.' });
  }
});

// Tutorial completion status (DB-backed)
app.put('/api/user/tutorial', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const { completed } = req.body;
    const value = completed ? true : false;
    const db = await getDB();
    await db.run(
      'UPDATE Users SET tutorial_completed = ?, tutorial_completed_at = ? WHERE id = ?',
      [value, value ? new Date().toISOString() : null, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Tutorial update error:', error);
    res.status(500).json({ error: 'Failed to save tutorial status.' });
  }
});

// ==========================================
// 2. STATIONS & ROUTE CHECKS
// ==========================================

app.get('/api/stations', async (req, res) => {
  try {
    const db = await getDB();
    const stations = await db.all('SELECT * FROM Stations ORDER BY name ASC');
    res.json(stations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load stations' });
  }
});

app.get('/api/routes/popular', async (req, res) => {
  try {
    const db = await getDB();
    const rows = await db.all(
      `SELECT origin, destination, AVG(ridership_count) as avg_ridership, COUNT(*) as trip_count
       FROM Ridership GROUP BY origin, destination ORDER BY trip_count DESC LIMIT 5`
    );
    const routes = rows.map((r: any) => {
      let level: string;
      const avg = Math.round(r.avg_ridership);
      if (avg <= 50) level = 'Low';
      else if (avg <= 100) level = 'Medium';
      else if (avg <= 250) level = 'High';
      else level = 'Very High';
      return { origin: r.origin, destination: r.destination, ridership: avg, trips: r.trip_count, level };
    });
    res.json(routes);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/routes/check', async (req, res) => {
  try {
    const { origin_id, destination_id } = req.query;

    if (!origin_id || !destination_id) {
      return res.status(400).json({ error: 'Origin and destination Station IDs are required.' });
    }

    const db = await getDB();
    const route = await db.get(
      'SELECT id FROM Routes WHERE origin_station_id = ? AND destination_station_id = ?',
      [origin_id, destination_id]
    );

    if (route) {
      res.json({ available: true, routeId: route.id });
    } else {
      // Get suggestions - connected destinations for this origin
      const suggestions = await db.all(
        `SELECT s.id, s.name FROM Stations s
         INNER JOIN Routes r ON r.destination_station_id = s.id
         WHERE r.origin_station_id = ?
         ORDER BY s.name`,
        [origin_id]
      );
      res.json({ available: false, suggestions });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify route availability.' });
  }
});

app.get('/api/routes/from/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const db = await getDB();
    const destinations = await db.all(
      `SELECT s.id, s.name FROM Stations s
       INNER JOIN Routes r ON r.destination_station_id = s.id
       WHERE r.origin_station_id = ?
       ORDER BY s.name`,
      [stationId]
    );
    res.json(destinations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch connected routes.' });
  }
});

// ==========================================
// 3. ML PREDICTIONS ENGINE
// ==========================================

app.post('/api/predict', authenticateToken, async (req: any, res) => {
  try {
    const { origin, destination, date, time } = req.body;

    if (!origin || !destination || !date || !time) {
      return res.status(400).json({ error: 'Origin, Destination, Date, and Time are required.' });
    }

    const normalizedDate = normalizeDate(date);
    const { predictedRidership, demandLevel, std } = await predictRidership(origin, destination, normalizedDate, time);

    const db = await getDB();

    // Log the search (not verified training data) for analytics and future evaluation.
    // Anonymous/guest searches are allowed (user_id nullable).
    try {
      await db.run(
        `INSERT INTO RouteSearches (user_id, origin, destination, travel_date, travel_time, predicted_ridership, demand_level, route_available, search_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.role === 'guest' ? null : req.user.id, origin, destination, normalizedDate, time, predictedRidership, demandLevel, null, 'web']
      );
    } catch (e) {
      console.warn('RouteSearches insert skipped:', (e as any)?.message);
    }

    res.json({
      origin,
      destination,
      date: formatDateDMY(normalizedDate),
      time,
      predictedRidership,
      demandLevel,
      confidenceStd: std
    });
  } catch (error: any) {
    console.error('Ml prediction error:', error);
    res.status(500).json({ error: 'Failed to execute machine learning model prediction.' });
  }
});

// ==========================================
// 4. SAVED TRIPS RESOURCE (CRUD)
// ==========================================

app.get('/api/saved-trips', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const db = await getDB();
    const trips = await db.all('SELECT * FROM SavedTrips WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve saved trips.' });
  }
});

app.post('/api/saved-trips', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const { origin, destination, date, time, predicted_ridership, demand_level, note } = req.body;

    if (!origin || !destination || !date || !time) {
      return res.status(400).json({ error: 'Required travel itinerary properties missing.' });
    }

    const db = await getDB();
    const result = await db.run(
      `INSERT INTO SavedTrips (user_id, origin, destination, travel_date, travel_time, predicted_ridership, demand_level, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, origin, destination, date, time, predicted_ridership || null, demand_level || null, note || '']
    );

    const saved = {
      id: result.lastID,
      user_id: req.user.id,
      origin,
      destination,
      travel_date: date,
      travel_time: time,
      predicted_ridership,
      demand_level,
      note
    };

    res.status(201).json(saved);
  } catch (error) {
    console.error('Save Trip Error:', error);
    res.status(500).json({ error: 'Failed to save travel itinerary.' });
  }
});

app.put('/api/saved-trips/:id', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { travel_date, travel_time, note } = req.body;

    const db = await getDB();
    const trip = await db.get('SELECT user_id FROM SavedTrips WHERE id = ?', [id]);

    if (!trip) {
      return res.status(404).json({ error: 'Saved trip not found.' });
    }

    if (trip.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    await db.run(
      `UPDATE SavedTrips 
       SET travel_date = COALESCE(?, travel_date),
           travel_time = COALESCE(?, travel_time),
           note = COALESCE(?, note)
       WHERE id = ?`,
      [travel_date, travel_time, note, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ error: 'Failed to update saved trip details.' });
  }
});

app.delete('/api/saved-trips/:id', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const { id } = req.params;
    const db = await getDB();
    const trip = await db.get('SELECT user_id FROM SavedTrips WHERE id = ?', [id]);

    if (!trip) {
      return res.status(404).json({ error: 'Saved trip record not found.' });
    }

    if (trip.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    await db.run('DELETE FROM SavedTrips WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete saved trip.' });
  }
});

// ==========================================
// 5. CROWD FEEDBACK FLOW (CRUD)
// ==========================================

app.get('/api/feedback', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const db = await getDB();
    const allFeedback = await db.all(`
      SELECT f.*, u.full_name as author_name 
      FROM Feedback f 
      JOIN Users u ON f.user_id = u.id 
      ORDER BY f.created_at DESC
    `);
    res.json(allFeedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch crowd feedback logs.' });
  }
});

app.get('/api/feedback/history', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const db = await getDB();
    const history = await db.all('SELECT * FROM Feedback WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve personal feedback histories.' });
  }
});

app.post('/api/feedback', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const { origin, destination, date, crowd_level, comfort_rating, delay_reported, delay_minutes, comment } = req.body;

    if (!origin || !destination || !date || !crowd_level || !comfort_rating) {
      return res.status(400).json({ error: 'All essential feedback fields are required.' });
    }

    const db = await getDB();
    const result = await db.run(
      `INSERT INTO Feedback (user_id, origin, destination, travel_date, crowd_level, comfort_rating, delay_reported, delay_minutes, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, origin, destination, date, crowd_level, comfort_rating, !!delay_reported, delay_minutes || 0, comment || '']
    );

    const created = {
      id: result.lastID,
      user_id: req.user.id,
      origin,
      destination,
      travel_date: date,
      crowd_level,
      comfort_rating,
      delay_reported,
      delay_minutes,
      comment
    };

    res.status(201).json(created);
  } catch (error) {
    console.error('Feedback insertion error:', error);
    res.status(500).json({ error: 'Failed to log feedback submission.' });
  }
});

app.put('/api/feedback/:id', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { crowd_level, comfort_rating, delay_reported, delay_minutes, comment } = req.body;

    const db = await getDB();
    const item = await db.get('SELECT * FROM Feedback WHERE id = ?', [id]);

    if (!item) {
      return res.status(404).json({ error: 'Feedback record not found.' });
    }

    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized action.' });
    }

    await db.run(
      `UPDATE Feedback 
       SET crowd_level = COALESCE(?, crowd_level),
           comfort_rating = COALESCE(?, comfort_rating),
           delay_reported = COALESCE(?, delay_reported),
           delay_minutes = COALESCE(?, delay_minutes),
           comment = COALESCE(?, comment)
       WHERE id = ?`,
      [crowd_level, comfort_rating, !!delay_reported, delay_minutes, comment, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Feedback update error:', error);
    res.status(500).json({ error: 'Failed to update feedback logs.' });
  }
});

app.delete('/api/feedback/:id', authenticateToken, blockGuests, async (req: any, res) => {
  try {
    const { id } = req.params;
    const db = await getDB();
    const item = await db.get('SELECT user_id FROM Feedback WHERE id = ?', [id]);

    if (!item) {
      return res.status(404).json({ error: 'Feedback record not found.' });
    }

    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    await db.run('DELETE FROM Feedback WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete feedback entry.' });
  }
});

// ==========================================
// 6. HOLIDAYS & RECOMMENDATION ALGORITHMS
// ==========================================

// Holidays.date is stored in one of two shapes:
//   ISO       -> "2026-02-17"  (schema seed + Nager.Date sync)
//   day-first -> "17/02/2026"  (values typed into the admin holiday form)
// These helpers let every query work with both, and let responses always carry
// ISO dates so the client can safely do `new Date(holidayDate)`.
const HOLIDAY_ISO_DATE_SQL = `(CASE
  WHEN date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN date
  ELSE SUBSTRING(date, 7, 4) || '-' || LPAD(SUBSTRING(date, 4, 2), 2, '0') || '-' || LPAD(SUBSTRING(date, 1, 2), 2, '0')
END)`;

function holidayYearWhere(year: number): string {
  return `(date LIKE '${year}-%' OR date LIKE '%/${year}')`;
}

function toIsoHolidayDate(value: string): string {
  const s = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dayFirst = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2].padStart(2, '0')}-${dayFirst[1].padStart(2, '0')}`;
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? s : parsed.toISOString().split('T')[0];
}

app.get('/api/holidays', async (req, res) => {
  try {
    const db = await getDB();
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    // Optional state filter: national holidays ('ALL') plus anything recorded
    // for that state. Nager.Date has no state-level data, so state holidays are
    // whatever the admin entered manually.
    const stateFilter = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const stateClause = stateFilter ? "AND (state = 'ALL' OR state = ?)" : '';
    const stateParams = stateFilter ? [stateFilter] : [];

    if (req.query.all === 'true') {
      const list = await db.all(`SELECT * FROM Holidays ORDER BY ${HOLIDAY_ISO_DATE_SQL} ASC`);
      res.json(list);
    } else if (req.query.scope === 'year') {
      const list = await db.all(
        `SELECT * FROM Holidays WHERE country = 'Malaysia' AND ${holidayYearWhere(curYear)} ${stateClause}
         ORDER BY ${HOLIDAY_ISO_DATE_SQL} ASC`,
        stateParams
      );
      res.json(list);
    } else {
      const startDate = new Date(curYear, curMonth, 1);
      const endDate = new Date(curYear, curMonth + 2, 0);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      const list = await db.all(
        `SELECT * FROM Holidays WHERE country = 'Malaysia' AND ${holidayYearWhere(curYear)} ${stateClause}
         AND ${HOLIDAY_ISO_DATE_SQL} >= ?
         AND ${HOLIDAY_ISO_DATE_SQL} <= ?
         ORDER BY ${HOLIDAY_ISO_DATE_SQL} ASC`,
        [...stateParams, startStr, endStr]
      );
      res.json(list);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to query holidays.' });
  }
});

// Sync Malaysian public holidays from Nager.Date (free, no API key required).
// Nager.Date only publishes NATIONAL holidays; state-level holidays stay a
// manual admin entry (GET /api/holidays?state=Selangor merges both).
const NAGER_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const nagerCache = new Map<string, { at: number; holidays: any[] }>();

async function fetchNagerHolidays(year: number): Promise<any[]> {
  const cached = nagerCache.get(String(year));
  if (cached && Date.now() - cached.at < NAGER_CACHE_TTL_MS) return cached.holidays;

  const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/MY`);
  if (!r.ok) throw new Error(`Nager.Date responded ${r.status}`);
  const holidays: any[] = await r.json();
  nagerCache.set(String(year), { at: Date.now(), holidays });
  return holidays;
}

app.post('/api/admin/holidays/sync', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  const year = parseInt(req.body?.year || new Date().getFullYear(), 10);
  if (isNaN(year)) return res.status(400).json({ error: 'Invalid year.' });
  try {
    const holidays = await fetchNagerHolidays(year);
    const db = await getDB();
    let inserted = 0;
    let skipped = 0;
    for (const h of holidays) {
      const uid = `nager:${year}:${h.date}:${h.name}`;
      try {
        const existing = await db.get('SELECT id FROM Holidays WHERE external_uid = ?', [uid]);
        if (existing) {
          // Already synced; leave any admin edits on that row untouched.
          skipped++;
          continue;
        }
        await db.run(
          `INSERT INTO Holidays (name, date, country, state, source, external_uid)
           VALUES (?, ?, 'Malaysia', 'ALL', 'nager', ?)
           ON CONFLICT (external_uid) DO NOTHING`,
          [h.localName || h.name, h.date, uid]
        );
        inserted++;
      } catch (e) {
        // Missing external_uid column (older schema) or duplicate - skip quietly.
        skipped++;
      }
    }
    res.json({ success: true, year, fetched: holidays.length, inserted, skipped });
  } catch (error: any) {
    console.error('Holiday sync error:', error);
    res.status(500).json({ error: 'Failed to sync holidays. Existing holidays were left unchanged.' });
  }
});

app.get('/api/recommendations', authenticateToken, async (req: any, res) => {
  try {
    const db = await getDB();
    const now = new Date();
    const curYear = now.getFullYear();
    const holidays = await db.all(
      `SELECT * FROM Holidays WHERE country = 'Malaysia' AND ${holidayYearWhere(curYear)}
       ORDER BY ${HOLIDAY_ISO_DATE_SQL} ASC`,
      []
    );

    let origin = 'Butterworth';
    let destination = 'KL Sentral';

    // Guests have no saved trips — use the default popular route
    if (req.user.role !== 'guest') {
      const savedRoutes = await db.all(
        'SELECT origin, destination, COUNT(*) as qty FROM SavedTrips WHERE user_id = ? GROUP BY origin, destination ORDER BY qty DESC LIMIT 1',
        [req.user.id]
      );

      if (savedRoutes && savedRoutes.length > 0) {
        origin = savedRoutes[0].origin;
        destination = savedRoutes[0].destination;
      }
    }

    const recommendations = [];

    for (const h of holidays) {
      const holidayIsoDate = toIsoHolidayDate(h.date);
      // Run static prediction on holiday date at standard peak hour e.g. 17:00
      const pred = await predictRidership(origin, destination, holidayIsoDate, '17:00:00');
      
      let recommendationText = '';
      let alternativeDate = '';

      if (pred.demandLevel === 'High' || pred.demandLevel === 'Very High') {
        // Try to find the nearest lower demand date before the holiday
        const holidayDate = new Date(holidayIsoDate);
        
        // Loop backwards up to 5 days to find a Low or Medium date
        for (let i = 1; i <= 5; i++) {
          const testDate = new Date(holidayDate);
          testDate.setDate(holidayDate.getDate() - i);
          const testDateStr = testDate.toISOString().split('T')[0];
          
          const testPred = await predictRidership(origin, destination, testDateStr, '17:00:00');
          if (testPred.demandLevel === 'Low' || testPred.demandLevel === 'Medium') {
            alternativeDate = testDateStr;
            break;
          }
        }
        
        recommendationText = `High demand expected on holiday date (${h.name}). Consider booking earlier — recommended booking date: ${alternativeDate || 'a weekday prior'}.`;
      } else {
        recommendationText = `Demand remains manageable for Holiday (${h.name}). You may proceed to book directly.`;
      }

      recommendations.push({
        holidayId: h.id,
        holidayName: h.name,
        holidayDate: holidayIsoDate,
        origin,
        destination,
        predictedRidership: pred.predictedRidership,
        demandLevel: pred.demandLevel,
        recommendation: recommendationText,
        recommendedDate: alternativeDate || null
      });
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Recommendation fetch error:', error);
    res.status(500).json({ error: 'Failed to generate travel recommendations.' });
  }
});

// ==========================================
// 7. OPERATOR ANALYTICS & REPORTS (CRUD)
// ==========================================

app.get('/api/operator/analytics', authenticateToken, async (req: any, res) => {
  try {
    const db = await getDB();

    const histData = await db.all(
      `SELECT origin, destination, SUM(ridership_count) as total_ridership 
       FROM Ridership 
       GROUP BY origin, destination`
    );

    // If empty historical base, fallback to seed-based analytical simulations
    const hasData = histData.length > 0;
    const routesData = hasData ? histData.map(r => ({
      name: `${r.origin} → ${r.destination}`,
      ridership: r.total_ridership
    })) : [
      { name: 'Butterworth → KL Sentral', ridership: 12400 + Math.floor(Math.random() * 3200) },
      { name: 'Ipoh → KL Sentral', ridership: 8500 + Math.floor(Math.random() * 2100) },
      { name: 'Padang Besar → KL Sentral', ridership: 6800 + Math.floor(Math.random() * 1800) },
      { name: 'KL Sentral → Butterworth', ridership: 11200 + Math.floor(Math.random() * 2900) },
      { name: 'Gemas → KL Sentral', ridership: 4100 + Math.floor(Math.random() * 1200) }
    ];

    // Peak demand hours analytics
    const peakHours = [
      { hour: '06:00', passengers: 420 },
      { hour: '08:00', passengers: 940 },
      { hour: '10:00', passengers: 530 },
      { hour: '12:00', passengers: 480 },
      { hour: '14:00', passengers: 390 },
      { hour: '16:00', passengers: 680 },
      { hour: '18:00', passengers: 1050 },
      { hour: '20:00', passengers: 510 },
      { hour: '22:00', passengers: 210 }
    ];

    const busiestRoutes = routesData.slice().sort((a, b) => b.ridership - a.ridership);

    res.json({
      routesAnalytics: routesData,
      peakHours,
      busiestRoutes
    });
  } catch (error) {
    console.error('Failed to compile analytical trends:', error);
    res.status(500).json({ error: 'Failed to compile analytical trends.' });
  }
});

app.get('/api/operator/reports', authenticateToken, async (req: any, res) => {
  try {
    const db = await getDB();
    const reports = await db.all(`
      SELECT r.*, u.full_name as operator_name 
      FROM Reports r
      JOIN Users u ON r.operator_id = u.id 
      ORDER BY r.generated_at DESC
    `);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to access generated analytics reports.' });
  }
});

app.post('/api/operator/reports', authenticateToken, async (req: any, res) => {
  try {
    const { month, year, report_data } = req.body;

    if (!month || !year || !report_data) {
      return res.status(400).json({ error: 'Month, Year, and Report Data payload are required.' });
    }

    const db = await getDB();

    const existingReport = await db.get(
      'SELECT id FROM Reports WHERE operator_id = ? AND month = ? AND year = ?',
      [req.user.id, month, year]
    );

    if (existingReport) {
      await db.run(
        'UPDATE Reports SET report_data = ?, generated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(report_data), existingReport.id]
      );
    } else {
      await db.run(
        'INSERT INTO Reports (operator_id, month, year, report_data) VALUES (?, ?, ?, ?)',
        [req.user.id, month, year, JSON.stringify(report_data)]
      );
    }

    res.status(201).json({ success: true, message: 'Report generated and committed to Database.' });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to save generated analytics report.' });
  }
});

app.delete('/api/operator/reports/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const db = await getDB();
    
    const report = await db.get('SELECT operator_id FROM Reports WHERE id = ?', [id]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    // Only creator or admin can delete
    if (report.operator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    await db.run('DELETE FROM Reports WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete report.' });
  }
});

// ==========================================
// 8. ADMINISTRATIVE CONTROLLERS (CRUD)
// ==========================================

// MANAGE USERS CRUD
app.get('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const db = await getDB();
    const users = await db.all("SELECT id, full_name, username, role, status, created_at FROM Users ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'operator' THEN 1 ELSE 2 END, created_at DESC");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to query operational users database.' });
  }
});

app.post('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { full_name, username, password, role } = req.body;
    if (!full_name || !username || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const db = await getDB();
    const existing = await db.get('SELECT id FROM Users WHERE username = ?', [username.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Username already registered.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const status = role === 'operator' ? 'pending' : 'active';
    const result = await db.run(
      'INSERT INTO Users (full_name, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [full_name, username.toLowerCase().trim(), hash, role, status]
    );

    res.status(201).json({ id: result.lastID, full_name, username, role, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save user.' });
  }
});

app.put('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    const db = await getDB();
    await db.run(
      'UPDATE Users SET role = COALESCE(?, role), status = COALESCE(?, status) WHERE id = ?',
      [role, status, id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user parameters.' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { id } = req.params;
    const db = await getDB();
    
    // Safety check: Don't let admin delete themselves
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'You cannot self-suspend or delete your active session account.' });
    }

    // Actually delete the user
    const result = await db.get('DELETE FROM Users WHERE id = ? RETURNING id', [id]);
    if (!result) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to suspend user session.' });
  }
});

// MONITOR SYSTEM USAGE
app.get('/api/admin/system-usage', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const db = await getDB();

    // 1. Count users by role (dynamic - matches whatever roles exist)
    const userRoles = await db.all('SELECT role, COUNT(*) as c FROM Users GROUP BY role');
    const userCounts: Record<string, number> = {};
    for (const r of userRoles) userCounts[r.role] = r.c;

    // 2. Stations grouped by state
    const stationsByState = await db.all('SELECT state, COUNT(*) as count FROM Stations GROUP BY state ORDER BY state');

    // 3. Ridership-derived data
    let totalPredictions = 0;
    let topRoutes: { origin: string; destination: string; volume: number; demandLevel: string; avgRidership: number }[] = [];
    let dailyVolume: { date: string; volume: number }[] = [];
    try {
      const pc = await db.get('SELECT COUNT(*) as c FROM Ridership');
      totalPredictions = pc ? pc.c : 0;

      topRoutes = await db.all(`
        SELECT origin, destination, COUNT(*) as volume, AVG(ridership_count) as avg_ridership
        FROM Ridership 
        GROUP BY origin, destination 
        ORDER BY volume DESC 
        LIMIT 5
      `);
      topRoutes = topRoutes.map((r: any) => {
        const avg = r.avg_ridership || 0;
        let level: string;
        if (avg <= 50) level = 'Low';
        else if (avg <= 100) level = 'Medium';
        else if (avg <= 250) level = 'High';
        else level = 'Very High';
        return { origin: r.origin, destination: r.destination, volume: r.volume, demandLevel: level, avgRidership: Math.round(avg) };
      });
      if (topRoutes.length === 0) {
        topRoutes.push(
          { origin: 'Butterworth', destination: 'KL Sentral', volume: 42, demandLevel: 'Low', avgRidership: 35 },
          { origin: 'Ipoh', destination: 'KL Sentral', volume: 28, demandLevel: 'Low', avgRidership: 42 },
          { origin: 'Padang Besar', destination: 'Ipoh', volume: 15, demandLevel: 'Low', avgRidership: 28 },
          { origin: 'KL Sentral', destination: 'Butterworth', volume: 11, demandLevel: 'Low', avgRidership: 22 },
          { origin: 'Ipoh', destination: 'Butterworth', volume: 7, demandLevel: 'Low', avgRidership: 18 }
        );
      }

      dailyVolume = await db.all(`
        SELECT date, COUNT(*) as volume 
        FROM Ridership 
        GROUP BY date
        ORDER BY date ASC 
        LIMIT 10
      `);
    } catch (_) {
      // Ridership table may not exist yet — use defaults
    }

    res.json({
      userCounts,
      stationsByState,
      totalPredictions,
      topRoutes,
      dailyVolume
    });
  } catch (error) {
    console.error('System Usage log fetch error:', error);
    res.status(500).json({ error: 'Failed to load system metrics.' });
  }
});

// OPERATOR APPROVAL (ADMIN)
app.get('/api/admin/operators', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const db = await getDB();
    const operators = await db.all(
      "SELECT id, full_name, username, status, created_at FROM Users WHERE role = 'operator' ORDER BY created_at DESC"
    );
    res.json(operators);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch operators.' });
  }
});

app.post('/api/admin/operators/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { id } = req.params;
    const db = await getDB();
    await db.run("UPDATE Users SET status = 'approved' WHERE id = ? AND role = 'operator'", [id]);
    res.json({ success: true, message: 'Operator approved.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve operator.' });
  }
});

app.post('/api/admin/operators/:id/reject', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { id } = req.params;
    const db = await getDB();
    await db.run("UPDATE Users SET status = 'rejected' WHERE id = ? AND role = 'operator'", [id]);
    res.json({ success: true, message: 'Operator rejected.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject operator.' });
  }
});

// STATION MANAGEMENT (ADMIN)
app.post('/api/stations', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { name, state } = req.body;
    if (!name || !state) return res.status(400).json({ error: 'Name and state are required.' });
    const db = await getDB();
    const result = await db.run('INSERT INTO Stations (name, state) VALUES (?, ?)', [name.trim(), state]);
    res.status(201).json({ id: result.lastID, name: name.trim(), state });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Station name already exists.' });
    res.status(500).json({ error: 'Failed to add station.' });
  }
});

app.put('/api/stations/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { id } = req.params;
    const { name, state } = req.body;
    const db = await getDB();
    await db.run(
      'UPDATE Stations SET name = COALESCE(?, name), state = COALESCE(?, state) WHERE id = ?',
      [name, state, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update station.' });
  }
});

app.delete('/api/stations/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { id } = req.params;
    const db = await getDB();
    await db.run('DELETE FROM Stations WHERE id = ?', [id]);
    await db.run('DELETE FROM Routes WHERE origin_station_id = ? OR destination_station_id = ?', [id, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete station.' });
  }
});

// ROUTE CONNECTIONS MANAGEMENT (ADMIN)
app.get('/api/routes/admin', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const db = await getDB();
    const connections = await db.all(`
      SELECT rc.id, rc.origin_station_id, rc.destination_station_id,
        os.name as origin_name, ds.name as destination_name
      FROM Routes rc
      JOIN Stations os ON rc.origin_station_id = os.id
      JOIN Stations ds ON rc.destination_station_id = ds.id
      ORDER BY os.name
    `);
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch routes.' });
  }
});

app.post('/api/routes/admin', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { origin_station_id, destination_station_id } = req.body;
    if (!origin_station_id || !destination_station_id) {
      return res.status(400).json({ error: 'Origin and destination station IDs are required.' });
    }
    const db = await getDB();
    const result = await db.run(
      'INSERT INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?)',
      [origin_station_id, destination_station_id]
    );
    // Also insert reverse for bidirectional routing
    await db.run(
      'INSERT INTO Routes (origin_station_id, destination_station_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
      [destination_station_id, origin_station_id]
    );
    res.status(201).json({ id: result.lastID, origin_station_id, destination_station_id });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Route already exists.' });
    res.status(500).json({ error: 'Failed to add route.' });
  }
});

app.put('/api/routes/admin/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { id } = req.params;
    const { origin_station_id, destination_station_id } = req.body;
    const db = await getDB();
    await db.run(
      'UPDATE Routes SET origin_station_id = ?, destination_station_id = ? WHERE id = ?',
      [origin_station_id, destination_station_id, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update route.' });
  }
});

app.delete('/api/routes/admin/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { id } = req.params;
    const db = await getDB();
    const route = await db.get(
      'SELECT origin_station_id, destination_station_id FROM Routes WHERE id = ?', [id]
    );
    await db.run('DELETE FROM Routes WHERE id = ?', [id]);
    // Also delete reverse direction
    if (route) {
      await db.run(
        'DELETE FROM Routes WHERE origin_station_id = ? AND destination_station_id = ?',
        [route.destination_station_id, route.origin_station_id]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete route.' });
  }
});

// OPERATOR CSV DOWNLOAD
app.get('/api/operator/report-months', authenticateToken, async (req: any, res) => {
  try {
    const db = await getDB();
    const rows = await db.all(`
      SELECT DISTINCT
        CAST(SPLIT_PART(date, '/', 2) AS INTEGER) as month,
        CAST(SPLIT_PART(date, '/', 3) AS INTEGER) as year
      FROM Ridership
      WHERE date LIKE '%/%/____'
      ORDER BY year DESC, month DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report months.' });
  }
});

app.get('/api/debug/dates', async (req: any, res) => {
  try {
    const db = await getDB();
    const rows = await db.all("SELECT DISTINCT date FROM Ridership ORDER BY date LIMIT 50", []);
    const count = await db.all("SELECT COUNT(*) as c FROM Ridership", []);
    res.json({ totalRows: count[0]?.c, sampleDates: rows.map(r => r.date) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/operator/report-csv', authenticateToken, async (req: any, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required.' });
    }

    const db = await getDB();
    const m = parseInt(month as string, 10);
    const y = parseInt(year as string, 10);
    const monStr = m < 10 ? '0' + m : String(m);

    const rows = await db.all(
      `SELECT origin, destination, COUNT(*) as total_trips, SUM(ridership_count) as total_ridership
       FROM Ridership
       WHERE date LIKE ? OR date LIKE ?
       GROUP BY origin, destination
       ORDER BY origin ASC, destination ASC`,
      [`%/${m}/${y}`, `%/${monStr}/${y}`]
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=ridership_report_${y}_${m}.csv`);

    let csv = '"Origin","Destination","Total Trips","Total Ridership"\n';
    for (const row of rows) {
      csv += `"${row.origin}","${row.destination}",${row.total_trips},${row.total_ridership}\n`;
    }

    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

app.get('/api/operator/reports/download', authenticateToken, async (req: any, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required.' });
    }

    const db = await getDB();
    const m = parseInt(month as string, 10);
    const y = parseInt(year as string, 10);
    const monStr = m < 10 ? '0' + m : String(m);

    const rows = await db.all(
      `SELECT origin, destination, COUNT(*) as total_trips, SUM(ridership_count) as total_ridership
       FROM Ridership
       WHERE date LIKE ? OR date LIKE ?
       GROUP BY origin, destination
       ORDER BY origin ASC, destination ASC`,
      [`%/${m}/${y}`, `%/${monStr}/${y}`]
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=ridership_report_${y}_${m}.csv`);

    let csv = '"Origin","Destination","Total Trips","Total Ridership"\n';
    for (const row of rows) {
      csv += `"${row.origin}","${row.destination}",${row.total_trips},${row.total_ridership}\n`;
    }

    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// USER LANGUAGE PREFERENCE
app.put('/api/user/language', authenticateToken, async (req: any, res) => {
  try {
    const { language } = req.body;
    if (!['en', 'ms'].includes(language)) {
      return res.status(400).json({ error: 'Invalid language. Supported: en, ms' });
    }
    const db = await getDB();
    await db.run('UPDATE Users SET language = ? WHERE id = ?', [language, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update language preference.' });
  }
});

// HOLIDAY CONTROLS (CRUD)
app.post('/api/admin/holidays', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { name, date } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'Holiday Name and Date are required.' });

    const db = await getDB();
    const normalized = normalizeDate(date);
    const result = await db.run(
      'INSERT INTO Holidays (name, date, country) VALUES (?, ?, ?)',
      [name, normalized, 'Malaysia']
    );

    res.status(201).json({ id: result.lastID, name, date: normalized, country: 'Malaysia' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record custom holiday.' });
  }
});

app.put('/api/admin/holidays/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { id } = req.params;
    const { name, date } = req.body;

    const db = await getDB();
    await db.run(
      'UPDATE Holidays SET name = COALESCE(?, name), date = COALESCE(?, date) WHERE id = ?',
      [name, date ? normalizeDate(date) : null, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update holiday properties.' });
  }
});

app.delete('/api/admin/holidays/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { id } = req.params;
    const db = await getDB();
    await db.run('DELETE FROM Holidays WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to erase holiday event.' });
  }
});

// DATASET MANAGEMENT CRUD — local-file only, no database upload
const upload = multer({ dest: path.resolve(process.cwd(), 'train') });
const DATASET_META_PATH = path.resolve(process.cwd(), 'dataset_meta.json');

// Multi-year training datasets: train/ets_YYYY.csv (2020-2026)
function getTrainingDatasets(): { files: string[]; totalRows: number } {
  const trainDir = path.resolve(process.cwd(), 'train');
  if (!fs.existsSync(trainDir)) return { files: [], totalRows: 0 };
  const files = fs.readdirSync(trainDir).filter(f => /^ets_\d{4}\.csv$/i.test(f)).sort();
  let totalRows = 0;
  for (const f of files) {
    try {
      const content = fs.readFileSync(path.resolve(trainDir, f), 'utf8');
      totalRows += Math.max(0, content.trim().split('\n').length - 1);
    } catch { /* ignore unreadable file */ }
  }
  return { files, totalRows };
}

app.get('/api/admin/dataset', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { files, totalRows } = getTrainingDatasets();
    if (files.length === 0) {
      return res.json({ exists: false, fileName: null, totalRows: 0 });
    }
    const fileName = files.length === 1
      ? files[0]
      : `${files.length} files (${files[0]} … ${files[files.length - 1]})`;
    res.json({ exists: true, fileName, totalRows });
  } catch { res.status(500).json({ error: 'Failed to read dataset metadata.' }); }
});

app.post('/api/admin/dataset/upload', authenticateToken, upload.single('csv'), async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded.' });
    const tempPath = req.file.path;
    let content = fs.readFileSync(tempPath, 'utf8');
    content = normalizeCsvDates(content);
    const lines = content.trim().split('\n');
    if (lines.length < 2) { fs.unlinkSync(tempPath); return res.status(400).json({ error: 'CSV must have a header row and at least one data row.' }); }

    const header = lines[0].split(',').map((h: string) => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const expected = ['date', 'time', 'origin', 'destination', 'ridership_count'];
    const altExpected = ['date', 'time', 'origin', 'destination', 'ridership'];
    const headerOk = expected.every((h, i) => header[i] === h) || altExpected.every((h, i) => header[i] === h);
    if (!headerOk) {
      fs.unlinkSync(tempPath);
      return res.status(400).json({ error: 'CSV header must be: date,time,origin,destination,ridership_count' });
    }

    const dataLines = lines.slice(1);
    let validRows = 0;
    let rejectedRows = 0;
    const seen = new Set<string>();
    const validRowsArr: string[] = [];
    for (const line of dataLines) {
      if (!line.trim()) continue;
      const parts = line.split(',');
      if (parts.length < 5) { rejectedRows++; continue; }
      const date = parts[0].trim();
      const time = parts[1].trim();
      const origin = parts[2].trim();
      const destination = parts[3].trim();
      const countStr = parts[4].trim();
      if (!date || !time || !origin || !destination) { rejectedRows++; continue; }
      const dt = new Date(date.split('/').reverse().join('-'));
      if (isNaN(dt.getTime())) { rejectedRows++; continue; }
      const count = parseInt(countStr, 10);
      if (isNaN(count) || count < 0) { rejectedRows++; continue; }
      const key = date + '|' + time + '|' + origin + '|' + destination + '|' + count;
      if (seen.has(key)) { rejectedRows++; continue; }
      seen.add(key);
      validRowsArr.push(line);
      validRows++;
    }

    const totalRows = dataLines.filter((l: string) => l.trim()).length;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `ets_historical_${timestamp}.csv`;

    const trainDir = path.resolve(process.cwd(), 'train');
    const historicalDir = path.resolve(process.cwd(), 'historical');
    if (!fs.existsSync(historicalDir)) fs.mkdirSync(historicalDir, { recursive: true });
    if (!fs.existsSync(trainDir)) fs.mkdirSync(trainDir, { recursive: true });

    fs.writeFileSync(path.resolve(trainDir, fileName), content, 'utf8');
    fs.writeFileSync(path.resolve(historicalDir, fileName), content, 'utf8');
    fs.unlinkSync(tempPath);

    const crypto = require('crypto');
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    const db = await getDB();
    const dateVals = validRowsArr.map((l: string) => l.split(',')[0].trim());
    const sourceStart = dateVals.length ? dateVals.reduce((a: string, b: string) => (a < b ? a : b)) : null;
    const sourceEnd = dateVals.length ? dateVals.reduce((a: string, b: string) => (a > b ? a : b)) : null;

    let versionId: number | null = null;
    try {
      const r = await db.run(
        `INSERT INTO DatasetVersions (file_name, original_file_name, uploaded_by, row_count, valid_rows, rejected_rows, status, source_period_start, source_period_end, checksum, notes)
         VALUES (?, ?, ?, ?, ?, ?, 'validated', ?, ?, ?, ?)`,
        [fileName, req.file.originalname || fileName, req.user.id, totalRows, validRows, rejectedRows, sourceStart, sourceEnd, checksum, 'Uploaded via admin dashboard.']
      );
      versionId = r.lastID ?? null;
    } catch (e) {
      console.warn('DatasetVersions insert failed (table may not exist yet):', (e as any)?.message);
    }

    const meta = { fileName, uploadDate: new Date().toISOString(), rowCount: totalRows, validRows, rejectedRows, versionId };
    fs.writeFileSync(DATASET_META_PATH, JSON.stringify(meta, null, 2));

    res.json({ success: true, fileName, totalRows, validRows, rejectedRows, versionId, checksum });
  } catch (error: any) { res.status(500).json({ error: error.message || 'Failed to upload dataset.' }); }
});

app.post('/api/admin/dataset/clear', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const trainDir = path.resolve(process.cwd(), 'train');
    const historicalDir = path.resolve(process.cwd(), 'historical');
    [trainDir, historicalDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(f => {
          if (f.endsWith('.csv')) fs.unlinkSync(path.resolve(dir, f));
        });
      }
    });
    if (fs.existsSync(DATASET_META_PATH)) fs.unlinkSync(DATASET_META_PATH);
    res.json({ success: true, message: 'Dataset cleared.' });
  } catch { res.status(500).json({ error: 'Failed to clear dataset.' }); }
});

app.get('/api/admin/dataset/preview', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const { files, totalRows } = getTrainingDatasets();
    if (files.length === 0) return res.json({ exists: false, rows: [], headers: [] });
    const csvPath = path.resolve(process.cwd(), 'train', files[0]);
    if (!fs.existsSync(csvPath)) return res.json({ exists: false, rows: [], headers: [] });
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const dataRows = lines.slice(1, 51).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ''; });
      return row;
    });
    res.json({ exists: true, headers, rows: dataRows, totalRows });
  } catch { res.status(500).json({ error: 'Failed to preview dataset.' }); }
});



// MODEL MANAGEMENT
app.get('/api/admin/model', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const metrics = getModelMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to access model accuracy records.' });
  }
});

app.post('/api/admin/model/retrain', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  if (trainingState.isTraining) return res.status(409).json({ error: 'Training already in progress.' });
  const { files } = getTrainingDatasets();
  if (files.length === 0) return res.status(400).json({ error: 'No training dataset found. Add ets_YYYY.csv files to the train/ folder.' });
  try {
    startTraining();
    res.json({ success: true, message: 'Training started in background.' });
  } catch (error: any) {
    console.error('Failed to start training:', error);
    res.status(500).json({ error: error.message || 'Failed to start training.' });
  }
});

app.get('/api/admin/model/status', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  res.json({
    isTraining: trainingState.isTraining,
    algorithm: trainingState.algorithm,
    error: trainingState.error,
    progress: trainingState.progress,
    logs: trainingState.logs,
  });
});

app.post('/api/admin/model/reset', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const updatedMetrics = resetModel();
    res.json({ success: true, metrics: updatedMetrics });
  } catch (error) {
    console.error('Reset model failed:', error);
    res.status(500).json({ error: 'Failed to wipe ML pipeline state.' });
  }
});

app.get('/api/admin/model/download', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const metrics = getModelMetrics();
    if (!metrics.totalRecords || metrics.totalRecords === 0) {
      return res.status(404).json({ error: 'No trained model found. Run training first.' });
    }
    const report = getTrainingReport();
    const fileName = `ets_training_report_${new Date().toISOString().slice(0, 10)}.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(report);
  } catch (error: any) {
    console.error('Download report error:', error?.message || error);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

app.get('/api/admin/model/download-pkl', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  try {
    const modelPath = path.resolve(process.cwd(), 'ml', 'model.pkl');
    if (!fs.existsSync(modelPath)) {
      return res.status(404).json({ error: 'No trained model file (.pkl) found. Run training first.' });
    }
    res.download(modelPath, 'ets_ridership_model.pkl');
  } catch (error: any) {
    console.error('Download model error:', error?.message || error);
    res.status(500).json({ error: 'Failed to download model.' });
  }
});

// Holidays are now managed as static data only. Google Calendar sync has been removed.

// ==========================================
// 10. VITE DEVELOPMENT MIDDLEWARE & STATIC SERVING
// ==========================================

// TRANSLATION PROXY — uses LibreTranslate free API to auto-translate missing strings
app.post('/api/translate', async (req, res) => {
  try {
    const { q, source = 'en', target = 'ms' } = req.body;
    if (!q) return res.status(400).json({ error: 'Missing "q" (text to translate)' });
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, source, target, format: 'text' }),
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText, translatedText: q });
    }
    const data = await response.json();
    res.json({ translatedText: data.translatedText || q });
  } catch {
    // Network error or API down — return original text
    res.json({ translatedText: req.body.q || '' });
  }
});

// BATCH TRANSLATE — translates multiple strings at once
app.post('/api/translate/batch', async (req, res) => {
  try {
    const { texts, source = 'en', target = 'ms' } = req.body;
    if (!texts || !Array.isArray(texts)) return res.status(400).json({ error: 'Missing "texts" array' });
    // LibreTranslate free API only supports single-string at a time, so we join with a separator
    const separator = '\n|||\n';
    const joined = texts.join(separator);
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: joined, source, target, format: 'text' }),
    });
    if (!response.ok) {
      return res.json({ translations: texts }); // fallback: return originals
    }
    const data = await response.json();
    const translatedParts = (data.translatedText || joined).split(separator);
    const translations: Record<string, string> = {};
    texts.forEach((text: string, i: number) => {
      translations[text] = (translatedParts[i] || text).trim();
    });
    res.json({ translations });
  } catch {
    res.json({ translations: {} });
  }
});

// ==========================================
// AI ROUTE / DESTINATION ASSISTANT (server-side, key never exposed)
// ==========================================
app.post('/api/ai/assistant', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Message is required.' });

  try {
    const db = await getDB();
    const stations = await db.all('SELECT id, name, state FROM Stations ORDER BY name ASC');
    let destinations = [];
    try { destinations = await db.all("SELECT d.id, d.name, d.category, d.notes, s.name AS station_name FROM Destinations d LEFT JOIN Stations s ON s.id = d.nearest_station_id ORDER BY d.name ASC"); } catch { destinations = []; }

    const stationNames = stations.map((s) => s.name).join(', ');
    const destNames = destinations.map((d) => d.name + ' (nearest station: ' + (d.station_name || 'unknown') + ')').join('; ');

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      const lower = message.toLowerCase();
      const matchedStation = stations.find((s) => lower.includes(String(s.name).toLowerCase()));
      const matchedDest = destinations.find((d) => lower.includes(String(d.name).toLowerCase()));
      let reply = 'AI assistant is not configured (set GEMINI_API_KEY). Here is a basic lookup:\n\n';
      if (matchedDest) reply += 'Nearest station to ' + matchedDest.name + ': ' + (matchedDest.station_name || 'unknown') + '.\n';
      if (matchedStation) reply += 'Station found: ' + matchedStation.name + ' (' + matchedStation.state + ').\n';
      if (!matchedStation && !matchedDest) reply += 'Available stations: ' + stationNames + '.\nDestinations on file: ' + (destNames || 'none yet') + '.';
      return res.json({ reply: reply, source: 'rule-based', configured: false });
    }

    const systemPrompt = 'You are a helpful assistant for the ETS Rider Predict System public transport system (Malaysia ETS trains).\nYou help users find destinations, nearby stations, and routes.\nFACTUAL DATA (use only this; do not invent stations, routes, distances, or times):\nStations: ' + stationNames + '\nDestinations on file: ' + (destNames || 'none') + '\nRules:\n- If a station/destination is not in the data, say it is unavailable; do not invent.\n- Ask a follow-up question when origin or destination is missing.\n- Keep answers concise and clear.\n- Never claim a prediction is guaranteed.';

    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: message }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
      }),
    });
    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: 'AI service unavailable.', details: errText.slice(0, 300) });
    }
    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
    res.json({ reply: reply, source: 'gemini', configured: true });
  } catch (error) {
    console.error('AI assistant error:', error);
    res.status(500).json({ error: 'AI assistant failed.' });
  }
});
async function startServer() {
  // Ensure DB gets initialized on boot
  await getDB();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();






