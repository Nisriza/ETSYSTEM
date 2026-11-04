# ETS Rider Predict System

A web-based ridership prediction and travel planning system for Malaysia's **Electric Train Service (ETS)**.

Riders can check how busy a route is likely to be, plan around public holidays, and save trips. Operators can file monthly reports, and administrators manage users, stations, routes, holidays, the ML model and the dataset. The UI is available in **English** (`/`) and **Bahasa Malaysia** (`/bm`).

---

## Features

| Area | What it does |
|---|---|
| Ridership prediction | Forecasts passenger counts for an origin → destination pair using a Python/scikit-learn model with a statistical fallback. Returns a demand level (Low → Very High) with an interactive explainer (crowd meter, per-level travel advice, "how is this predicted?") |
| Nearby attractions | Click any station in the search sidebar to list tourist attractions near it, sorted by proximity (curated `Destinations` + cached Gemini suggestions) |
| Trip planning | Route availability check, holiday-aware recommendations (**upcoming holidays only**), "consider travelling on …" alternatives, KTMB booking link |
| Malaysian public holidays | National holidays synced from [Nager.Date](https://date.nager.at), admin-managed state holidays, and a public iCalendar feed for Google Calendar |
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

Run **one** file in the Supabase **SQL Editor**: `supabase_schema.sql`. It creates the
`exec_sql` RPC, all 8 tables, indexes, the station/route/holiday seed data, and the
three seed accounts below. The old `supabase_migration_phase1..6.sql` files are no
longer needed and can be ignored.

| Role | Username | Password |
|---|---|---|
| Admin | `ets_admin` | `Admin@12345!` |
| Operator | `ets_operator` | `Operator@12345!` |
| Passenger | `ets_passenger` | `Passenger@12345!` |

> Change these passwords after the first sign-in. Forgot-password only asks for the
> username plus the new password.

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
| `CORS_ORIGINS` | production | Comma-separated browser origins allowed to call the API, e.g. `https://etsystem-zeta.vercel.app,http://localhost:3000` |
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
   https://etsystem-zeta.vercel.app
   ```
6. Copy the **Client ID** and **Client Secret**.

### Supabase

1. **Authentication → Providers → Google**: enable it and paste the Client ID / Secret.
2. **Authentication → URL Configuration**:
   - Site URL: `https://etsystem-zeta.vercel.app`
   - Redirect URLs: `http://localhost:3000`, `http://localhost:3000/bm`, `https://etsystem-zeta.vercel.app`, `https://etsystem-zeta.vercel.app/bm`
3. `supabase_schema.sql` already contains every column the Google bridge needs (`email`, `supabase_uid`, `auth_provider`, `avatar_url`) and the tutorial columns (`login_count`, `tutorial_completed`). No migrations to run.
4. Copy **Project URL** and the **anon** key into `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` on Vercel and/or `SUPABASE_URL` / `SUPABASE_ANON_KEY` on the API host; copy the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY` on the API host only.

The button is rendered on **both** login screens (`/` and `/bm`). If the `VITE_` values were not present when Vercel built the SPA, the browser asks the API host for the public URL/anon key via `GET /api/auth/config`, so Google sign-in still works instead of disappearing from one build. Only the anon key is ever returned — never the service-role key.

**When users report Google sign-in failures:** the login screen now translates raw Google/Supabase errors into a friendly, localised explanation with a fix hint (`src/lib/googleErrors.ts`). The raw error is always in the browser console. The four real-world causes, in order of likelihood:

1. **OAuth consent screen is in "Testing" mode** — only listed test users can sign in; everyone else gets *access_denied*. Fix: Google Cloud Console → OAuth consent screen → **Publish app**.
2. **Missing redirect URIs** — `https://<project>.supabase.co/auth/v1/callback` must be in the Google OAuth client's *Authorized redirect URIs*, and every app URL (`/`, `/bm`, production domain) must be in Supabase → Authentication → URL Configuration.
3. **Client ID/Secret pasted wrong in Supabase** — Google returns *invalid_client*. Re-paste from Google Cloud Console.
4. **Google provider disabled in Supabase** — re-enable under Authentication → Providers.

**Accounts are created automatically.** New Google users never need to register first: `POST /api/auth/supabase` verifies the identity with Supabase, then creates a `Users` row (role `passenger`) or reuses the existing account by `supabase_uid` / email, and returns the normal app session. The redirect back is handled deterministically — `detectSessionInUrl` is off and `bridgeSupabaseSession()` redeems the one-time `?code=` exactly once (deduplicated across React StrictMode mounts). If the redirect returns without a usable session, the login card now shows *"Google sign-in did not finish"* with a retry hint instead of silently staying on the login page. Server-side failures during auto-registration are logged with the real database reason in the API terminal.

---

## Public holidays and Google Calendar

**Keep the `Holidays` table.** It is not just a display list: `predictRidership()` reads it to set the `is_holiday` feature, and the passenger/admin views list the same rows. Google Calendar cannot replace it because the prediction engine must work offline and without a user signed into Google.

The integration is **one-way, no OAuth**: the app publishes the table as an iCalendar feed and Google Calendar subscribes to it.

```text
GET /api/holidays.ics                 # all holidays
GET /api/holidays.ics?year=2026       # one year
GET /api/holidays.ics?state=Selangor  # national + that state
```

- In **Admin → Holidays → Copy Google Calendar feed URL**, copy the link.
- In Google Calendar: **Other calendars → From URL**, paste the link, then **Add calendar**.
- Changes made in the admin holiday form (add/edit/delete or **Sync** from Nager.Date) appear in the subscribed calendar after Google's next refresh (usually minutes to a few hours).

National holidays are still imported from **[Nager.Date](https://date.nager.at)** (`GET /api/v3/PublicHolidays/{year}/MY`), called server-side. Nager.Date needs no API key and no per-user consent. State-level holidays are entered manually by an admin (`Holidays.state`, default `ALL`).

Endpoints:

- `GET /api/holidays?scope=year` — this year's national holidays (ISO dates)
- `GET /api/holidays?scope=year&state=Selangor` — national **plus** that state's holidays
- `POST /api/admin/holidays/sync` — admin-only, imports the current year from Nager.Date. Existing rows are never overwritten, and the upstream response is cached for one hour. The **Sync holidays** button in Admin → Holidays calls this.
- `GET /api/holidays.ics` — public iCalendar feed for Google Calendar / Apple Calendar.

> Write-back (creating events in a user's personal Google Calendar) is deliberately **not** enabled: it needs the `calendar.events` OAuth scope, token storage and a consent screen review, while the prediction engine would still need the local table. The read-only feed gives the same result without any of that.

---

## Tutorial and first-login behaviour

- The tutorial follows the current UI language: `/bm` shows Malay content **and** Malay controls (`Langkau`, `Kembali`, `Seterusnya`, `Selesai`), while `/` shows English.
- Registered users are offered the tutorial automatically only on their first successful login (`login_count === 1` with `tutorial_completed` false).
- Seed accounts start at `login_count = 0`, so their first login counts as #1 and the tutorial is offered once. **Help** in the header opens it at any time.
- Closing or skipping the tutorial stores `tutorial_completed` (with the bearer token), and a per-session guard prevents a page refresh from reopening the suggestion.
- If `login_count` is `null` (an account created outside the schema), the app deliberately does not auto-open the tutorial, and login continues to work normally.
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

## Nearby attractions (per station)

- **UI:** the passenger Search sidebar has a **Nearby Attractions** card (EN: *Nearby Attractions* / BM: *Tarikan Berdekatan*). Click a station chip → the list appears below, **sorted by approximate distance**.
- **API:** `GET /api/stations/:id/attractions` (any signed-in user, guests included). Response merges:
  1. curated rows from the `Destinations` table (`nearest_station_id`), marked **On file**, and
  2. AI-generated suggestions from Gemini (`name, category, distance_km, description`, max 8), cached per station in `attractions_cache.json` so repeat clicks are instant. Admins can force a refresh with `?refresh=1`.
- **Requires** `GEMINI_API_KEY` on the API host (free key: [Google AI Studio](https://aistudio.google.com/apikey)). Without a key the card shows curated rows only, or a friendly "not configured" note — nothing breaks.

---

## Per-date demand forecast CSV

Every training run also trains a small **date-level model** on the daily totals of the combined `train/ets_YYYY.csv` datasets and writes **`ml/predictions_by_date.csv`** — one row per calendar date in the dataset:

```csv
date,actual_ridership,predicted_ridership,error,demand_level
2026-09-29,13612,14174,562,Very High
```

- The file is **rewritten on every retrain**, so new training data produces new predictions.
- The route-level thresholds (50/100/250) do not apply to daily totals, so the per-date `demand_level` uses the **quartiles of the actual daily totals** in the training data (Low ≤ Q1, Medium ≤ Q2, High ≤ Q3, otherwise Very High). The exact bands are written into `model_metadata.json` under `daily.thresholds` and shown in Admin → Model.
- Admin → Model shows the **Per-Date Demand Forecast** panel (latest 12 dates + bands + forecast MAE) and a **Download CSV** button. API: `GET /api/admin/predictions.csv` (download) and `GET /api/admin/predictions/summary` (preview), both admin-only.
- The model used for this (`ml/model_daily.pkl`) is separate from the route model; `/api/predict` and the search flow are untouched.
- Both artifacts are gitignored runtime outputs and, like `model.pkl`, need a persistent disk on the API host to survive redeploys.

---

## Deployment

The app has two pieces, because the API spawns Python (`ml/predict.py`), retrains models (`ml/train.py`) and keeps `ml/model.pkl` (~143 MB) plus `train/` / `historical/` CSVs on disk. Vercel/Netlify serverless functions cannot do that.

| Piece | Host | Serves |
|---|---|---|
| SPA | Vercel | `dist/` only — its rewrites deliberately exclude `/api` |
| API | Render / Railway / Fly (Docker) | Express routes, Python inference, retraining, Google bridge |

> **The Vercel site by itself cannot sign anyone in** — password or Google. Every `/api/...` request on the Vercel domain returns a plain 404 until `VITE_API_BASE_URL` points at a running API host.

### 1. API host — Render (one click)

`render.yaml` and `Dockerfile` are ready for this repo. The Dockerfile installs Node 20 plus Python 3 with the pinned ML dependencies from `ml/requirements.txt`, because `src/lib/predictor.ts` shells out to `python`.

1. Push the repo to GitHub (already `Nisriza/ETSYSTEM`).
2. Render Dashboard → **New +** → **Blueprint** → pick this repo → **Apply**. This creates the web service, the `/api/health` probe and the environment-variable slots.
3. Fill in the values it prompts for:
   - `SUPABASE_URL` — `https://<project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API → `service_role`
   - `SUPABASE_ANON_KEY` — Supabase → Settings → API → `anon public`
   - `GEMINI_API_KEY` is optional; add it later under **Environment** to enable live AI attraction suggestions.
4. When the deploy is live, confirm:
   ```text
   GET https://<service>.onrender.com/api/health        -> {"ok":true,...}
   GET https://<service>.onrender.com/api/auth/config   -> googleSignIn.enabled = true
   ```
5. Copy the service URL — the SPA needs it in step 2.

Already on Railway or Fly? Deploy the same `Dockerfile`, set the same variables plus `CORS_ORIGINS`, and expose the injected `PORT`.

Free-plan notes: the Render service sleeps after ~15 minutes idle (the next request takes ~30–60 s), and the container filesystem is ephemeral — uploaded CSVs and retrained `ml/*.pkl` reset on redeploy/restart. The committed `train/` CSVs and `ml/model.pkl` come back with every deploy. Attach a Render disk (paid) if uploads must survive.

### 2. Frontend — Vercel

`vercel.json` builds only the SPA (`npx vite build` → `dist`) and rewrites unknown paths to `index.html` (excluding `/api`). Cache headers keep hashed assets immutable while `sw.js` / `index.html` stay revalidated.

Set in **Project → Settings → Environment Variables** (Production, and Preview if used):

```text
VITE_API_BASE_URL=https://<service>.onrender.com
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

Then **Redeploy with a rebuild** — Vite bakes `VITE_*` values into the bundle at build time, so changing them without rebuilding changes nothing. The two `VITE_SUPABASE_*` values are optional (the SPA can read them from `GET /api/auth/config`), but setting them removes one network round-trip. Google OAuth returns to the language the user started from (`/` or `/bm`), so both URLs must be allowlisted in Supabase.

If the Vercel project belongs to a team you cannot open (the dashboard shows **You Need Access**), you do not need the dashboard: pushing to `main` still rebuilds the site. In that case edit the committed fallback in `src/lib/api.ts` — `PRODUCTION_API_FALLBACK` — to your API URL and push. The public site (`https://etsystem-zeta.vercel.app`) keeps working; only the internal `*.vercel.app` deployment URL is protected.

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
  requirements.txt            Pinned Python deps installed by the Dockerfile
Dockerfile                    Node 20 + Python 3 image for the API host
render.yaml                   Render Blueprint (one-click API deploy)
.dockerignore                 Keeps node_modules/dist/.env out of the image
public/icons/                 Generated PWA icons
supabase_schema.sql           Fresh schema + seed data (the only SQL file to run)
vite.config.ts                Vite + VitePWA configuration
vercel.json                   SPA hosting config for the Vercel frontend
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Supabase is not configured` | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` missing from `.env.local` |
| **"Google sign-in is not configured / the server has no Supabase credentials"** | The SPA cannot reach an API host, so it has nowhere to get the public Supabase credentials or exchange the Google session. Deploy the API (README → Deployment, step 1), set `VITE_API_BASE_URL` on Vercel (step 2) and **redeploy with a rebuild**. Check `GET https://<api-host>/api/health` first |
| **"Network error. Please try again."** on the deployed site (guest *and* normal login) | Same root cause: `VITE_API_BASE_URL` was empty at build time, so `/api/...` hits Vercel and returns a plain-text 404. Set it on Vercel and **redeploy with a rebuild** |
| `GET/POST https://<vercel-app>/api/...` returns `404 text/plain` | Same cause: Vercel only hosts the SPA. Deploy the Express/Python API to Render/Railway/Fly and point `VITE_API_BASE_URL` at it |
| Health check fails / deploy never goes live | `GET https://<api-host>/api/health` must return `{"ok":true,...}`. Check the Render build log for the Python install step and that `PORT` is not hard-coded anywhere |
| Google button missing in production | Set `SUPABASE_URL` + `SUPABASE_ANON_KEY` on the API host, or `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` on Vercel (then rebuild) |
| Google button appears only in one language / one page shows an old app | A stale PWA worker is serving an old cached `/` shell. Reload once (the new worker replaces itself), or clear site data. The versioned SW registration in `src/main.tsx` prevents it recurring |
| `Database schema missing` on Google login | Run `supabase_schema.sql` in the new Supabase project |
| Tutorial never opens automatically | Check `Users.login_count` is not `null`; `supabase_schema.sql` sets it to `0` for the seed accounts. Users can still open it from **Help** |
| Tutorial reopens on every refresh | The per-session guard only lasts for the tab session. Close/skip the tutorial once so `tutorial_completed` is stored (this now sends the bearer token) |
| Install button shows instructions instead of a prompt | Expected on iOS/iPadOS/Safari and other non-Chromium browsers. Chromium on `https://`/`localhost` shows the native prompt when the app is installable |
| Holidays list empty | Admin → Holidays → **Sync … Holidays**, or check that the `Holidays` table has rows |
| `redirect_uri_mismatch` from Google | The Google client's redirect URI must be `https://<ref>.supabase.co/auth/v1/callback` |
| Google sign-in returns to the app but shows "did not finish" | Supabase → Auth → URL Configuration must list `https://etsystem-zeta.vercel.app` and `/bm`; the API host needs `SUPABASE_URL` + `SUPABASE_ANON_KEY` for `POST /api/auth/supabase`. Check the browser console for the `[auth]` line and the API terminal for the real reason |
| An old bundle keeps loading after a fix (PWA / hard refresh not enough) | Open the app with **`?reset=1`** (e.g. `http://localhost:3000/?reset=1`). It unregisters service workers, clears Cache Storage and reloads clean |
| API calls fail only on the deployed site | `VITE_API_BASE_URL` wrong, or the API host's `CORS_ORIGINS` does not include the Vercel origin |
| Predictions fall back to statistics | Python or `ml/model.pkl` unavailable on the API host |
