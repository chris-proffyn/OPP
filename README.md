# OPP — Darts Training Platform

Proffyn Rapid Solution Delivery (RSD) project. OPP is the Darts Training Platform.

## Repository structure

- **`docs/`** — Governance, product briefs, RSD foundational docs, and project status. Start with `docs/NEW_CHAT.md` and `docs/PROJECT_STATUS_TRACKER.md`.
- **`apps/web`** — Web application (Vite + React, Netlify target).
- **`apps/mobile`** — Mobile application (iOS / Android); stub for now.
- **`packages/ui`** — Shared UI components and design system.
- **`packages/data`** — Data-access layer and Supabase wrappers.
- **`packages/utils`** — Shared utilities and helpers.
- **`supabase/`** — Migrations and seed data. After running migrations, see **Creating the first admin** below to grant a user admin access.

**Architecture (P1–P7):** The web app must not call Supabase directly for data. Only the auth context (Supabase client for sign-in/sign-out and session) and **`packages/data`** use Supabase; the UI uses `@opp/data` and the shared Supabase client from context. P2 adds training content: **schedules**, **sessions**, **routines**, and **level requirements**. Admins manage these under `/admin/schedules`, `/admin/sessions`, `/admin/routines`, and `/admin/level-requirements` (list, create, edit, delete). **P3** adds **cohorts**, **calendar**, and **player_calendar**: admins manage cohorts and members under `/admin/cohorts`, generate calendar from a cohort’s schedule, and view calendar entries at `/admin/cohorts/:id/calendar`. **P4 — Game Engine core** adds the **play/training flow**: players see **Play** in the nav (authenticated, with a player profile). At **`/play`** they get a list of **all** sessions (from **getAllSessionsForPlayer**) with **Status** (Completed, Due, Future) and **Score** (session score % when completed); each row has **Start** or **View** → **`/play/session/:calendarId`**. On the game screen they start or resume a **session run**, work through routines and steps, enter dart results (hit/miss), and the app records **dart_scores**, **player_routine_scores**, and **session_runs.session_score**. **Level check** display shows the player’s level decade and expected target (e.g. 2/9 from level_requirements). **P5 — Training Rating** adds **CR (training_rating) progression** after each session (level change from session score %, clamp 1–99), **BR/ITA** (ITA session type, ITA score calculation, set baseline_rating/training_rating on ITA completion), and **TR** on the **dashboard (Home)** and in the **GE** (game screen and session-end summary). **P6 — Dashboard and Analyzer** upgrades **Home** into a **Dashboard**: profile, current cohort, next session, PR/TR/MR and **TR trend** (↑/→/↓ from last 4 session scores), and a link to **Performance** (**`/analyzer`**). The **Performance Analyzer** (Free tier) shows current TR, **session history** (session name, date, session score %, per-routine scores), and **basic trends** (e.g. session score and “Singles” routine average over the last 30 days). **Tier gating**: Free tier sees only last-30-day trends and session/routine scores; Gold/Platinum get match history. **P7 — Match Rating and competitions** adds **match capture** (Record match at `/play/record-match`: select opponent, format, legs won/lost, 3DA, doubles; recordMatch inserts two match rows and updates OMR/PR for both players), **MR/OMR/PR** (match_rating and player_rating populated; Dashboard shows next competition via getNextCompetitionForPlayer), and **admin competitions CRUD** at `/admin/competitions` (list, new, edit, delete, view matches per competition). No new env vars beyond P1 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## Development setup

**Prerequisites:** Node 20+ (see `.nvmrc`).

1. **Clone and install**
   ```bash
   git clone https://github.com/chris-proffyn/OPP.git
   cd OPP
   npm install
   ```
   If you already have the repo, ensure the GitHub remote is set:
   ```bash
   git remote add origin https://github.com/chris-proffyn/OPP.git   # only if missing
   ```

2. **Environment**
   - Copy `.env.example` to `.env`.
   - Set **Supabase** values in `.env`:
     - `VITE_SUPABASE_URL` — your project URL (see `.env.example`).
     - `VITE_SUPABASE_ANON_KEY` — anon public key from Supabase Dashboard → Project Settings → API → Project API keys.
   - The web app reads only these two; other env vars are optional (e.g. Resend for auth emails).

3. **Running migrations**
   - Apply the schema so `public.players`, P2 training tables (schedules, sessions, routines, schedule_entries, session_routines, routine_steps, level_requirements), P3 tables (cohorts, cohort_members, calendar, player_calendar), and RLS exist:
     - **Option A (Supabase CLI):** `supabase link --project-ref <your-project-ref>` then `supabase db push`. Migrations live in `supabase/migrations/`.
     - **Option B (Dashboard):** In Supabase Dashboard → SQL Editor, run the contents of each migration file in order (oldest timestamp first).

4. **Run the web app**
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:5173`.

5. **Scripts**
   | Command | Description |
   |--------|-------------|
   | `npm run dev` | Start web app dev server |
   | `npm run build` | Build all workspaces (web app output in `apps/web/dist`) |
   | `npm run lint` | Run ESLint |
   | `npm run lint:fix` | ESLint with auto-fix |
   | `npm run format` | Format code with Prettier |
   | `npm run format:check` | Check formatting |
   | `npm run test` | Run Jest tests |

6. **CI (GitHub Actions)**  
   On push/PR to `main` (or `master`): install, lint, format check, test, build web app.  
   For the build step to use real Supabase config in CI, add repository secrets in GitHub: **Settings → Secrets and variables → Actions** → `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If not set, the workflow still runs but the built app will have empty Supabase env at build time.

### Creating the first admin (P1 Foundation)

The app has an admin area (`/admin`) restricted to users whose `players.role` is `'admin'`. New users get `role = 'player'` when they complete their profile. To create the first admin:

1. Sign up and sign in once so a row exists in `public.players` (complete the “Complete your profile” step).
2. In the **Supabase Dashboard** → **SQL Editor**, run (replace with the admin’s email):
   ```sql
   UPDATE public.players SET role = 'admin'
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
   ```
3. Sign out and sign in again (or refresh); the Admin link will appear and `/admin` will be accessible.

### Password reset (Supabase)

The forgot-password flow sends a link to your app at `/reset-password`. In the **Supabase Dashboard** → **Authentication** → **URL Configuration**, add your app’s redirect URLs (e.g. `http://localhost:5173/reset-password` for local dev and your production origin).

## Rules and bootstrap

- Cursor and contributors must follow **`/.cursorrules`** and the mandatory reading order defined there.
- Project initialisation: **`docs/RSD_PROJECT_BOOTSTRAP.md`**.
- Current status: **`docs/PROJECT_STATUS_TRACKER.md`**.
- Dev environment checklist: **`docs/DEV_ENVIRONMENT_CHECKLIST.md`**.
