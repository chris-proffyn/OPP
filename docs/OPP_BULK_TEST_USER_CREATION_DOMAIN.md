# BULK_TEST_USER_CREATION_DOMAIN

## Purpose

Add an **admin-only** capability to OPP to automatically create **bulk test users** in Supabase Auth, using:

- Email format: `proffyndev+oppN@gmail.com` (Gmail plus-alias)
- Common password: `Pcpdev1^.` (exact string)
- Randomised (but realistic) user profile details
- Creation flow that **mimics real users** as closely as possible (auth user + profile + any onboarding defaults)

This document defines the behaviour, data, APIs, security, and implementation notes needed for Cursor to implement.


## Non‑Goals

- No public self-service “test user creation”
- No UI for changing password per user (single shared password only in v1)
- No email invitation flow (we bypass SMTP / verification)


## Definitions

- **Test user**: A Supabase Auth user + associated OPP profile records, flagged as test.
- **Bulk create job**: A single admin action that creates N new test users.
- **Seeded profile**: Randomised profile fields used by OPP (display name, avatar color, region, handedness, etc).


## Functional Requirements

### FR1 — Admin-only Bulk Creation
An authenticated admin can create test users in bulk via an **Admin UI** action. Non-admins must be blocked.

### FR2 — Deterministic Email Pattern
Admin provides:
- `base_email_pattern` fixed to: `proffyndev+opp{N}@gmail.com`

The system must:
- Choose integer `N` values sequentially, without collisions
- Create emails exactly in that format

### FR3 — Common Password
All created users must have password:
- `Pcpdev1^.`

### FR4 — Email Confirmation
Users must be created with **email confirmed** (no verification step required).

### FR5 — Randomised Profile Details
OPP must create realistic profile fields, randomised per user, including at minimum:
- `display_name` (human-looking; unique-ish)
- `avatar_color` (from OPP palette)
- `country` or `region` (UK default acceptable)
- `handedness` (R/L, optional)
- `is_test_user = true`
- `created_by_admin_id` (for traceability)

### FR6 — Mimic Real User Bootstrap
The bulk creation must execute the same “post-signup bootstrap” as real users, including:
- `profiles` row creation (if not done by DB trigger)
- Default user settings/preferences
- Any rating/level defaults required by OPP
- Any required relational records (e.g., player stats row)

### FR7 — Return Credentials Summary
After completion, the admin should see:
- Count created
- Range of Ns used (min/max)
- List of created emails (downloadable CSV optional)
- Password reminder (do not display password if you consider it sensitive; but you stated it is common and acceptable)

### FR8 — Safe Cleanup (Recommended)
Provide an admin-only action to delete test users created by this tool:
- By `job_id`, by N-range, or by `is_test_user=true`
- Must delete Auth user + cascade/cleanup OPP records


## UX Requirements (Admin UI)

Add an Admin page/section: **Test Users**

### UI Controls
- **Number to create** (integer, default 10, max 200)
- **Starting N** (optional; if blank, system auto-picks next available)
- **OPP level band** to assign (optional; default: 20)
- **Create** button
- Progress / status UI (created so far, errors)
- Results list with copy/download

### UI Copy
- Explain that emails are aliases under Gmail plus addressing
- Explain password is fixed
- Explain users are flagged as test and can be bulk-deleted


## System Architecture

### Important Security Principle
Creating Auth users requires the **Supabase Service Role key**. This key must never be exposed to the client.

Therefore implement creation server-side via one of:
- **Netlify Function** (recommended for your Netlify deployment)
- **Supabase Edge Function**
- A backend API route running in a trusted server environment

The frontend calls the server endpoint with admin credentials; server validates admin, then calls Supabase Admin API.

### Environment Variables
Server-side only (Netlify / Edge function env):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Client-side (already exists):
- `SUPABASE_ANON_KEY` (never used for bulk creation)


## Data Model Additions

