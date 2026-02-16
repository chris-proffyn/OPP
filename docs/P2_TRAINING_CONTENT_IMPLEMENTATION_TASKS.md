# P2 — Training Content: Implementation Tasks

**Document Type:** Implementation plan (Phase 2)  
**Project:** OPP Darts Training Platform  
**Spec reference:** `docs/P2_TRAINING_CONTENT_DOMAIN.md`  
**Status:** Complete

---

## 1. Migrations and schema

Per domain §4 and §8.

- [x] **1.1** Create migration file(s) in `supabase/migrations/` (Supabase timestamp naming, e.g. `YYYYMMDDHHMMSS_create_training_content_tables.sql` or split by concern).
- [x] **1.2** In migration: create **`schedules`** table — `id` (uuid PK, gen_random_uuid), `name` (text NOT NULL), `created_at`, `updated_at` (timestamptz NOT NULL DEFAULT now()).
- [x] **1.3** In migration: create **`schedule_entries`** table — `id`, `schedule_id` (NOT NULL REFERENCES schedules(id) ON DELETE CASCADE), `day_no` (int NOT NULL, ≥ 1), `session_no` (int NOT NULL, ≥ 1), `session_id` (NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT), `created_at`, `updated_at`. Add UNIQUE (schedule_id, day_no, session_no). (Note: `sessions` must exist before `schedule_entries`; create `sessions` first in same migration.)
- [x] **1.4** In migration: create **`sessions`** table — `id`, `name` (text NOT NULL), `created_at`, `updated_at`.
- [x] **1.5** In migration: create **`session_routines`** table — `id`, `session_id` (NOT NULL REFERENCES sessions ON DELETE CASCADE), `routine_no` (int NOT NULL ≥ 1), `routine_id` (NOT NULL REFERENCES routines ON DELETE RESTRICT), `created_at`, `updated_at`. UNIQUE (session_id, routine_no). (Create `routines` before `session_routines`.)
- [x] **1.6** In migration: create **`routines`** table — `id`, `name` (text NOT NULL), `description` (text NULL), `created_at`, `updated_at`.
- [x] **1.7** In migration: create **`routine_steps`** table — `id`, `routine_id` (NOT NULL REFERENCES routines ON DELETE CASCADE), `step_no` (int NOT NULL ≥ 1), `target` (text NOT NULL), `created_at`, `updated_at`. UNIQUE (routine_id, step_no).
- [x] **1.8** In migration: create **`level_requirements`** table — `id`, `min_level` (int NOT NULL ≥ 0), `tgt_hits` (int NOT NULL ≥ 0), `darts_allowed` (int NOT NULL ≥ 1), `created_at`, `updated_at`. UNIQUE (min_level).
- [x] **1.9** In migration: add **triggers** for `updated_at = now()` on BEFORE UPDATE for all seven tables (reuse P1-style: function + EXECUTE FUNCTION or EXECUTE PROCEDURE per Postgres version).
- [x] **1.10** In migration: **enable RLS** on all seven tables; add policies using **`current_user_is_players_admin()`** (existing P1 function): SELECT, INSERT, UPDATE, DELETE allow when admin. One policy per operation per table (e.g. `schedules_select_admin`, `schedules_insert_admin`, etc.).
- [x] **1.11** In migration: add **indexes** — schedule_entries(schedule_id), schedule_entries(session_id); session_routines(session_id), session_routines(routine_id); routine_steps(routine_id). (level_requirements min_level already unique.)
- [x] **1.12** (Optional) In migration or separate seed: insert default **level_requirements** rows for decades 0, 10, 20, …, 90 per OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §7 (e.g. 0→0/9, 10→1/9, 20→2/9, …, 90→9/9).
- [x] **1.13** Apply migration(s) to Supabase project; verify tables, triggers, RLS policies, and indexes exist.

**Migration order note:** Create tables in dependency order: `schedules`, `sessions`, `routines` first; then `schedule_entries` (references schedules, sessions), `session_routines` (references sessions, routines), `routine_steps` (references routines); then `level_requirements`.

---

## 2. Data layer — types and exports

Per domain §6. All types plain (snake_case to match DB); no Supabase types in public API.

