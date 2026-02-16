# P1 — Foundation: Domain Document

**Document Type:** Domain specification (Phase 1)  
**Project:** OPP Darts Training Platform  
**Audience:** Delivery team, Cursor  
**Status:** v1.1  
**Authority:** Defines all required behaviour for Phase 1 (Foundation). Implementation must conform to this document.

---

## 1. Purpose and scope

### 1.1 Purpose

This document describes **every behaviour required for Phase 1 — Foundation** so that:

- Implementers can build without ambiguity.
- Acceptance criteria are testable.
- Scope does not creep into P2–P8.

### 1.2 Phase 1 objectives (from PRD)

- **Data model:** Core schema for identity and players; migrations; RLS.
- **Auth:** Users can register, sign in, verify email, reset password; session handling.
- **Player profile:** Create and maintain player record linked to auth; CRUD within rules.
- **Admin skeleton:** Admin area with login and role check; placeholder pages; no full CRUD yet.

### 1.3 Out of scope for P1

- Training content (schedules, sessions, routines, level requirements) — P2.
- Cohorts, calendar, player_calendar — P3.
- Game Engine, score capture, ratings calculation — P4+.
- Dashboard UI (beyond minimal “logged in” state), Performance Analyzer — P6.
- Any table or feature not explicitly listed below.

---

## 2. References

- **PRODUCT_REQUIREMENTS.md** — FR-1.1–FR-1.4 (Identity and players); NFRs.
- **OPP Platform.md** — Players table description and example.
- **RSD_DATA_MODELLING_GUIDE.md** — UUIDs, timestamps, RLS, naming.
- **RSD_SYSTEM_ARCHITECTURE.md** — Supabase Auth, RLS.
- **RSD_ADMIN_PORTAL_GUIDE.md** — Admin principles, separation, role-based access.

---

## 3. Authentication (Supabase Auth)

### 3.1 Supported flows

| Flow | Required | Behaviour |
|------|----------|-----------|
| **Sign up** | Yes | Email + password. Supabase Auth signUp. Email verification enabled (link or OTP per Supabase config). |
| **Sign in** | Yes | Email + password. Supabase Auth signInWithPassword. Session persisted (Supabase client handles refresh). |
| **Sign out** | Yes | Supabase Auth signOut. Client clears session and redirects as needed. |
| **Email verification** | Yes | Required before full access (Supabase: confirm sign up / verify email). Behaviour per Supabase docs; no custom verification logic in P1. |
| **Password reset** | Yes | “Forgot password” flow: request reset (Supabase resetPasswordForEmail); user follows email link and sets new password. |
| **Social / OAuth** | No | Not in P1. |

### 3.2 Session and identity

- **Identity:** `auth.uid()` is the canonical user id (UUID from `auth.users`).
- **Session:** Managed by Supabase client (JWT, refresh). App must: (1) initialise Supabase client with anon key and URL; (2) expose session state (e.g. user, loading, error) to UI; (3) protect routes so unauthenticated users are redirected to sign-in or public landing.
- **Persistence:** Supabase client persists session (e.g. local storage) per its config. No custom token storage in P1.

### 3.3 Auth UX requirements

- **Sign-up page:** Email, password, (optional) confirm password; submit; clear error if sign-up fails (e.g. email already in use, weak password); after success, show “check your email to verify” or redirect to verification prompt.
- **Sign-in page:** Email, password; submit; clear error on failure (e.g. invalid credentials, email not verified); on success, redirect to app home or dashboard placeholder.
- **Sign-out:** Single action (button/link); sign out then redirect to public/home or sign-in.
- **Password reset:** Entry point (e.g. “Forgot password?”); collect email; send reset link; show confirmation. Reset link opens Supabase-hosted or app-hosted page where user sets new password (Supabase behaviour).
- **Guarded routes:** Any route that requires a logged-in user must redirect to sign-in when `auth.getUser()` (or equivalent) indicates no session. Optionally, redirect unverified users to a “verify email” screen until verified.

