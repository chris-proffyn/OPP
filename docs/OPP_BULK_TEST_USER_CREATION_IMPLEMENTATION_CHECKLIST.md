# Bulk Test User Creation — Implementation Checklist

Implementation checklist for the behaviour described in **OPP_BULK_TEST_USER_CREATION_DOMAIN.md**: admin-only bulk creation of test users (Supabase Auth + OPP profile/players) with deterministic email pattern, common password, randomised profile details, and optional bulk delete.

**Prerequisites:** OPP uses `public.players` (not `profiles`) linked to `auth.users` via `user_id`. Admin is determined by `players.role === 'admin'`. Creating Auth users requires **Supabase Service Role key** — never expose it to the client; implement creation server-side using **Supabase Edge Functions**.

**Mapping note:** Domain document refers to "profiles"; in OPP the equivalent is **`players`**. All profile fields (display_name, avatar, is_test_user, etc.) apply to `players` and any related OPP tables.

---

## 1. Data model — players table additions

- [x] **Requirement (domain)** — Test users must be distinguishable and traceable; support job tracking and collision-safe N allocation.
- [x] **Add test-user columns to `players`** — Migration: add to `public.players`:
  - `is_test_user` (boolean, default false)
  - `test_user_job_id` (uuid, nullable, FK to `test_user_jobs.id` once that table exists, or nullable for now)
  - `created_by_admin_id` (uuid, nullable; references `players.id` of admin who created)
  - `test_user_seq_n` (int, nullable) — the N in `proffyndev+oppN@gmail.com`
- [x] **Indexes** — Index on `is_test_user`; index on `test_user_job_id`; consider unique constraint on `test_user_seq_n` WHERE test_user_seq_n IS NOT NULL to avoid duplicate N.
- [x] **Comments** — Comment columns and table to document test-user usage. Ensure RLS: admin can SELECT/UPDATE rows where `is_test_user = true` (or rely on existing admin policies if they already allow all rows).

---

## 2. Data model — test_user_jobs table

- [x] **Create `public.test_user_jobs`** — Migration: table with:
  - `id` (uuid, pk, default gen_random_uuid())
  - `created_by_admin_id` (uuid, NOT NULL, references players.id)
  - `created_at` (timestamptz, default now())
  - `requested_count` (int, NOT NULL)
  - `start_n` (int) — first N allocated
  - `end_n` (int) — last N allocated
  - `status` (text, NOT NULL) — e.g. 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'
  - `created_count` (int, default 0)
  - `error_count` (int, default 0)
  - `errors_json` (jsonb, nullable) — per-user failure details
  - `notes` (text, nullable)
- [x] **RLS** — Enable RLS; policy: only admins can SELECT/INSERT (and optionally UPDATE for status updates). No DELETE required for v1 unless cleanup by job is implemented.
- [x] **Index** — Index on `created_at` or `created_by_admin_id` for listing jobs.

---

## 3. Data model — test_user_seq (optional but recommended)

- [x] **Create `public.test_user_seq`** — Migration: table for atomic N allocation:
  - `key` (text, pk) — e.g. 'opp'
  - `next_n` (int, NOT NULL)
- [x] **Seed row** — INSERT one row: key = 'opp', next_n = 1 (or current max N + 1 if existing test users).
- [x] **Allocation** — Server-side logic: call RPC `allocate_test_user_n(p_count)` for atomic N range; or use request `start_n` when provided. Use returned start_n..start_n+count-1 for this job.
- [x] **RLS** — Only service role or admin-backed server should use this table; restrict SELECT/UPDATE to admin or server.

---

## 4. Server-side API — environment and client