- [x] **2.1** In `packages/data`: define TypeScript types **Schedule**, **ScheduleEntry**, **Session**, **SessionRoutine**, **Routine**, **RoutineStep**, **LevelRequirement** (match table columns; ids as string/uuid).
- [x] **2.2** Define payload types: **CreateSchedulePayload** ({ name }), **UpdateSchedulePayload** ({ name? }); **CreateSessionPayload**, **UpdateSessionPayload**; **CreateRoutinePayload** ({ name, description? }), **UpdateRoutinePayload**; **CreateLevelRequirementPayload** ({ min_level, tgt_hits, darts_allowed }), **UpdateLevelRequirementPayload**; **ScheduleEntryInput** ({ day_no, session_no, session_id }); **SessionRoutineInput** ({ routine_no, routine_id }); **RoutineStepInput** ({ step_no, target }).
- [x] **2.3** Export all types and payloads from `packages/data` (e.g. from `types.ts` or dedicated file). Ensure **DataError** / **isDataError** remain the error contract; map NOT_FOUND, FORBIDDEN, CONFLICT where applicable.

---

## 3. Data layer — schedules

Per domain §6.2. All functions accept Supabase client; admin-only enforced by RLS (data layer may optionally check getCurrentPlayer + role for clearer errors).

- [x] **3.1** **listSchedules(client)** — select from schedules (id, name, created_at); return array. Throws FORBIDDEN if non-admin (RLS).
- [x] **3.2** **getScheduleById(client, scheduleId)** — select schedule by id; select schedule_entries for that schedule ordered by day_no, session_no; return schedule + entries (each with id, schedule_id, day_no, session_no, session_id). Return null or throw NOT_FOUND if schedule missing.
- [x] **3.3** **createSchedule(client, payload)** — insert schedule (name); return created row.
- [x] **3.4** **updateSchedule(client, scheduleId, payload)** — update schedule (name) where id = scheduleId; return updated row; throw NOT_FOUND if no row.
- [x] **3.5** **deleteSchedule(client, scheduleId)** — delete schedule by id (CASCADE removes entries); throw NOT_FOUND if no row.
- [x] **3.6** **listScheduleEntries(client, scheduleId)** — return schedule_entries for scheduleId ordered by day_no, session_no.
- [x] **3.7** **setScheduleEntries(client, scheduleId, entries)** — delete existing entries for scheduleId; insert new rows from array of { day_no, session_no, session_id }; validate session_id exists. Idempotent for same input. Throw FORBIDDEN if non-admin.

---

## 4. Data layer — sessions

- [x] **4.1** **listSessions(client)** — select from sessions (id, name, created_at); return array.
- [x] **4.2** **getSessionById(client, sessionId)** — select session by id; select session_routines for that session ordered by routine_no; return session + routines (each with id, session_id, routine_no, routine_id). Optionally include routine name per entry (join or second query). Return null or throw NOT_FOUND if session missing.
- [x] **4.3** **createSession(client, payload)** — insert session (name); return created row.
- [x] **4.4** **updateSession(client, sessionId, payload)** — update session (name) where id = sessionId; return updated row; throw NOT_FOUND if no row.
- [x] **4.5** **deleteSession(client, sessionId)** — delete session by id. If referenced by schedule_entries, DB RESTRICT will error; map to clear message (e.g. “Cannot delete: session is used in a schedule”).
- [x] **4.6** **listSessionRoutines(client, sessionId)** — return session_routines for sessionId ordered by routine_no.
- [x] **4.7** **setSessionRoutines(client, sessionId, routines)** — delete existing session_routines for sessionId; insert new rows from array of { routine_no, routine_id }. Validate routine_id exists. Throw FORBIDDEN if non-admin.

---

## 5. Data layer — routines

