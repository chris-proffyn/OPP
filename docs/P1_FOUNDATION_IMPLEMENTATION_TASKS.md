# P1 — Foundation: Implementation Tasks

**Document Type:** Implementation plan (Phase 1)  
**Project:** OPP Darts Training Platform  
**Spec reference:** `docs/P1_FOUNDATION_DOMAIN.md`  
**Status:** Not started

---

## 1. Migrations and schema

- [x] **1.1** Create migration file in `supabase/migrations/` (Supabase timestamp naming, e.g. `YYYYMMDDHHMMSS_create_players.sql`).
- [x] **1.2** In migration: create `players` table with all columns per domain §4.2 (`id`, `user_id`, `nickname`, `display_name`, `email`, `gender`, `age_range`, `baseline_rating`, `training_rating`, `match_rating`, `player_rating`, `date_joined`, `role`, `created_at`, `updated_at`); constraints (PRIMARY KEY, UNIQUE user_id, FK to auth.users ON DELETE CASCADE, CHECKs for gender and role). (Later migration adds `nickname`; display_name kept for backward compatibility.)
- [x] **1.3** In migration: add trigger on `players` to set `updated_at = now()` on BEFORE UPDATE.
- [x] **1.4** In migration: enable RLS on `players`.
- [x] **1.5** In migration: add RLS policies `players_select_own`, `players_update_own`, `players_insert_own`, `players_select_admin`, `players_update_admin` per domain §5.2 (admin condition: EXISTS subquery on current user’s role).
- [x] **1.6** In migration: add index on `players(role)` for admin list queries.
- [x] **1.7** Apply migration to Supabase project (local or linked); verify table and policies exist.
- [x] **1.8** (Optional) Add seed script or document in README: how to create first admin (e.g. sign up a user, then run SQL or seed to set `role = 'admin'` for that user’s `user_id`).

---

## 2. Data access layer (`packages/data`)

- [x] **2.1** Add `getCurrentPlayer(client)`: query `players` where `user_id = auth.uid()`; return single row or null; no Supabase types in return type (use plain object/interface).
- [x] **2.2** Add `createPlayer(client, payload)`: insert into `players` with `user_id` from session, `nickname` (and `display_name` = nickname), `email`, optional `full_name`, `gender`, `age_range`; return created row; catch UNIQUE violation and throw clear error (e.g. “Profile already exists”).
- [x] **2.3** Add `updatePlayer(client, payload)`: update `players` where `user_id = auth.uid()` with only allowed fields (`nickname`, `email`, `full_name`, `gender`, `age_range`); return updated row; throw on not found or error.
- [x] **2.4** Add `listPlayers(client)`: call `getCurrentPlayer`; if not admin, throw or return error; if admin, select all players (id, nickname, display_name, email, role, date_joined, rating columns) and return array.
- [x] **2.5** Add `getPlayerById(client, playerId)`: single select by id; RLS enforces own row or admin; return row or null/throw; document that RLS handles “other player” denial.
- [x] **2.6** Ensure all functions accept Supabase client (from app); no direct `createClient` inside these functions unless agreed. Map Supabase errors to clear error types; no raw stack to callers; no secrets in logs.
- [x] **2.7** Export a shared TypeScript type/interface for `Player` (matches table columns) from `packages/data` for use by apps.

---

## 3. Auth client and route guard (web app)

- [x] **3.1** Ensure Supabase client is created once (e.g. from `VITE_SUPABASE_*` env) and provided to app (context or dependency injection).
- [x] **3.2** Add auth state: subscribe to `onAuthStateChange` (or equivalent); expose in app state or context: `user` (or null), `loading`, `error`.
- [x] **3.3** Add “auth guard” for routes that require login: if not authenticated, redirect to `/sign-in` (or public home). Apply to `/onboarding`, `/home`, `/profile`, `/admin` and children.
- [x] **3.4** Add “player guard”: after auth, if authenticated and no player row (call `getCurrentPlayer`), redirect to `/onboarding`; if player exists, allow access to `/home`, `/profile`; do not redirect to onboarding for `/sign-in`, `/sign-up`, `/forgot-password`.
- [x] **3.5** Add “admin guard” for `/admin/*`: if authenticated and player exists but `role !== 'admin'`, redirect to “Not authorised” or `/home`. If admin, allow access.

---

## 4. Auth pages (public)