### 3.4 Errors and validation

- Display Supabase auth errors in user-friendly form (e.g. “Email not confirmed”, “Invalid login”, “Password too short”). No raw stack traces or internal codes to the user.
- Client-side validation: non-empty email, password minimum length per Supabase (default 6); optional strength hint. Server-side rules (Supabase) remain authoritative.

---

## 4. Data model: `players` table

### 4.1 Intent

- One **player** per auth user. Player row is created when the user first completes their profile (not automatically on sign-up).
- `auth.uid()` links to the player via a dedicated column. All RLS and app logic use this link.

### 4.2 Schema

Table name: **`players`** (plural, snake_case per RSD).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key. Use for all internal and API references. |
| `user_id` | `uuid` | NOT NULL, UNIQUE, REFERENCES auth.users(id) ON DELETE CASCADE | Links to Supabase Auth. One-to-one with auth user. |
| `display_name` | `text` | NOT NULL | Player nickname (e.g. “Barry26”). |
| `email` | `text` | NOT NULL | Contact email. Should match auth.users.email for consistency; updated on profile save if desired (see 5.2). |
| `gender` | `text` | NULL or CHECK (gender IN ('m','f','d')) | m = male, f = female, d = diverse. Optional in P1. |
| `age_range` | `text` | NULL or pattern e.g. '20-29','30-39','40-49','50-59','60+' | Decade or range. Optional in P1. |
| `baseline_rating` | `numeric` | NULL or numeric | BR; set by ITA in P5. P1: allow NULL. |
| `training_rating` | `numeric` | NULL or numeric | TR (current). P1: allow NULL; updated in P5. |
| `match_rating` | `numeric` | NULL or numeric | MR/OMR. P1: allow NULL; updated in P7. |
| `player_rating` | `numeric` | NULL or numeric | PR. P1: allow NULL; updated when formula is applied (P6/P7). |
| `date_joined` | `date` | NOT NULL, DEFAULT (current_date) | Date joined platform. Set on insert. |
| `role` | `text` | NOT NULL, DEFAULT 'player', CHECK (role IN ('player','admin')) | Used for admin access. Only 'player' and 'admin' in P1. |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Immutable. |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Updated on every row change (trigger). |

- **Indexes:** (1) Unique index on `user_id` (implied by UNIQUE); (2) index on `role` for admin “list all players” if needed.
- **updated_at:** Maintain via trigger: on UPDATE of `players`, set `updated_at = now()`.

### 4.3 Player creation and linking

- **When:** No automatic creation on sign-up. When the authenticated user first visits the app and **does not have a player row** (no row with `user_id = auth.uid()`), the app must show a **“Complete your profile”** (or onboarding) flow.
- **Flow:** User provides at least: `display_name`, `email`. Optionally: `gender`, `age_range`. On submit: insert one row into `players` with `user_id = auth.uid()`, `display_name`, `email`, and optional fields; `date_joined` = current date; `role` = 'player'; ratings NULL. Then redirect to app home/dashboard placeholder.
- **Uniqueness:** One player per `user_id`. Enforced by UNIQUE on `user_id`. Attempting to create a second player for the same `user_id` must be treated as an error (e.g. race condition); app should not offer “create profile” again if a row already exists.

### 4.4 Other tables in P1

- **No other application tables in P1.** No cohorts, schedules, sessions, routines, calendar, scores, or match tables. Only `players` and migrations that support it (e.g. `updated_at` trigger).

---

## 5. Row Level Security (RLS)

### 5.1 General

- RLS is **enabled** on `players`.
- Policies use `auth.uid()` for identity. No service role in client code.
- Default: **DENY** all. Allow only via explicit policies.

### 5.2 Policies for `players`

