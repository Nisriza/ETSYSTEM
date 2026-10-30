# ETS Rider Predict System

A web-based ridership prediction and travel planning system for Malaysia's **Electric Train Service (ETS)**.

Riders can check how busy a route is likely to be, plan around public holidays, and save trips. Operators can file monthly reports, and administrators manage users, stations, routes, holidays, the ML model and the dataset. The UI is available in **English** (`/`) and **Bahasa Malaysia** (`/bm`).

---

## Features

| Area | What it does |
|---|---|
| Ridership prediction | Forecasts passenger counts for an origin → destination pair using a Python/scikit-learn model with a statistical fallback. Returns a demand level (Low → Very High) |
| Trip planning | Route availability check, holiday-aware recommendations, "consider travelling on …" alternatives, KTMB booking link |
| Malaysian public holidays | National holidays synced from [Nager.Date](https://date.nager.at), plus admin-managed state holidays |
| Saved trips & feedback | Passenger saved trips and crowd-level feedback |
| Operator reports | Monthly report generation and CSV export |
| Admin console | User management, operator approval, stations/routes CRUD, holidays CRUD + sync, dataset upload/validation, model retrain/reset/download |
| AI assistant | Optional floating assistant powered by Google Gemini (disabled when `GEMINI_API_KEY` is empty) |
| PWA | Installable app: manifest, generated service worker, offline app shell, install/open control with platform-aware instructions |
| Auth | Username/password, guest access, and **Google sign-in via Supabase**; language-aware tutorial on first login |

---

## Tech stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4, Recharts, lucide-react
- **Backend:** Express 4 (`server.ts`), running on Node with `tsx`
- **Database:** Supabase (PostgreSQL) through a thin SQL adapter (`src/db/sqlite.ts`, `exec_sql` RPC)
- **ML:** Python 3 + scikit-learn (`ml/train.py`, `ml/predict.py`)
- **PWA:** `vite-plugin-pwa` (Workbox)
- **Auth provider:** Supabase Auth (Google OAuth) bridged into the app's own sessions

---

## Requirements

- Node.js 20+ (developed on Node 24)
- Python 3.10+ on `PATH` (`python`), with `scikit-learn`, `pandas`, `joblib` for live predictions
- A Supabase project

---

## Quick start

```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
# fill in the Supabase values in .env.local
```

Run the SQL files in the Supabase **SQL Editor**, in order:

```text
supabase_schema.sql
supabase_migration_phase1.sql
supabase_migration_phase2.sql
supabase_migration_phase3.sql
supabase_migration_phase4.sql
supabase_migration_phase5.sql
supabase_migration_phase6.sql
```

Then:

```bash
npm run dev      # Express + Vite middleware on http://localhost:3000
```

Open <http://localhost:3000>. The API and the SPA share port 3000 in development, so no CORS setup is needed locally.

---

## Environment variables

All values live in `.env.local` (git-ignored). `.env.local` overrides `.env`; real process environment variables override both, which is how Render/Railway/Vercel inject configuration.

### Server (Express / API host)

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only key used by the SQL adapter. **Never** expose it to the browser |
| `SUPABASE_ANON_KEY` | optional | Used to verify Supabase access tokens in the Google auth bridge (service role also works) |
| `CORS_ORIGINS` | production | Comma-separated browser origins allowed to call the API, e.g. `https://ets-rider.vercel.app,http://localhost:3000` |
| `GEMINI_API_KEY` | optional | Enables the AI assistant |
| `PORT` | optional | Injected by Render/Railway; defaults to `3000` |

### Client (baked into the bundle at build time)

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | for Google login | Public Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | for Google login | Public anon key (safe to ship) |
| `VITE_API_BASE_URL` | production only | Origin of the separate API host. Leave empty locally |

> ⚠️ Anything prefixed `VITE_` is public. Never put the service-role key in a `VITE_` variable.

---

## Google sign-in

The app keeps its own bearer-token sessions, so Supabase is used **as the identity provider only**:

1. The browser calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
2. Supabase redirects to Google, then back to the app (`detectSessionInUrl` restores the session).
3. The app posts the Supabase access token to `POST /api/auth/supabase`.
4. The server verifies it against Supabase's `/auth/v1/user`, finds or creates the matching `Users` row, and returns the app's normal `{ token, user }` payload.

Nothing else in the app changed: every protected route still uses the existing `Authorization: Bearer <user_token>` header.

### Google Cloud Console

1. Create (or pick) a project.
2. **APIs & Services → OAuth consent screen**: External, add your email as a test user, scopes `email` and `profile` only.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
4. **Authorised redirect URI** — this is Supabase's callback, not your app:
   ```text
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
5. **Authorised JavaScript origins**:
   ```text
   http://localhost:3000
   https://<your-vercel-app>.vercel.app
   ```
6. Copy the **Client ID** and **Client Secret**.

### Supabase

1. **Authentication → Providers → Google**: enable it and paste the Client ID / Secret.
2. **Authentication → URL Configuration**:
   - Site URL: `https://<your-vercel-app>.vercel.app`
   - Redirect URLs: `http://localhost:3000`, `http://localhost:3000/bm`, `https://<your-vercel-app>.vercel.app`, `https://<your-vercel-app>.vercel.app/bm`
3. Run `supabase_migration_phase5.sql` (adds `Users.email`, `supabase_uid`, `auth_provider`, `avatar_url`) and `supabase_migration_phase6.sql` (adds `login_count`, backfills existing accounts, and aligns the `language` check constraint with `en`/`bm`).
4. Copy **Project URL** and the **anon** key into `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` on Vercel and/or `SUPABASE_URL` / `SUPABASE_ANON_KEY` on the API host; copy the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY` on the API host only.

The button is rendered on **both** login screens (`/` and `/bm`). If the `VITE_` values were not present when Vercel built the SPA, the browser asks the API host for the public URL/anon key via `GET /api/auth/config`, so Google sign-in still works instead of disappearing from one build. Only the anon key is ever returned — never the service-role key.

---

## Public holidays: why Nager.Date

Holidays come from **[Nager.Date](https://date.nager.at)** (`GET /api/v3/PublicHolidays/{year}/MY`), called server-side.

| | Nager.Date | Google Calendar API |
|---|---|---|
| API key | none | required (or OAuth `calendar.readonly`) |
| Consent screen / scopes | none | extra scope per user |
| Quota | generous, no per-user limit | per-project quota |
| Malaysian national holidays | ✅ | ✅ |
| State-level holidays | ❌ | ❌ |

Both sources only provide **national** holidays, so Google Calendar would add a key, an OAuth scope and a quota without improving the data. National holidays are therefore synced from Nager.Date and **state holidays are entered manually by an admin** (the `Holidays.state` column, default `ALL`).

Endpoints:

- `GET /api/holidays?scope=year` — this year's national holidays (ISO dates)
- `GET /api/holidays?scope=year&state=Selangor` — national **plus** that state's holidays
- `POST /api/admin/holidays/sync` — admin-only, imports the current year from Nager.Date. Existing rows are never overwritten, and the upstream response is cached for one hour. The **Sync holidays** button in Admin → Holidays calls this.

---

## Tutorial and first-login behaviour

- The tutorial follows the current UI language: `/bm` shows Malay content **and** Malay controls (`Langkau`, `Kembali`, `Seterusnya`, `Selesai`), while `/` shows English.
- Registered users are offered the tutorial automatically only on their first successful login (`login_count === 1` with `tutorial_completed` false).
- `supabase_migration_phase6.sql` backfills existing accounts to `login_count = 1`, so their next login counts as #2 and the tutorial is not forced on them. **Help** in the header opens it at any time.
- Closing or skipping the tutorial stores `tutorial_completed`, and a per-session guard prevents a page refresh from reopening the suggestion.
- If the phase-6 migration has not been run, `login_count` is `null`; the app then deliberately does not auto-open the tutorial, and login continues to work normally.
- Guest accounts receive the optional prompt at sign-in. Their header shows **Sign In / Register** (**Log Masuk / Daftar**) instead of Logout, and the button returns them to the login screen.

---

## PWA / installability

- `vite-plugin-pwa` generates `dist/sw.js` and `dist/manifest.webmanifest` at build time from `vite.config.ts`.
- Icons are produced by `node scripts/generate-icons.cjs` into `public/icons/` (192, 512, maskable 512, Apple touch, favicon).
- On boot, `cleanupForeignServiceWorkers()` in `src/lib/pwa.ts` unregisters any service worker that is not ours and deletes caches that are not Workbox/`ets-` prefixed, so a stale worker from another project can't serve an old shell.
- `src/main.tsx` registers the worker itself with a versioned URL (`/sw.js?v=3`) and `updateViaCache: 'none'`, checks for updates hourly, and reloads once when a new worker takes control. This also replaces the old hand-written `/sw.js`, which could keep serving a cached `/` (English) shell while `/bm` loaded the new build.
- `src/lib/pwaInstall.ts` captures `beforeinstallprompt` at module load from `src/main.tsx`, before React mounts, so the install control on both the login page and the app header can use the native prompt whenever the browser offers it.
- The control is context-aware: **Install Web App** when installation is possible, **Open in Web App** when the app is already installed but the user is in a normal browser tab, and an **Installed** badge when running standalone. When no native prompt exists (iOS/iPadOS/Safari, Android without the prompt, unsupported desktop browsers), the same button opens step-by-step instructions for that device: Add to Home Screen on iPhone/iPad, Add to Dock on macOS Safari, the browser menu on Android, and the address-bar install icon on desktop Chrome/Edge.
- Chrome shows the install prompt on `https://` or `localhost` only. To test the production behaviour:
  ```bash
  npm run build
  npm start          # serve dist/ from Express on http://localhost:3000
  ```
  Dev mode also registers a worker (`devOptions.enabled`) so the install button is testable with `npm run dev`. Only Chromium-based browsers expose the native prompt; the manual instructions cover the rest.

---

## Deployment

This app has a Node server that spawns Python, reads/writes `model.pkl` (~143 MB) and `train/`/`historical/` CSVs, and runs multi-minute retraining. That cannot run on serverless functions, so it deploys as **two pieces**:

### 1. API host — Render / Railway / Fly (or any persistent Node host)

- Build: `npm install`
- Start: `npm run build && npm start` (or `npm run dev` for a demo)
- Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `CORS_ORIGINS`, `GEMINI_API_KEY`
- Attach a **persistent disk** and install Python 3 + the ML dependencies so predictions and retraining survive restarts.
- Note the public URL, e.g. `https://ets-rider-api.onrender.com`.

### 2. Frontend — Vercel

`vercel.json` builds only the SPA (`npx vite build` → `dist`) and rewrites unknown paths to `index.html` (excluding `/api`). Cache headers keep hashed assets immutable while `sw.js`/`index.html` stay revalidated.

Set in **Project → Settings → Environment Variables**:

```text
VITE_API_BASE_URL=https://ets-rider-api.onrender.com
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Then redeploy (Vite bakes these in at build time). The two `VITE_SUPABASE_*` values are optional: without them the SPA reads the public Supabase URL/anon key from `GET /api/auth/config` on the API host, so Google sign-in keeps working in both languages. Google OAuth returns to the language the user started from (`/` or `/bm`), so both URLs must be allowlisted in Supabase.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Express + Vite middleware on port 3000 |
| `npm run build` | Build the SPA to `dist/` and bundle the server to `dist/server.cjs` |
| `npm start` | Run the production server (`dist/server.cjs`, serves `dist/`) |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
| `npm run clean` | Remove build output |
| `node scripts/generate-icons.cjs` | Regenerate PWA icons |

---

## Project structure

```text
server.ts                     Express API: auth, holidays, predictions, admin, AI assistant
src/
  App.tsx                     Boot, session restore, Google bridge, routing by role
  components/                 Login/Passenger/Operator/Admin views (EN + BM), PWA + AI widgets
  lib/api.ts                  apiUrl()/apiFetch() — routes calls to VITE_API_BASE_URL
  lib/supabaseClient.ts       Browser Supabase client + Google sign-in helpers
  lib/supabaseAuth.ts         Exchanges the Supabase session for an app token
  lib/pwa.ts                  Install status + foreign service-worker cleanup
  lib/pwaInstall.ts           Early beforeinstallprompt capture + install state store
  lib/tutorial.ts             Localised tutorial steps (EN/BM) per role
  lib/predictor.ts            Model metrics, training orchestration, Python invocation
  db/sqlite.ts                Supabase SQL adapter (exec_sql RPC)
ml/                           train.py / predict.py / model artefacts
public/icons/                 Generated PWA icons
supabase_*.sql                Schema + phase migrations (run in order)
vite.config.ts                Vite + VitePWA configuration
vercel.json                   SPA hosting config for the Vercel frontend
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Supabase is not configured` | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` missing from `.env.local` |
| Google button missing in production | Set `SUPABASE_URL` + `SUPABASE_ANON_KEY` on the API host, or `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` on Vercel (then rebuild) |
| Google button appears only in one language / one page shows an old app | A stale PWA worker is serving an old cached `/` shell. Reload once (the new worker replaces itself), or clear site data. The versioned SW registration in `src/main.tsx` prevents it recurring |
| `Database migration missing` on Google login | Run `supabase_migration_phase5.sql` |
| Tutorial never opens automatically | Run `supabase_migration_phase6.sql`; without the `login_count` column the app intentionally skips the automatic suggestion. Users can still open it from **Help** |
| Tutorial reopens on every refresh | The per-session guard only lasts for the tab session. Close/skip the tutorial once so `tutorial_completed` is stored, or run `supabase_migration_phase6.sql` |
| Install button shows instructions instead of a prompt | Expected on iOS/iPadOS/Safari and other non-Chromium browsers. Chromium on `https://`/`localhost` shows the native prompt when the app is installable |
| Holidays list empty | Admin → Holidays → **Sync … Holidays**, or check that the `Holidays` table has rows |
| `redirect_uri_mismatch` from Google | The Google client's redirect URI must be `https://<ref>.supabase.co/auth/v1/callback` |
| API calls fail only on the deployed site | `VITE_API_BASE_URL` wrong, or the API host's `CORS_ORIGINS` does not include the Vercel origin |
| Predictions fall back to statistics | Python or `ml/model.pkl` unavailable on the API host |
