# P3 — Cohorts and Calendar: Implementation Tasks

**Document Type:** Implementation plan (Phase 3)  
**Project:** OPP Darts Training Platform  
**Spec reference:** `docs/P3_COHORTS_CALENDAR_DOMAIN.md`  
**Status:** Complete

---

## 1. Migrations and schema

Per domain §4 and §9.

- [x] **1.1** Create migration file(s) in `supabase/migrations/` (Supabase timestamp naming, e.g. `YYYYMMDDHHMMSS_create_cohorts_calendar_tables.sql`).
- [x] **1.2** In migration: create helper **`current_user_player_id()`** — SECURITY DEFINER function that returns `players.id` where `players.user_id = auth.uid()`, or NULL. Used by P3 RLS so players can read own cohort/calendar/player_calendar.
- [x] **1.3** In migration: create **`cohorts`** table — `id` (uuid PK, gen_random_uuid), `name` (text NOT NULL), `level` (int NOT NULL), `start_date` (date NOT NULL), `end_date` (date NOT NULL), `schedule_id` (uuid NOT NULL REFERENCES schedules(id) ON DELETE RESTRICT), `created_at`, `updated_at` (timestamptz NOT NULL DEFAULT now()). Add CHECK (end_date >= start_date).
- [x] **1.4** In migration: create **`cohort_members`** table — `id`, `cohort_id` (NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE), `player_id` (NOT NULL REFERENCES players(id) ON DELETE CASCADE), `created_at`, `updated_at`. Add UNIQUE (cohort_id, player_id).
- [x] **1.5** In migration: create **`calendar`** table — `id`, `scheduled_at` (timestamptz NOT NULL), `cohort_id` (NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE), `schedule_id` (NOT NULL REFERENCES schedules(id) ON DELETE RESTRICT), `day_no` (int NOT NULL ≥ 1), `session_no` (int NOT NULL ≥ 1), `session_id` (NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT), `created_at`, `updated_at`. Add UNIQUE (cohort_id, day_no, session_no).
- [x] **1.6** In migration: create **`player_calendar`** table — `id`, `player_id` (NOT NULL REFERENCES players(id) ON DELETE CASCADE), `calendar_id` (NOT NULL REFERENCES calendar(id) ON DELETE CASCADE), `status` (text NOT NULL; values `planned` or `completed`), `created_at`, `updated_at`. Add UNIQUE (player_id, calendar_id). Optionally CHECK (status IN ('planned', 'completed')).
- [x] **1.7** In migration: add **triggers** for `updated_at = now()` on BEFORE UPDATE for cohorts, cohort_members, calendar, player_calendar (reuse P1-style set_updated_at or equivalent).
- [x] **1.8** In migration: **enable RLS** on all four tables. **Admin policies:** SELECT, INSERT, UPDATE, DELETE allow when `current_user_is_players_admin()`. **Player policies:** cohorts — SELECT where player is in cohort_members for that cohort; cohort_members — SELECT where row’s player_id = current_user_player_id(); calendar — SELECT where current user’s player is in cohort_members for calendar.cohort_id; player_calendar — SELECT and UPDATE where row’s player_id = current_user_player_id(); INSERT/DELETE on cohort_members and player_calendar admin only (player_calendar INSERT when generating calendar).
- [x] **1.9** In migration: add **indexes** — cohort_members(cohort_id), cohort_members(player_id); calendar(cohort_id), calendar(scheduled_at); player_calendar(player_id), player_calendar(calendar_id), player_calendar(player_id, status). (Unique on (cohort_id, day_no, session_no) and (player_id, calendar_id) already enforce lookups.)
- [x] **1.10** (Optional) In migration or app: enforce **“at most one active cohort per player”** — e.g. partial unique index on cohort_members(player_id) where cohort has end_date >= current_date, or enforce in addCohortMember in data layer with clear error.
- [x] **1.11** Apply migration(s) to Supabase project; verify tables, triggers, RLS policies, and indexes exist. Run `supabase db push` (or `supabase migration up` with local Supabase) when project is linked.

**Migration order note:** Create cohorts first (depends on schedules); then cohort_members (cohorts, players); then calendar (cohorts, schedules, sessions); then player_calendar (players, calendar).

---

## 2. Data layer — types and exports

Per domain §6. Types match DB (snake_case); ids as string/uuid.

- [x] **2.1** In `packages/data`: define TypeScript types **Cohort**, **CohortMember**, **Calendar**, **PlayerCalendar** (match table columns; ids as string).
- [x] **2.2** Define payload types: **CreateCohortPayload** ({ name, level, start_date, end_date, schedule_id }), **UpdateCohortPayload** (partial); **GenerateCalendarOptions** ({ defaultTimeOfDay?: string } optional); **PlayerCalendarFilters** ({ status?, fromDate?, toDate? } optional); **PlayerCalendarStatus** ('planned' | 'completed').
- [x] **2.3** Define return types for **getNextSessionForPlayer** and **getAvailableSessionsForPlayer** (e.g. calendar entry + session name, scheduled_at, day_no, session_no).
- [x] **2.4** Export all types from `packages/data`. Ensure **DataError** / **isDataError** (NOT_FOUND, FORBIDDEN, CONFLICT) remain the error contract.