### 1) Profiles Table Additions (if not already present)
In `public.profiles` (or equivalent):
- `is_test_user` (boolean, default false)
- `test_user_job_id` (uuid, nullable)
- `created_by_admin_id` (uuid, nullable)
- `test_user_seq_n` (int, nullable)  -- the N used in proffyndev+oppN@gmail.com

Indexes recommended:
- index on `is_test_user`
- index on `test_user_job_id`
- unique constraint on `test_user_seq_n` where not null (optional)

### 2) Test User Jobs (Recommended)
Create a table to track bulk runs:

`public.test_user_jobs`
- `id` (uuid, pk)
- `created_by_admin_id` (uuid)
- `created_at` (timestamptz)
- `requested_count` (int)
- `start_n` (int)
- `end_n` (int)
- `status` (text)  -- e.g., RUNNING, COMPLETED, FAILED, PARTIAL
- `created_count` (int)
- `error_count` (int)
- `errors_json` (jsonb)  -- store per-user failures
- `notes` (text, nullable)

### 3) Sequence Allocation Table (Optional but Robust)
To avoid races when multiple admins run jobs, create:

`public.test_user_seq`
- `key` (text pk)  -- e.g., 'opp'
- `next_n` (int not null)

Then allocate Ns atomically using SQL `update ... returning next_n`.

If you do not add this table, you must still implement collision-safe allocation by checking existing users and retrying.


## API Design

### Endpoint: Bulk Create
`POST /api/admin/test-users/bulk-create`

Request body:
- `count` (int, required, 1..200)
- `start_n` (int, optional)
- `default_opp_level` (int, optional)
- `job_notes` (string, optional)

Response:
- `job_id`
- `created_count`
- `errors` (array)
- `emails_created` (array of strings, optional if large)
- `start_n`, `end_n`

### Endpoint: Bulk Delete (Recommended)
`POST /api/admin/test-users/bulk-delete`

Request body (one of):
- `job_id`
- `n_range`: `{ "start_n": int, "end_n": int }`
- `delete_all_test_users`: true

Response:
- `deleted_count`
- `errors`


## Admin Validation and Authorization

The server endpoint must verify:
1. Caller is authenticated (valid JWT)
2. Caller is an OPP admin (your existing rule; examples):
   - `profiles.role == 'admin'`
   - or `user_type == 'moderator'` etc.

If not admin:
- Return 403

Also apply:
- Rate limit: e.g., max 200 created per request, and optionally max 500 per hour


## Bulk Create Algorithm (Detailed)

### Inputs
- `count`
- optional `start_n`
- fixed `email_template = proffyndev+opp{N}@gmail.com`
- fixed `password = Pcpdev1^.`

### Steps
1. Create `test_user_jobs` row with status RUNNING.
2. Determine allocation start N:
   - If `start_n` provided, use it.
   - Else allocate `count` Ns from `test_user_seq.next_n` atomically:
     - set `start_n = current_next_n`
     - set `end_n = start_n + count - 1`
     - update `next_n = end_n + 1`
3. For each N in [start_n..end_n]:
   - `email = proffyndev+opp{N}@gmail.com`
   - Call Supabase Admin create-user API using service role:
     - email
     - password
     - email_confirm: true
     - user_metadata: include `is_test_user=true`, `test_user_seq_n=N`, `test_user_job_id`
   - Bootstrap OPP records:
     - Ensure profile exists (insert if not created by trigger)
     - Set randomised profile fields (see next section)
     - Set `is_test_user=true`, `test_user_job_id`, `created_by_admin_id`, `test_user_seq_n`
     - Create any required dependent rows (player stats, settings, etc.)
4. Accumulate successes and per-user errors (do not stop the whole job unless critical).
5. Update `test_user_jobs` status:
   - COMPLETED if all ok
   - PARTIAL if some failures
   - FAILED if none created

### Collision Handling (Important)
Even with a sequence table, a collision can happen if:
- a previous user exists with the same email
- or if a job is rerun with same start_n

If create-user returns “user already exists”:
- If auto-allocation: skip to next N and extend end_n until count successes achieved (recommended), OR
- Record as failure and continue