| Policy name (example) | Operation | Condition | Purpose |
|----------------------|-----------|-----------|---------|
| `players_select_own` | SELECT | `user_id = auth.uid()` | Player can read their own row. |
| `players_update_own` | UPDATE | `user_id = auth.uid()` | Player can update their own row (profile fields only; see 5.3). |
| `players_insert_own` | INSERT | `user_id = auth.uid()` | Player can insert one row when completing profile (user_id must equal auth.uid()). |
| `players_select_admin` | SELECT | Admin role (see below) | Admin can read all players. |
| `players_update_admin` | UPDATE | Admin role | Admin can update any player (e.g. for support; use sparingly). |

- **No DELETE** policy for players in P1 (no soft delete yet). If needed later, prefer soft delete.
- **Admin role:** Implement as a condition that checks the **current user’s** player row: `EXISTS (SELECT 1 FROM players WHERE user_id = auth.uid() AND role = 'admin')`. So only a user who has a `players` row with `role = 'admin'` can act as admin.

### 5.3 Allowed updates (player, own row)

- Player may update: `display_name`, `email`, `gender`, `age_range`. They must **not** be able to update: `user_id`, `id`, `role`, `baseline_rating`, `training_rating`, `match_rating`, `player_rating`, `date_joined`, `created_at`. `updated_at` is maintained by trigger.
- Enforce column-level restrictions either in RLS (e.g. no policy that allows updating `role`) or in application/data layer by only sending allowed columns. Prefer restricting in data layer so API is explicit.

### 5.4 Admin assignment

- First admin must be created outside the normal UI (e.g. direct SQL or a one-off migration/seed that sets `role = 'admin'` for a known `user_id`). No “self-register as admin” in the app. Document the step (e.g. “Run migration or seed to grant admin to user X”).

---

## 6. Data access layer (`packages/data`)

### 6.1 Rules

- UI and app code **must not** call Supabase (e.g. `supabase.from('players')`) directly. All access goes through `packages/data` functions that take a Supabase client (or create one from env) and perform the operation.
- All Supabase usage is in `packages/data`. Functions return plain data or throw/return errors; no Supabase types leak to UI.

### 6.2 Required functions (P1)

- **getCurrentPlayer(client)**  
  - Input: Supabase client (authenticated).  
  - Behaviour: Query `players` where `user_id = auth.uid()`; return single row or null.  
  - Used for: “Do I have a profile?”, “Show my profile”, “Am I admin?”.

- **createPlayer(client, payload)**  
  - Input: Supabase client (authenticated), `{ display_name, email, gender?, age_range? }`.  
  - Behaviour: Insert into `players` with `user_id = auth.uid()`, required and optional fields; return created row or throw.  
  - Used for: Onboarding “Complete your profile”.

- **updatePlayer(client, payload)**  
  - Input: Supabase client (authenticated), `{ display_name?, email?, gender?, age_range? }` (only allowed fields).  
  - Behaviour: Update `players` where `user_id = auth.uid()`; set only provided columns; return updated row or throw.  
  - Used for: Profile edit (player, own).

- **listPlayers(client)**  
  - Input: Supabase client (authenticated).  
  - Behaviour: Allowed only if current user is admin (check via getCurrentPlayer and role). If not admin, throw or return error. If admin, select all players (e.g. id, display_name, email, role, date_joined, ratings); return list.  
  - Used for: Admin placeholder “View players”.

- **getPlayerById(client, playerId)**  
  - Input: Supabase client (authenticated), player UUID.  
  - Behaviour: If requester is same player (`user_id = auth.uid()` and row id = playerId) or admin, return that player row; otherwise deny (RLS will enforce; app can also check after getCurrentPlayer).  
  - Used for: Admin “view one player” or self profile by id.

### 6.3 Errors

- Network/auth errors from Supabase must be caught and rethrown or returned as a clear error type (e.g. “Not found”, “Forbidden”, “Validation error”). No silent failures. Logging must not include secrets.

---

## 7. Admin skeleton

### 7.1 Definition

