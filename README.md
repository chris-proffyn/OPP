# OPP — Darts Training Platform

Proffyn Rapid Solution Delivery (RSD) project. OPP is the Darts Training Platform.

## Repository structure

- **`docs/`** — Governance, product briefs, RSD foundational docs, and project status. Start with `docs/NEW_CHAT.md` and `docs/PROJECT_STATUS_TRACKER.md`.
- **`apps/web`** — Web application (Vite + React, Netlify target).
- **`apps/mobile`** — Mobile application (iOS / Android); stub for now.
- **`packages/ui`** — Shared UI components and design system.
- **`packages/data`** — Data-access layer and Supabase wrappers.
- **`packages/utils`** — Shared utilities and helpers.
- **`supabase/`** — Migrations and seed data.

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
   - Add your **Supabase anon key** to `.env`: Supabase Dashboard → Project Settings → API → Project API keys → **anon public**.
   - The Supabase URL is already in `.env.example` (OPP project).

3. **Run the web app**
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:5173`.

4. **Scripts**
   | Command | Description |
   |--------|-------------|
   | `npm run dev` | Start web app dev server |
   | `npm run build` | Build all workspaces (web app output in `apps/web/dist`) |
   | `npm run lint` | Run ESLint |
   | `npm run lint:fix` | ESLint with auto-fix |
   | `npm run format` | Format code with Prettier |
   | `npm run format:check` | Check formatting |
   | `npm run test` | Run Jest tests |

5. **CI (GitHub Actions)**  
   On push/PR to `main` (or `master`): install, lint, format check, test, build web app.  
   For the build step to use real Supabase config in CI, add repository secrets in GitHub: **Settings → Secrets and variables → Actions** → `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If not set, the workflow still runs but the built app will have empty Supabase env at build time.

## Rules and bootstrap

- Cursor and contributors must follow **`/.cursorrules`** and the mandatory reading order defined there.
- Project initialisation: **`docs/RSD_PROJECT_BOOTSTRAP.md`**.
- Current status: **`docs/PROJECT_STATUS_TRACKER.md`**.
- Dev environment checklist: **`docs/DEV_ENVIRONMENT_CHECKLIST.md`**.