- [x] **5.1** **listRoutines(client)** — select from routines (id, name, description, created_at); return array.
- [x] **5.2** **getRoutineById(client, routineId)** — select routine by id; select routine_steps for that routine ordered by step_no; return routine + steps (each with id, routine_id, step_no, target). Return null or throw NOT_FOUND if routine missing.
- [x] **5.3** **createRoutine(client, payload)** — insert routine (name, description); return created row.
- [x] **5.4** **updateRoutine(client, routineId, payload)** — update routine (name, description) where id = routineId; return updated row; throw NOT_FOUND if no row.
- [x] **5.5** **deleteRoutine(client, routineId)** — delete routine by id. If referenced by session_routines, DB RESTRICT will error; map to clear message.
- [x] **5.6** **listRoutineSteps(client, routineId)** — return routine_steps for routineId ordered by step_no.
- [x] **5.7** **setRoutineSteps(client, routineId, steps)** — delete existing routine_steps for routineId; insert new rows from array of { step_no, target }. Idempotent. Throw FORBIDDEN if non-admin.

---

## 6. Data layer — level requirements

- [x] **6.1** **listLevelRequirements(client)** — select all from level_requirements ordered by min_level; return array.
- [x] **6.2** **getLevelRequirementByMinLevel(client, minLevel)** — select one row where min_level = minLevel; return row or null.
- [x] **6.3** **createLevelRequirement(client, payload)** — insert (min_level, tgt_hits, darts_allowed); on unique violation (min_level) throw CONFLICT or clear error. Return created row.
- [x] **6.4** **updateLevelRequirement(client, id, payload)** — update row by id (allow updating min_level, tgt_hits, darts_allowed); if min_level changed and conflicts with another row, throw CONFLICT. Return updated row; throw NOT_FOUND if no row.
- [x] **6.5** **deleteLevelRequirement(client, id)** — delete by id; throw NOT_FOUND if no row.

---

## 7. Admin UI — navigation and routes

Per domain §7. All under existing admin guard and layout.

- [x] **7.1** Add to **admin sidebar/nav**: links for **Schedules** (→ `/admin/schedules`), **Sessions** (→ `/admin/sessions`), **Routines** (→ `/admin/routines`), **Level requirements** (→ `/admin/level-requirements`), alongside existing Dashboard and Players.
- [x] **7.2** Register routes under `/admin`: **`/admin/schedules`** (list), **`/admin/schedules/new`** (create), **`/admin/schedules/:id`** (edit); **`/admin/sessions`**, **`/admin/sessions/new`**, **`/admin/sessions/:id`**; **`/admin/routines`**, **`/admin/routines/new`**, **`/admin/routines/:id`**; **`/admin/level-requirements`** (list + new/edit/delete as needed). Use existing AdminLayoutPage as parent so all show admin nav.

---

## 8. Admin UI — Schedules CRUD

- [x] **8.1** **Schedules list** (`/admin/schedules`): call `listSchedules(supabase)`; render table or list (name, optional entry count or “View”); **New** button → `/admin/schedules/new`; **Edit** per row → `/admin/schedules/:id`; **Delete** with confirmation modal or confirm(). On delete call `deleteSchedule`; on RESTRICT or error show message (e.g. “Cannot delete: session is in use” — only applies to sessions; schedules CASCADE entries).
- [x] **8.2** **New schedule** (`/admin/schedules/new`): form with **name**; submit `createSchedule`; on success redirect to `/admin/schedules/:id` (edit) or `/admin/schedules`. Optionally allow adding entries on create (or add entries on edit only).
- [x] **8.3** **Edit schedule** (`/admin/schedules/:id`): load `getScheduleById`; form to edit **name**; list of **schedule_entries** (day_no, session_no, session dropdown). Allow add/remove rows; submit name via `updateSchedule`, then `setScheduleEntries(client, scheduleId, entries)`. Validate day_no/session_no ≥ 1 and session_id selected. Show loading and error states.
- [x] **8.4** Ensure no direct Supabase in UI; all via `packages/data`.

---

## 9. Admin UI — Sessions CRUD

- [x] **9.1** **Sessions list** (`/admin/sessions`): call `listSessions`; table with name; **New**, **Edit** (→ `/admin/sessions/:id`), **Delete** (confirm). On delete call `deleteSession`; on error (e.g. “used in schedule”) show clear message.
- [x] **9.2** **New session** (`/admin/sessions/new`): form **name**; submit `createSession`; redirect to edit or list.
- [x] **9.3** **Edit session** (`/admin/sessions/:id`): load `getSessionById`; form **name**; list of **session_routines** (routine_no, routine dropdown). Add/remove rows; submit `updateSession` and `setSessionRoutines`. Validate routine_no ≥ 1 and routine_id selected.
- [x] **9.4** All mutations via `packages/data`.