- **Admin area:** A distinct part of the app (e.g. routes under `/admin`) that is only accessible to users whose `players.role = 'admin'`.
- **Placeholder pages:** Enough structure to prove access control and navigation; no full CRUD for other entities (those come in P2+).

### 7.2 Required behaviour

- **Route guard:** Access to `/admin` (and any child route) requires: (1) user is authenticated; (2) current player exists and `role === 'admin'`. If not, redirect to sign-in or to a “Not authorised” page.
- **Admin layout:** Simple layout for admin: e.g. sidebar or nav with “Players” (placeholder) and “Home” or “Dashboard”; content area for child routes.
- **Placeholder “Players” page:** List all players (call `listPlayers`). Display at least: display_name, email, date_joined, role. No edit/delete in P1 unless explicitly required (PRD says “View” for admin player profiles). So: list + optional “View” link that shows one player’s profile (read-only) using `getPlayerById`.
- **Admin “Dashboard” or “Home”:** Placeholder text, e.g. “Admin dashboard – more sections in later phases.”
- **No other admin CRUD** in P1 (no calendars, schedules, cohorts, etc.).

### 7.3 Security

- Admin check must be done server-side or via RLS; listing players already fails for non-admins at the DB layer. UI should also hide admin nav/links if the user is not admin, but the real enforcement is RLS and data-layer checks.

---

## 8. Application structure (web app)

### 8.1 Navigation

The app must provide a **persistent navigation element** so users can move between main areas without using the browser back button or typing URLs.

- **Main app (authenticated shell):** For all authenticated player routes (`/home`, `/profile`, and any child routes of the authenticated layout), a **navigation element** (e.g. top bar or horizontal nav) must be visible and include:
  - **Home** — links to `/home`.
  - **Profile** — links to `/profile`.
  - **Admin** — links to `/admin`; shown **only** when the current player has `role === 'admin'` (hidden for non-admins). Enforcement of access remains RLS and the admin guard; hiding the link is UX only.
  - **Sign out** — action that signs the user out and redirects to sign-in or landing.
- The main-app navigation must **not** appear on public pages (landing, sign-in, sign-up, forgot-password, reset-password). It **must** appear on the onboarding page as well as on home and profile, so that authenticated users always see the same nav (and can sign out or navigate once they have a player).
- **Admin area:** For all routes under `/admin`, a **navigation element** (e.g. sidebar or nav) must be visible and include:
  - **Dashboard** — links to `/admin`.
  - **Players** — links to `/admin/players`.
  - **App** (or equivalent) — link back to the main app (e.g. `/home`) so the user can leave the admin area.
  - **Sign out** — same behaviour as above.
- Navigation must be present on every page where the respective layout is used (no full-screen pages without a way to navigate or sign out).

### 8.2 Routes (minimal)

- **Public:** `/` (landing or redirect); `/sign-in`; `/sign-up`; `/forgot-password`; reset password (path per Supabase or app).
- **Authenticated (any):** After sign-in, if no player row → redirect to `/onboarding` (complete profile). If player exists → redirect to `/home` or `/dashboard` (placeholder).
- **Authenticated (player):** `/home` or `/dashboard` (placeholder); `/profile` (view/edit own profile).
- **Authenticated (admin):** `/admin` (layout); `/admin/players` (list); `/admin/players/:id` (view one, read-only); `/admin` or `/admin/dashboard` (placeholder).

### 8.3 Profile (player)

- **View:** Show display_name, email, gender, age_range, date_joined. Ratings can be shown as “—” or “Not set” in P1.
- **Edit:** Form to update display_name, email, gender, age_range. Submit calls `updatePlayer`. Success message; stay on profile or redirect. Validation: display_name and email non-empty; email format basic check.

### 8.4 Onboarding

- Single step: collect display_name, email, gender (optional), age_range (optional). Submit → `createPlayer`; on success redirect to `/home` or `/dashboard`. On failure (e.g. duplicate), show error; do not create duplicate row.

---

## 9. Migrations and schema