Cursor should implement the “extend range until count successes” approach for robustness.


## Randomised Profile Details

### Data sources
Provide simple embedded lists (no external calls required):
- first names list
- last names list
- UK towns/regions list (optional)
- OPP palette colors list

### Generation rules
- `display_name = "{First} {Last}"` plus optional suffix if collision
- `avatar_color` random choice from palette
- `country = "UK"` default
- `region` random UK region or "Dev"
- `handedness` random: 85% R, 15% L (or 90/10)
- `opp_level` (optional): set from request `default_opp_level` or random within a band

Uniqueness:
- display_name does not need to be unique globally, but avoid duplicates within a single job if easy.

Persist:
- Store generated details in `profiles`.


## Mimicking Real Signup: Bootstrap Strategy

### Recommended approach
Implement a shared server-side function:
- `bootstrap_user(user_id, email, options)`

Used by:
- Real signup flow (if you have a server-side hook)
- Bulk test user creation

Bootstrap should:
- Create or update `profiles`
- Create any required app tables (settings, rating baseline, etc.)
- Ensure idempotency (safe to call twice)

If you already rely on a DB trigger (on `auth.users` insert) to create `profiles`:
- Keep it, but bulk tool must still set randomised fields afterwards.


## Scoping and Safety

### Production safeguards
- Only allow this tool in:
  - Development environment, OR
  - Production with strict admin permission and an explicit “I understand” checkbox

### Marking test users
Test users must be distinguishable everywhere:
- `profiles.is_test_user = true`
- `auth.users.user_metadata.is_test_user = true`

### Excluding from analytics
Any analytics queries should filter:
- `where is_test_user = false` by default


## Cleanup / Deletion Strategy

Bulk deletion must:
1. Select users to delete (by job id or is_test_user)
2. Delete app records (profiles, related rows) or rely on cascade if configured
3. Delete auth users using Admin API

Important:
- Deleting auth users does not automatically delete public tables unless you implement cascade/trigger cleanup.

Recommended:
- Add a DB trigger or a server-side cleanup routine to delete dependent records.

Track deletion results in a `test_user_jobs` note or separate delete job table if needed.


## Acceptance Criteria

### AC1 — Bulk create creates real login users
Created users:
- Exist in Supabase Auth
- Can log in with password `Pcpdev1^.`

### AC2 — Profiles are populated and flagged
Each created user has:
- `profiles.is_test_user = true`
- randomised `display_name` and `avatar_color`
- traceability fields populated

### AC3 — Job is tracked
A `test_user_jobs` row is created and correctly marked COMPLETED/PARTIAL.

### AC4 — Admin-only access enforced
Non-admin requests to endpoints are rejected with 403.

### AC5 — Collision-safe allocation
The system does not fail if an N already exists; it either retries/extends or records partial failures.

### AC6 — Cleanup works (if implemented)
Admin can delete all users created by a specific job, removing Auth users and public data.


## Implementation Notes for Cursor

- Use server-side Supabase client with service role key for Admin actions.
- Never expose service role key to browser code.
- Prefer idempotent bootstrap logic.
- Implement logging for:
  - created user id
  - email
  - job id
  - errors per user

## Security and logging (implemented)

Implemented per **OPP_BULK_TEST_USER_CREATION_IMPLEMENTATION_CHECKLIST.md** §15:

- **Service role:** Used only in Edge Functions; key from `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` (Supabase secrets). Never in frontend bundle or logs. `.env.example` states it is for Edge Functions only.
- **Logging:** Server-side JSON logs only: `bulk_create_job_start`, `bulk_create_n_allocated`, `bulk_create_user_created`, `bulk_create_user_error`, `bulk_create_job_done`. Fields: job_id, user_id, email, n on success; job_id, n, email, error on failure. Password and tokens are never logged.
- **Idempotency:** Bootstrap (players upsert) is safe to call twice; uses `onConflict: "user_id"` to avoid duplicate key errors.