- [x] **4.1** **Sign-up page** (`/sign-up`): form with email, password, (optional) confirm password; client-side validation (non-empty, min length, match); submit via Supabase `signUp`; on success show “Check your email to verify” or redirect to verification prompt; on error show user-friendly message (e.g. “Email already in use”, “Password too short”).
- [x] **4.2** **Sign-in page** (`/sign-in`): form with email, password; submit via Supabase `signInWithPassword`; on success redirect to app (player guard will send to onboarding or home); on error show message (e.g. “Invalid credentials”, “Email not verified”).
- [x] **4.3** **Sign-out**: button/link that calls Supabase `signOut` and redirects to `/` or `/sign-in`; available on all authenticated layouts.
- [x] **4.4** **Forgot-password** (`/forgot-password`): form with email; call `resetPasswordForEmail`; show “Check your email for reset link”. Document or link to Supabase reset URL behaviour (redirect URL config).
- [x] **4.5** **Reset-password** (path per Supabase, e.g. `/reset-password` or callback): page where user sets new password after following email link; use Supabase API to update password; then redirect to sign-in.
- [x] **4.6** **Landing/root** (`/`): if unauthenticated show link to sign-in/sign-up; if authenticated redirect to home/onboarding per player guard.
- [x] **4.7** **Password show toggle:** On sign-in, sign-up, and reset-password pages, add a control (e.g. button or icon) next to each password field to toggle visibility (type=password ↔ type=text) so users can verify what they entered.

---

## 5. Onboarding (complete profile)

- [x] **5.1** **Onboarding page** (`/onboarding`): shown only when authenticated and no player row. Form: `nickname` (required), `email` (required), `full_name` (optional), `gender` (optional), `age_range` (optional). Submit calls `createPlayer` with Supabase client.
- [x] **5.2** On success: redirect to `/home` (or `/dashboard`). On failure (e.g. unique violation): show “You already have a profile” and redirect to `/home`; on other errors show message and allow retry.
- [x] **5.3** Client-side validation: non-empty nickname and email; basic email format. Do not allow submit until required fields valid.

---

## 6. App shell and guarded home

- [x] **6.1** **Authenticated layout**: shell that shows sign-out and nav (e.g. Home, Profile; Admin link only if `player.role === 'admin'`). Renders outlet for child routes.
- [x] **6.2** **Home/dashboard placeholder** (`/home` or `/dashboard`): simple “Welcome” or “Dashboard” placeholder; no cohort/session data yet. Ensure only reachable when authenticated and player exists.

---

## 6A. Navigation (implementation checklist)

Per domain §8.1. Verify or implement the following:

- [x] **6A.1** Main app: authenticated layout includes a **persistent navigation element** (e.g. top bar or horizontal nav) visible on `/home`, `/profile`, and any child routes of that layout.
- [x] **6A.2** Main app nav includes: **Home** (→ `/home`), **Profile** (→ `/profile`), **Admin** (→ `/admin`) shown only when `player.role === 'admin'`, **Sign out** (action that signs out and redirects).
- [x] **6A.3** Main app nav does **not** appear on public pages (`/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`). It **does** appear on `/onboarding` so authenticated users always see the nav (and can sign out).
- [x] **6A.4** Admin area: layout includes a **persistent navigation element** (e.g. sidebar or nav) visible on all routes under `/admin`.
- [x] **6A.5** Admin nav includes: **Dashboard** (→ `/admin`), **Players** (→ `/admin/players`), **App** (or equivalent link back to main app, e.g. `/home`), **Sign out**.
- [x] **6A.6** Every page that uses the authenticated layout or admin layout shows the corresponding nav; no full-screen pages without a way to navigate or sign out.

---

## 7. Profile (view and edit)

- [x] **7.1** **Profile view** (`/profile`): load current player via `getCurrentPlayer`; display nickname, full name (if set), email, gender, age_range, date_joined; show ratings as “—” or “Not set” (P1). Read-only view with “Edit” action.
- [x] **7.2** **Profile edit**: form (same fields as onboarding: nickname, email, full name (optional), gender, age_range); submit calls `updatePlayer` with only those fields; success message and stay on profile or redirect to profile view; validation as onboarding.
- [x] **7.3** Ensure profile and edit use only `packages/data` (no direct Supabase in UI).

---

## 8. Admin skeleton

- [x] **8.1** **Admin layout** (`/admin`): layout with sidebar/nav: “Dashboard”, “Players”; content area for child routes. Only rendered when admin guard passes; otherwise redirect.
- [x] **8.2** **Admin dashboard** (`/admin` or `/admin/dashboard`): placeholder text, e.g. “Admin dashboard – more sections in later phases.”
- [x] **8.3** **Admin players list** (`/admin/players`): call `listPlayers`; render table or list with at least nickname (display name), email, date_joined, role; add “View” link per player to `/admin/players/:id`.
- [x] **8.4** **Admin view one player** (`/admin/players/:id`): call `getPlayerById(client, id)`; display same fields as profile view (read-only); no edit/delete in P1.
- [x] **8.5** Hide “Admin” nav/link in main app when `player.role !== 'admin'`; show when admin. Enforcement remains RLS and data layer.