---

## 3. Data layer — cohorts

Per domain §6.2. All functions accept Supabase client.

- [x] **3.1** **listCohorts(client)** — Admin: select all cohorts (id, name, level, start_date, end_date, schedule_id). Optionally support “as player” to list only cohorts they belong to (for future dashboard). Return array.
- [x] **3.2** **getCohortById(client, cohortId)** — Select cohort by id; optionally include schedule name (join schedules) and member count. Return null or throw NOT_FOUND if missing.
- [x] **3.3** **createCohort(client, payload)** — Insert cohort; validate end_date >= start_date. Return created row. Admin only (RLS).
- [x] **3.4** **updateCohort(client, cohortId, payload)** — Update cohort (name, level, start_date, end_date, schedule_id); validate end_date >= start_date. Return updated row; throw NOT_FOUND if no row. Admin only.
- [x] **3.5** **deleteCohort(client, cohortId)** — Delete cohort by id (CASCADE removes cohort_members, calendar, player_calendar). Throw NOT_FOUND if no row. Admin only.

---

## 4. Data layer — cohort members

- [x] **4.1** **listCohortMembers(client, cohortId)** — Select cohort_members for cohortId; optionally join players for display_name. Return array (player_id, cohort_id, optional display_name).
- [x] **4.2** **addCohortMember(client, cohortId, playerId)** — Insert cohort_member. Before insert: if enforcing “at most one cohort per player”, check no other active cohort for this player (e.g. getCurrentCohortForPlayer and throw CONFLICT or clear error). Admin only.
- [x] **4.3** **removeCohortMember(client, cohortId, playerId)** — Delete one row where cohort_id = cohortId and player_id = playerId. Throw NOT_FOUND if no row. Admin only.
- [x] **4.4** **getCurrentCohortForPlayer(client, playerId)** — Return the single cohort where player is a member and cohort.end_date >= current_date (or “active” definition). Return null if none. Used by UI and for “at most one” check.

---

## 5. Data layer — calendar

- [x] **5.1** **listCalendarByCohort(client, cohortId)** — Select calendar rows for cohortId ordered by scheduled_at. Return array (with optional session name from sessions). Admin or cohort member (RLS).
- [x] **5.2** **generateCalendarForCohort(client, cohortId, options?)** — Load cohort and its schedule (getScheduleById with schedule_entries); for each schedule_entry compute scheduled_at = cohort.start_date + (day_no - 1) + default time (e.g. 19:00 from options.defaultTimeOfDay or constant). Delete existing calendar rows for this cohort (and hence player_calendar for those calendar ids); insert new calendar rows; for each cohort_member insert player_calendar (player_id, calendar_id, status 'planned'). Idempotent: “replace” behaviour. Admin only. Throw NOT_FOUND if cohort missing.
- [x] **5.3** **getCalendarEntryById(client, calendarId)** — Select calendar row by id; optionally include session name, cohort name. Return null or throw NOT_FOUND.

---

## 6. Data layer — player calendar and session queries

- [x] **6.1** **listPlayerCalendar(client, playerId, filters?)** — Select player_calendar for playerId; optional filter by status, fromDate, toDate (on calendar.scheduled_at via join). Return array (with optional calendar/session details).
- [x] **6.2** **getNextSessionForPlayer(client, playerId)** — Join player_calendar → calendar where player_id = playerId and status = 'planned' and scheduled_at >= now(); order by scheduled_at ASC; limit 1. Return single entry with session name, scheduled_at, day_no, session_no (and calendar_id, session_id for GE). Return null if none.
- [x] **6.3** **getAvailableSessionsForPlayer(client, playerId)** — Same join; status = 'planned' and (scheduled_at >= now() OR scheduled_at within “recent” past, e.g. last 48 hours). Order by scheduled_at ASC. Return array. Document or make configurable the “missed” window (e.g. 48 hours).
- [x] **6.4** **updatePlayerCalendarStatus(client, playerCalendarId, status)** — Update player_calendar set status where id = playerCalendarId. Enforce status in ('planned', 'completed'). Allow only if current user is the row’s player_id or admin (RLS). Throw NOT_FOUND if no row. Used in P4 for completion; P3 exposes for admin/test.

---

## 7. Admin UI — navigation and routes

Per domain §7. All under existing admin guard and layout.

- [x] **7.1** Add to **admin sidebar/nav**: link **Cohorts** (→ `/admin/cohorts`), alongside existing Dashboard, Players, Schedules, Sessions, Routines, Level requirements.
- [x] **7.2** Register routes: **`/admin/cohorts`** (list), **`/admin/cohorts/new`** (create), **`/admin/cohorts/:id`** (edit: cohort details, members, “Generate calendar”); **`/admin/cohorts/:id/members`** (optional dedicated members page or inline on edit); **`/admin/cohorts/:id/calendar`** (view calendar entries, optional edit). Use existing AdminLayoutPage as parent.