- [x] **Server implementation** — Use **Supabase Edge Functions** (Deno) for bulk-create and bulk-delete. Deploy via `supabase functions deploy bulk-create-test-users`; invoke via `supabase.functions.invoke('bulk-create-test-users', { body: {...} })` from the client with the user's JWT. Function: `supabase/functions/bulk-create-test-users/index.ts`.
- [x] **Edge Function secrets** — `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by the Supabase Edge Runtime when deployed; for local dev use `supabase functions serve bulk-create-test-users` (uses linked project). Do not expose service role key to the client.
- [x] **Supabase Admin client** — In the Edge Function, create a client with `createClient(url, service_role_key)` for auth.admin.createUser() and for inserting into `players` / `test_user_jobs` / `test_user_seq` (RLS is bypassed with service role).

**Troubleshooting 401:** If the client gets 401 when invoking the Edge Function, the gateway may be rejecting the JWT before the request reaches the function (e.g. with new Supabase API keys). Deploy with `--no-verify-jwt` so the function receives the request; we verify the JWT inside the function with `getClaims()`. Example: `supabase functions deploy bulk-create-test-users --no-verify-jwt` (and same for `bulk-delete-test-users`).

---

## 5. Server-side API — admin validation and auth

- [x] **Authenticate request** — Endpoint must require valid JWT (e.g. Authorization: Bearer &lt;anon or user JWT&gt;). Verify JWT with Supabase (auth.getClaims(token)); return 401 if missing or invalid.
- [x] **Authorize admin** — Resolve user from JWT (sub claim); look up `players` row by `user_id`; if no row or `players.role !== 'admin'`, return **403 Forbidden**.
- [x] **Rate limit** — Max 200 users per request (validated when parsing body). Hourly cap 500 per admin: sum `created_count` from `test_user_jobs` where `created_by_admin_id` and `created_at` in last hour; return 429 if requested + sum &gt; 500.
- [x] **Production safeguard** — When `ENVIRONMENT` or `NODE_ENV` is `production`, require `body.confirm_test_users === true` (client sends when user checks "I understand these are test users"); return 400 otherwise. Set `ENVIRONMENT=production` in Edge Function secrets for prod.

---

## 6. Server-side API — bulk create endpoint

- [x] **Endpoint** — Supabase Edge Function `bulk-create-test-users`; invoke with `POST` and JSON body (path: `https://<ref>.supabase.co/functions/v1/bulk-create-test-users`).
- [x] **Request body** — Parse and validate:
  - `count` (int, required, 1..200)
  - `start_n` (int, optional) — if provided, use this N as first; else allocate from `test_user_seq` via RPC
  - `default_opp_level` (int, optional) — e.g. 20; applied to each created player
  - `job_notes` (string, optional)
- [x] **Response** — Return:
  - `job_id`, `created_count`, `errors` (array), `emails_created` (array), `start_n`, `end_n`
  - Optionally omit `emails_created` if very large; support download link or separate endpoint for CSV.
- [x] **Password** — Fixed: `Pcptest1!` (shown to admin after create).
- [x] **Email pattern** — Fixed: `proffyndev+opp{N}@gmail.com` with N from allocated range.

---

## 7. Bulk create algorithm — job and allocation

- [x] **Create job row** — INSERT into `test_user_jobs` with status 'RUNNING', `created_by_admin_id`, `requested_count`, `notes`; capture job id.
- [x] **Allocate N range** — If `start_n` provided in body: use it; `end_n = start_n + count - 1`. Else: call RPC `allocate_test_user_n(p_count)`; set start_n = result, end_n = start_n + count - 1.
- [x] **Update job** — Set `start_n`, `end_n` on job row.

---

## 8. Bulk create algorithm — per-user create loop

- [x] **For each N in [start_n..end_n]**:
  - `email = proffyndev+opp{N}@gmail.com`
  - Call Supabase Auth Admin API: createUser({ email, password: 'Pcptest1!', email_confirm: true, user_metadata: { is_test_user: true, test_user_seq_n: N, test_user_job_id: jobId } }).
  - **Collision handling:** On "user already exists" (or duplicate email): record error and continue; do not stop job.
  - On success: capture `user.id`; call bootstrapTestUser (players row + randomised profile).
- [x] **Bootstrap OPP records** — Upsert `players` row with `user_id`, email, randomised display_name/nickname/gender, `is_test_user = true`, `test_user_job_id`, `created_by_admin_id`, `test_user_seq_n`, baseline_rating 0, training_rating from default_opp_level, role 'player', date_joined today.
- [x] **Accumulate results** — Increment `created_count`; on failure append to `errors` and continue. Do not stop entire job on single failure.
- [x] **Update job status** — On loop completion: set status to 'COMPLETED' (all ok), 'PARTIAL' (some failures), or 'FAILED' (none created); set `created_count`, `error_count`, `errors_json`.

---

## 9. Bootstrap and randomised profile

- [x] **Bootstrap function** — Implemented `bootstrapTestUser(admin, authUserId, email, opts)`: upserts into `players` (user_id, email, display_name, nickname, gender, baseline_rating, training_rating, role, date_joined, is_test_user, test_user_job_id, created_by_admin_id, test_user_seq_n). Idempotent via upsert on user_id.
- [x] **Randomised profile data** — Embedded lists: FIRST_NAMES, LAST_NAMES (no external API).
- [x] **Generation rules** — display_name = "{First} {Last}" from random picks; gender 50/50 m/f; training_rating from request default_opp_level (default 20); baseline_rating 0; role 'player'.
- [x] **Map to `players` columns** — Set display_name, nickname, email, gender, baseline_rating, training_rating, role, date_joined, is_test_user, test_user_job_id, created_by_admin_id, test_user_seq_n.

---

## 10. Admin UI — Test Users page

- [x] **Route** — Admin route `/admin/test-users` (under AdminGuard via AdminLayoutPage).
- [x] **Page content** — "Test Users" section with:
  - **Number to create** — number input (default 10, max 200)
  - **Starting N** — optional number input; if blank, server auto-allocates
  - **OPP level band** — optional (default 20)
  - **Create** button — invokes bulk-create-test-users Edge Function with admin JWT (Supabase client sends session)
  - **Progress/status** — "Creating…" while request in flight; result shown after completion
  - **Results** — Count created, range (start_n–end_n), list of created emails; Copy / Download CSV; password reminder (Pcptest1!).