---

## 9. Documentation and cleanup

- [x] **9.1** Document in README or `docs/`: how to run migrations; how to create first admin (sign up then set role via SQL/seed); env vars required (already in `.env.example`).
- [x] **9.2** Remove or update any placeholder content in web app that contradicts P1 (e.g. old “OPP — Darts Training” home text can become “Welcome” + nav).
- [x] **9.3** Ensure no UI code imports Supabase client directly for data; only auth and `packages/data` use Supabase.

---

## 10. Test plan

Full checklist and RLS steps: **`docs/P1_TEST_PLAN.md`**.

### 10.1 Unit tests (data layer)

- [x] **10.1.1** `getCurrentPlayer`: with mocked client that returns one row → returns that row; with mocked client that returns empty → returns null.
- [x] **10.1.2** `createPlayer`: with valid payload and mocked successful insert → returns created row shape; with mocked UNIQUE violation → throws/returns clear error.
- [x] **10.1.3** `updatePlayer`: with valid payload and mocked successful update → returns updated row; with mocked no rows updated → throw/return not found.
- [x] **10.1.4** `listPlayers`: with mocked getCurrentPlayer returning admin → list returns; with mocked getCurrentPlayer returning non-admin → throws/returns forbidden.
- [x] **10.1.5** `getPlayerById`: with mocked client returning row for same user or admin → returns row; document RLS behaviour or mock RLS-denied as empty → null/throw.

### 10.2 Integration / RLS (if feasible)

- [x] **10.2.1** If local Supabase or test DB available: create two users; create player for user A; assert user A can read/update own row only; assert user B cannot read A’s row; create admin player for user B; assert B can list all and read A.
- [x] **10.2.2** If not feasible: document “RLS verified manually” and steps (e.g. two browser users, try cross-access).

### 10.3 Manual testing flows

See **`docs/P1_TEST_PLAN.md`** for the checklist. Tick there when executed.

- [x] **10.3.1** Sign up → receive (or mock) verification → sign in → redirect to onboarding → complete profile → redirect to home → view profile → edit profile → sign out.
- [x] **10.3.2** Sign in → forgot password → receive link → set new password → sign in with new password.
- [x] **10.3.3** As non-admin: open `/admin` → redirect to not authorised or home.
- [x] **10.3.4** As admin: open `/admin` → see layout → open Players → see list → open one player → see read-only profile.
- [x] **10.3.5** Unauthenticated: open `/profile` or `/home` → redirect to sign-in.

### 10.4 Negative / edge-case tests

See **`docs/P1_TEST_PLAN.md`** for the checklist. Tick there when executed.

- [ ] **10.4.1** Submit onboarding twice (e.g. double-click or second tab): one succeeds, one gets friendly “already have a profile” handling and redirect.
- [ ] **10.4.2** Profile edit with invalid email format: client validation prevents submit or show error.
- [x] **10.4.3** Sign in with wrong password: clear error message, no crash.
- [ ] **10.4.4** Expired or invalid session: guard redirects to sign-in, no crash.

---

## 11. Spec verification

- [x] **11.1** Review all implemented code against `P1_FOUNDATION_DOMAIN.md`: auth flows (§3), players schema (§4), RLS policies (§5), data layer functions (§6), admin behaviour (§7), routes and profile/onboarding (§8), migrations (§9).
- [x] **11.2** Confirm no P2+ scope: no schedules, sessions, routines, cohorts, calendar, scores, or match tables; no dashboard analytics or analyzer.
- [x] **11.3** If any behaviour was changed during implementation (e.g. column name, policy name, route path), update `P1_FOUNDATION_DOMAIN.md` with a short “Deviations / clarifications” note and document version, or add to this implementation doc and tick below.
- [x] **11.4** Update `PROJECT_STATUS_TRACKER.md`: mark P1 — Foundation phase checkbox complete; add brief “P1 delivered” note in Completed section.

---

## Progress summary

| Section | Tasks | Done |
|---------|-------|------|
| 1. Migrations | 8 | 8 |
| 2. Data layer | 7 | 7 |
| 3. Auth guard | 5 | 5 |
| 4. Auth pages | 6 | 6 |
| 5. Onboarding | 3 | 3 |
| 6. App shell / home | 2 | 2 |
| 6A. Navigation | 6 | 6 |
| 7. Profile | 3 | 3 |
| 8. Admin skeleton | 5 | 5 |
| 9. Docs / cleanup | 3 | 3 |
| 10. Test plan | — | 6 |
| 11. Spec verification | 4 | 4 |

**Execution rule:** One task (or sub-task) at a time; mark checkbox when done; run relevant tests before moving on.