---

## 8. Admin UI — Cohorts CRUD

- [x] **8.1** **Cohorts list** (`/admin/cohorts`): call `listCohorts(supabase)`; render table (name, level, start_date, end_date, schedule name, member count); **New** → `/admin/cohorts/new`; **Edit** → `/admin/cohorts/:id`; **Delete** with confirmation. On delete call `deleteCohort`; show error if fail.
- [x] **8.2** **New cohort** (`/admin/cohorts/new`): form **name**, **level**, **start_date**, **end_date**, **schedule** (dropdown from listSchedules). Submit `createCohort`; on success redirect to `/admin/cohorts/:id`. Validate end_date >= start_date.
- [x] **8.3** **Edit cohort** (`/admin/cohorts/:id`): load `getCohortById`; form to edit name, level, start_date, end_date, schedule; save via `updateCohort`. Show **Members** section: listCohortMembers; add member (player dropdown, call addCohortMember — show error if player already in another active cohort); remove member (confirm, call removeCohortMember). **Generate calendar** button: confirm if calendar already exists (“Replace existing calendar?”); call generateCalendarForCohort; show success or error.
- [x] **8.4** All mutations via `packages/data`; no direct Supabase.

---

## 9. Admin UI — Cohort members

- [x] **9.1** On cohort edit page (or `/admin/cohorts/:id/members`): list members with display_name; **Add player** (dropdown of players not in this cohort; check “already in another active cohort” and warn or block); **Remove** with confirm. Enforce “at most one cohort per player” in UI (e.g. disable add for players who have getCurrentCohortForPlayer and it’s a different cohort).
- [x] **9.2** Show clear message when add fails because player is already in another active cohort (CONFLICT or custom message from data layer).

---

## 10. Admin UI — Calendar view

- [x] **10.1** **Calendar view** (`/admin/cohorts/:id/calendar` or tab on edit): call `listCalendarByCohort`; display table or list (scheduled_at, day_no, session_no, session name). Optional: link to session. No direct Supabase.
- [x] **10.2** If product allows editing scheduled_at per entry, add edit flow (update calendar row); otherwise read-only for P3.
- [x] **10.3** **Calendar edit:** Data layer: add `updateCalendarEntry(client, calendarId, payload)` where payload has optional `scheduled_at` (ISO string) and optional `session_id`. Admin only (RLS). Admin calendar page: add “Edit” per row (or inline); form/modal to change scheduled_at and optionally session (dropdown from listSessions); save via `updateCalendarEntry`; reload list on success.

---

## 11. Unit tests (data layer)

Per domain §10. Mock Supabase client; test success and error paths.

- [x] **11.1** **Cohorts:** listCohorts (admin → list); getCohortById (found / not found); createCohort, updateCohort (validation end_date >= start_date), deleteCohort.
- [x] **11.2** **Cohort members:** listCohortMembers; addCohortMember (success; conflict when player already in another active cohort); removeCohortMember; getCurrentCohortForPlayer (returns cohort or null).
- [x] **11.3** **Calendar:** listCalendarByCohort; generateCalendarForCohort (creates calendar + player_calendar for each member; idempotent replace); getCalendarEntryById.
- [x] **11.4** **Player calendar:** listPlayerCalendar (with filters); getNextSessionForPlayer (next planned upcoming; null if none); getAvailableSessionsForPlayer (upcoming + recent missed); updatePlayerCalendarStatus. Test RLS: player can read/update own player_calendar; non-admin cannot insert/delete.

---

## 12. Documentation and cleanup

- [x] **12.1** Update README or docs: mention P3 (cohorts, calendar, player_calendar); admin manages cohorts and generates calendar; getNextSessionForPlayer / getAvailableSessionsForPlayer available for dashboard/GE.
- [x] **12.2** Ensure no UI code imports Supabase directly for cohort/calendar tables; only `packages/data` and auth context use Supabase.
- [x] **12.3** Update **PROJECT_STATUS_TRACKER.md**: when P3 complete, mark **P3 — Cohorts and calendar** checkbox and add brief “P3 delivered” note in Completed section.

---

## Progress summary

| Section | Tasks | Done |
|---------|-------|------|
| 1. Migrations and schema | 11 | 11 |
| 2. Data layer — types and exports | 4 | 4 |
| 3. Data layer — cohorts | 5 | 5 |
| 4. Data layer — cohort members | 4 | 4 |
| 5. Data layer — calendar | 3 | 3 |
| 6. Data layer — player calendar and session queries | 4 | 4 |
| 7. Admin UI — navigation and routes | 2 | 2 |
| 8. Admin UI — Cohorts CRUD | 4 | 4 |
| 9. Admin UI — Cohort members | 2 | 2 |
| 10. Admin UI — Calendar view | 2 | 2 |
| 11. Unit tests | 4 | 4 |
| 12. Documentation and cleanup | 3 | 3 |

**Execution rule:** One task (or sub-task) at a time; mark checkbox when done; run relevant tests before moving on.