---

## 10. Admin UI — Routines CRUD

- [x] **10.1** **Routines list** (`/admin/routines`): call `listRoutines`; table (name, description snippet); **New**, **Edit** (→ `/admin/routines/:id`), **Delete** (confirm). On delete call `deleteRoutine`; on error (e.g. “used in session”) show message.
- [x] **10.2** **New routine** (`/admin/routines/new`): form **name**, **description** (optional); submit `createRoutine`; redirect to edit or list.
- [x] **10.3** **Edit routine** (`/admin/routines/:id`): load `getRoutineById`; form **name**, **description**; list of **routine_steps** (step_no, target text). Add/remove rows; submit `updateRoutine` and `setRoutineSteps`. Validate step_no ≥ 1 and target non-empty.
- [x] **10.4** All mutations via `packages/data`.

---

## 11. Admin UI — Level requirements CRUD

- [x] **11.1** **Level requirements list** (`/admin/level-requirements`): call `listLevelRequirements`; table (min_level, tgt_hits, darts_allowed); **New**, **Edit** (e.g. `/admin/level-requirements/:id` or inline), **Delete** (confirm). Enforce or hint that min_level is typically 0, 10, …, 90 (one per decade).
- [x] **11.2** **New level requirement**: form **min_level**, **tgt_hits**, **darts_allowed**; submit `createLevelRequirement`. On unique violation (min_level already exists) show clear message.
- [x] **11.3** **Edit level requirement**: load by id or min_level; form to edit; submit `updateLevelRequirement`. Handle CONFLICT if min_level changed to an existing decade.
- [x] **11.4** All mutations via `packages/data`.

---

## 12. Unit tests (data layer)

Per domain §9. Mock Supabase client; test success and error paths.

- [x] **12.1** **Schedules:** listSchedules (admin → list; non-admin → FORBIDDEN); getScheduleById (found → schedule + entries; not found → null/throw); createSchedule, updateSchedule, deleteSchedule (success); setScheduleEntries (replace entries).
- [x] **12.2** **Sessions:** listSessions, getSessionById, createSession, updateSession, deleteSession (success; delete when referenced → error); setSessionRoutines.
- [x] **12.3** **Routines:** listRoutines, getRoutineById, createRoutine, updateRoutine, deleteRoutine; setRoutineSteps.
- [x] **12.4** **Level requirements:** listLevelRequirements, getLevelRequirementByMinLevel, createLevelRequirement (success + unique violation → CONFLICT), updateLevelRequirement, deleteLevelRequirement.

---

## 13. Documentation and cleanup

- [x] **13.1** Update README or docs: mention P2 training content (schedules, sessions, routines, level requirements); admin can manage via `/admin/schedules`, etc. No new env vars required if reusing P1.
- [x] **13.2** Ensure no UI code imports Supabase directly for training tables; only `packages/data` and auth context use Supabase.
- [x] **13.3** Update **PROJECT_STATUS_TRACKER.md**: when P2 complete, mark P2 — Training content checkbox and add brief “P2 delivered” note in Completed section.

---

## Progress summary

| Section | Tasks | Done |
|---------|-------|------|
| 1. Migrations and schema | 13 | 13 |
| 2. Data layer — types and exports | 3 | 3 |
| 3. Data layer — schedules | 7 | 7 |
| 4. Data layer — sessions | 7 | 7 |
| 5. Data layer — routines | 7 | 7 |
| 6. Data layer — level requirements | 5 | 5 |
| 7. Admin UI — navigation and routes | 2 | 2 |
| 8. Admin UI — Schedules CRUD | 4 | 4 |
| 9. Admin UI — Sessions CRUD | 4 | 4 |
| 10. Admin UI — Routines CRUD | 4 | 4 |
| 11. Admin UI — Level requirements CRUD | 4 | 4 |
| 12. Unit tests | 4 | 4 |
| 13. Documentation and cleanup | 3 | 3 |

**Execution rule:** One task (or sub-task) at a time; mark checkbox when done; run relevant tests before moving on.