- [x] **Copy** — Short explanation at top: Gmail plus-aliases, fixed password, test users can be bulk-deleted.
- [x] **Error handling** — Display API errors (403, 429, 500, validation); show per-user errors in expandable section when PARTIAL/FAILED.

---

## 11. Bulk delete (recommended)

- [x] **Endpoint** — Supabase Edge Function `bulk-delete-test-users`; invoke via `supabase.functions.invoke('bulk-delete-test-users', { body: {...} })`.
- [x] **Request body** — One of: `job_id` (uuid), or `n_range: { start_n, end_n }`, or `delete_all_test_users: true`.
- [x] **Authorization** — Same as bulk-create: JWT + players.role = 'admin' (authenticate + requireAdmin).
- [x] **Logic** — Resolve test users (by job_id, n_range, or is_test_user = true). For each: delete from `players` (DB cascade removes dependents), then `auth.admin.deleteUser(user_id)`. Accumulate deleted_count and errors.
- [x] **Response** — Return `deleted_count`, `errors` (array of { user_id, error }).
- [x] **UI** — "Bulk delete" section on Test Users page: radio "By job ID" / "By N range" / "All test users"; job ID or start N/end N inputs; confirmation checkbox; show result (deleted count, errors).

---

## 12. Marking and excluding test users

- [x] **Marking** — Every created test user has: `players.is_test_user = true` (set in bootstrapTestUser upsert), and auth `user_metadata.is_test_user = true` (set in createUser). Both are set in bulk-create Edge Function; see code comments there.
- [x] **Analytics/reporting** — Documented: In `packages/data/src/players.ts` (file-level comment), analytics/reporting that aggregate across players should filter with `.eq('is_test_user', false)` (or `WHERE is_test_user = false`) so test users are excluded. New reporting or analytics queries should apply this filter by default unless the report is explicitly about test users.

---

## 13. Acceptance criteria and testing

- [x] **AC1 — Bulk create creates real login users** — Created users exist in Supabase Auth and can log in with password `Pcptest1!`.
- [x] **AC2 — Profiles (players) populated and flagged** — Each has players.is_test_user = true, randomised display_name and avatar_color (or equivalent), traceability fields set.
- [ ] **AC3 — Job tracked** — test_user_jobs row created and status set to COMPLETED/PARTIAL/FAILED with correct counts.
- [ ] **AC4 — Admin-only** — Non-admin requests to bulk-create and bulk-delete return 403.
- [ ] **AC5 — Collision-safe** — If an N already exists, job either extends allocation and retries or records partial failure without crashing.
- [x] **AC6 — Cleanup** — If bulk-delete implemented, admin can delete by job or all test users; Auth users and app data removed.
- [ ] **Manual test** — Run bulk create (e.g. 3 users); verify login for one; run bulk delete by job; verify users gone.

---

## 14. Implementation order (suggested)

1. **§1–§3** — Migrations: players columns, test_user_jobs, test_user_seq (if used).
2. **§4–§6** — Edge Function skeleton: secrets, Supabase admin client, auth + admin check, request/response shape for bulk-create.
3. **§7–§9** — Bulk create algorithm: allocation, loop (Auth createUser + bootstrap), randomised profile, job status update.
4. **§10** — Admin UI: Test Users page, form, call API, display results and copy.
5. **§11** — Bulk delete endpoint and UI (optional but recommended).
6. **§12–§13** — Marking/exclusion notes and acceptance tests.

---

## 15. Security and logging

- [x] **No service role in client** — Confirm service role key is only in Edge Function secrets (Supabase project secrets); never in frontend bundle or logs.
- [x] **Logging** — Log (server-side): job_id, created user id, email, N; per-user errors. Do not log password.
- [x] **Idempotency** — Bootstrap safe to call twice (e.g. if trigger also creates a row); avoid duplicate key errors.
- [x] **Documented** — Service role: only from `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` in Edge Function; .env.example states it is for Edge Functions only; web app has no reference. Logging: JSON logs with `event` (bulk_create_job_start, bulk_create_n_allocated, bulk_create_user_created, bulk_create_user_error, bulk_create_job_done); job_id, user_id, email, n on success; job_id, n, email, error on failure; password never logged. Idempotency: `bootstrapTestUser` uses upsert on `user_id`.

---

## 16. Out of scope / follow-up

- No public self-service test user creation.
- No per-user password change UI for test users (shared password only).
- No email verification flow (users created with email_confirm: true).
- Optional: list past jobs (Edge Function e.g. `list-test-user-jobs`) and show job details on Admin UI.
- Optional: CSV download of created emails from job result.