### 9.1 Location and format

- All schema changes in **Supabase migrations** under `supabase/migrations/`.
- One migration per logical change set. Naming: `YYYYMMDDHHMMSS_description.sql` or similar (Supabase convention).
- No manual schema edits outside migrations.

### 9.2 P1 migrations (content)

1. **Create `players` table** with columns and constraints as in §4.2.
2. **Trigger for `updated_at`** on `players` (BEFORE UPDATE SET updated_at = now()).
3. **Enable RLS** on `players`.
4. **Policies** as in §5.2 (players_select_own, players_update_own, players_insert_own, players_select_admin, players_update_admin).
5. **Indexes** as needed (e.g. on `role` for admin list).
6. **Seed (optional):** No mandatory seed for P1. If desired, a separate seed file or migration can insert one admin player for a known `user_id` (e.g. from env or a placeholder UUID) for initial setup; document how to obtain that user_id (e.g. sign up first, then run seed with that id).

### 9.3 No auth schema changes

- Do not create or alter tables in `auth` schema. Use only `auth.uid()` and `auth.users` reference in `players.user_id`.

---

## 10. Testing requirements

### 10.1 Data layer

- **Unit tests** (Jest) for: getCurrentPlayer (mocked client returning row / null); createPlayer (mocked insert); updatePlayer (mocked update); listPlayers (admin vs non-admin behaviour); getPlayerById (own vs admin vs other).
- **RLS tests:** If Supabase test helpers or local Supabase are available, add tests that: authenticated user A can only read/update own row; admin can read all and update any; unauthenticated cannot read/insert/update. Otherwise document RLS as manually verified.

### 10.2 Auth flows

- Manual or E2E: sign up → verify (or mock) → sign in → redirect; sign out; password reset request and completion. Optional: automated E2E in later phase.

### 10.3 Acceptance criteria (summary)

- User can sign up, sign in, sign out, reset password.
- User without a player row is prompted to complete profile; after completion, one player row exists and user can access app.
- User can view and edit own profile (allowed fields only).
- Admin can access `/admin`, see player list, and view one player (read-only). Non-admin cannot access admin list or see other players’ data.
- No Supabase calls from UI; all via `packages/data`. RLS enabled; policies as specified.

---

## 11. Edge cases and validation

- **Duplicate profile creation:** If two requests create a profile for the same user (race), one will succeed and one will hit UNIQUE violation. Catch and show a friendly message (“You already have a profile”) and redirect to home.
- **Email change:** Allowed in profile. Consider whether to sync to `auth.users` (Supabase allows updateUser); P1 can leave auth email as-is and only store in `players.email` for display, or implement update – document choice.
- **Admin demotion:** If an admin’s `role` is changed to `player`, they lose admin access on next check. No special “revoke session” required in P1.
- **Deleted auth user:** If `auth.users` row is deleted (e.g. from Supabase dashboard), `ON DELETE CASCADE` on `user_id` removes the player row. No orphaned players.

---

## 12. Deviations / clarifications (implementation)

- **§5.2 Admin policies:** The domain specifies the admin condition as `EXISTS (SELECT 1 FROM players WHERE user_id = auth.uid() AND role = 'admin')`. Evaluating that subquery on `players` from within an RLS policy on `players` causes infinite recursion (Postgres error 42P17). The implementation therefore uses a **SECURITY DEFINER** function `public.current_user_is_players_admin()` that performs the same check; the policies use `USING (public.current_user_is_players_admin())`. Behaviour is unchanged: only users with a `players` row where `role = 'admin'` can use admin SELECT/UPDATE. See migration `20260216140000_fix_players_rls_infinite_recursion.sql`.

---

## 13. Document history

- **v1.0** — Initial domain document for P1 Foundation (auth, players table, RLS, data layer, admin skeleton).
- **v1.1** — §12 Deviations added: RLS admin policies implemented via SECURITY DEFINER helper to avoid recursion (P1 implementation complete).
