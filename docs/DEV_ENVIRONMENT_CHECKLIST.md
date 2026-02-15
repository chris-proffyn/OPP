# OPP — Development Environment Implementation Checklist

**Purpose:** Required steps to set up the local and CI development environment.  
**Prerequisites:** GitHub repo and Supabase project already created (connection details to be supplied when needed).  
**Status:** Complete.

---

## 1. Repository & source control

- [x] **1.1** Confirm GitHub remote is configured (`git remote -v`); add if missing.
- [x] **1.2** Add root **`.gitignore`** (Node, build outputs, env files, IDE, OS, Supabase local).
- [x] **1.3** Decide default branch name (`main` / `master`) and ensure local branch matches.
- [x] **1.4** (Optional) Document branch strategy in `docs/` or README if different from “main = deployable”.

---

## 2. Node & monorepo setup

- [x] **2.1** Choose package manager (npm / pnpm / yarn) and document in README.
- [x] **2.2** Add root **`package.json`** with workspace configuration for `apps/*` and `packages/*`.
- [x] **2.3** Add root **`package-lock.json`** (or equivalent) and commit; do not commit `node_modules/`.
- [x] **2.4** Confirm Node version (e.g. 20 LTS); add **`.nvmrc`** or **`engines`** in root `package.json`.

---

## 3. TypeScript & shared config

- [x] **3.1** Add root **`tsconfig.json`** (base config; strict mode, ES target appropriate for web/mobile).
- [x] **3.2** Add **`tsconfig.build.json`** or extend pattern for `packages/*` and `apps/*` as needed.
- [x] **3.3** Ensure `packages/ui`, `packages/data`, and `packages/utils` have valid `tsconfig.json` (extend root or reference).

---

## 4. Supabase connection & env

- [x] **4.1** Create **`.env.example`** at repo root (or per-app if preferred) with:
  - `SUPABASE_URL=` (placeholder)
  - `SUPABASE_ANON_KEY=` (placeholder)
  - Any other required vars (e.g. Resend for auth emails); no real secrets.
- [x] **4.2** Document in README or `docs/` where to get Supabase URL and anon key (dashboard).
- [x] **4.3** After receiving connection details: add **`.env`** locally (gitignored), run one sanity check (e.g. ping Supabase or run a minimal query via `packages/data` when it exists).
- [ ] **4.4** (Optional) Install and use Supabase CLI for local migrations; document in README if used.

---

## 5. Packages (shared code)

- [x] **5.1** **`packages/utils`**: Add `package.json`, minimal export (e.g. one util), TypeScript build or direct TS consumption by workspace.
- [x] **5.2** **`packages/data`**: Add `package.json`, Supabase client factory using `SUPABASE_URL` and `SUPABASE_ANON_KEY` from env; no UI. Ensure env is read from a single place (e.g. root or app that pulls in `packages/data`).
- [x] **5.3** **`packages/ui`**: Add `package.json`, minimal shared component or stub; build step if needed for consumption by `apps/web` (and later `apps/mobile`).
- [x] **5.4** Wire workspace dependencies so `apps/web` (and later `apps/mobile`) can `import` from `@repo/utils`, `@repo/data`, `@repo/ui` (or chosen names).

---

## 6. Web app (`apps/web`)

- [x] **6.1** Initialise app (e.g. Vite + React, or Next.js) per RSD stack; mobile-first, Netlify deployable.
- [x] **6.2** Add `apps/web/package.json` and script: `build`, `dev`, `preview` (or equivalent).
- [x] **6.3** Configure app to load env (e.g. `VITE_*` for Vite) and pass Supabase config from env into `packages/data` client.
- [x] **6.4** Confirm app runs locally (`npm run dev` or equivalent) and can resolve `packages/ui` and `packages/data`.

---

## 7. Mobile app (`apps/mobile`)

- [x] **7.1** Initialise mobile app (e.g. React Native, Expo) per shared-codebase approach; defer if prioritising web first.
- [x] **7.2** Add `apps/mobile/package.json` and scripts; ensure it can depend on `packages/utils`, `packages/data`, `packages/ui` where applicable.
- [x] **7.3** Document how to run iOS/Android locally and how env (e.g. Supabase) is supplied.

---

## 8. Linting & formatting

- [x] **8.1** Add ESLint root config (and/or per package) covering `apps/*` and `packages/*`.
- [x] **8.2** Add Prettier (or equivalent) and ensure consistent formatting; add format script to root `package.json`.
- [x] **8.3** Add `lint` (and optionally `lint:fix`) script at root; run and fix any violations before marking done.

---

## 9. Testing (Jest)

- [x] **9.1** Add Jest at root or per package; RSD requires Jest for core modules and capabilities.
- [x] **9.2** Add root (or workspace) `jest.config` and ensure `packages/utils` (and later `packages/data`) have at least one runnable test.
- [x] **9.3** Add `test` script to root `package.json`; `npm run test` (or equivalent) passes.

---

## 10. CI (GitHub Actions)

- [x] **10.1** Add workflow under **`.github/workflows/`** (e.g. `ci.yml`): install deps, lint, test, build web app (and mobile if in scope).
- [x] **10.2** Use secrets for any CI-only env (e.g. Supabase anon key for build-time or E2E if needed); do not commit secrets.
- [x] **10.3** Ensure main branch (or PR target) runs the workflow; document in README how to see CI status.

---

## 11. Documentation & tracker

- [x] **11.1** Update **`README.md`** with: how to clone, install, set up env, run web (and mobile if applicable), run tests, run lint.
- [x] **11.2** Update **`docs/PROJECT_STATUS_TRACKER.md`** when dev environment is complete: mark “Development environment” as done and set next focus.

---

## When you need connection details

- **Supabase:** Required for steps **4.3** (local `.env`) and **5.2** (data client). Please provide:
  - **Project URL** (e.g. `https://xxxxx.supabase.co`)
  - **Anon (public) key** (safe for client-side; never the service_role key)
- **GitHub:** Only needed if the repo was cloned without the remote (step 1.1). If you already pushed from this machine, no further details needed.

---

## Summary

| Section              | Description                          |
|----------------------|--------------------------------------|
| 1. Repository        | Remote, .gitignore, branch            |
| 2. Node & monorepo   | Workspaces, package manager, Node version |
| 3. TypeScript        | Root and package tsconfigs           |
| 4. Supabase & env    | .env.example, .env (with your details) |
| 5. Packages          | utils, data, ui with deps             |
| 6. Web app           | Run locally, use packages & env       |
| 7. Mobile app        | Stub or full init (can defer)        |
| 8. Lint & format     | ESLint, Prettier, scripts             |
| 9. Jest              | Config and at least one passing test |
| 10. GitHub Actions   | Lint, test, build                    |
| 11. Docs             | README and status tracker            |

Complete these in order where possible; steps 4.3 and 5.2 depend on you supplying Supabase URL and anon key when ready.
