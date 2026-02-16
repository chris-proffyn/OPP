# P2 — Training Content: Domain Document

**Document Type:** Domain specification (Phase 2)  
**Project:** OPP Darts Training Platform  
**Audience:** Delivery team, Cursor  
**Status:** v1.0  
**Authority:** Defines all required behaviour for Phase 2 (Training content). Implementation must conform to this document.

---

## 1. Purpose and scope

### 1.1 Purpose

This document describes **every behaviour required for Phase 2 — Training content** so that:

- Implementers can build without ambiguity.
- Acceptance criteria are testable.
- Scope is limited to schedules, sessions, routines, and level requirements; no Game Engine, calendar, or cohort yet.

### 1.2 Phase 2 objectives (from PRD)

- **Schedules:** Define programmes (e.g. “Beginner Daily”, “Advanced Daily”) as a named schedule with rows (day_no, session_no, session_id).
- **Sessions:** Define named sessions (e.g. “Singles (1..10)”, “2D Checkouts”) with ordered routines.
- **Routines:** Define routines (name, description) with ordered steps; each step has a target (e.g. S20, D16). Smallest unit = one throw (dart).
- **Level requirements:** Per-decade expected hits and darts allowed (e.g. level 20–29 → 2/9). Configurable; used later for pass/fail and TR progression.
- **Admin CRUD:** Full create/read/update/delete for schedules, sessions, routines, and level requirements.
- **Data layer:** API in `packages/data` to read schedules, sessions, routines, and level requirements (no hard-coded content; data-driven from DB).

### 1.3 In scope for P2

- Schema and migrations for: `schedules`, `schedule_entries`, `sessions`, `session_routines`, `routines`, `routine_steps`, `level_requirements`.
- RLS on all new tables (admin-only write; read as needed for future player-facing features).
- Admin UI: CRUD pages for schedules, sessions, routines, level requirements (under `/admin`).
- Data layer: list/get by id for schedules (with entries), sessions (with routines), routines (with steps), level requirements.

### 1.4 Out of scope for P2

- **Cohorts, calendar, player_calendar** — P3.
- **Game Engine (GE), score capture, dart_scores, session/routine scores** — P4.
- **TR/BR/ITA calculation, level progression logic** — P5 (level_requirements table is populated and readable; progression rules applied in P5).
- **Dashboard “next session” or “available sessions”** — P3/P4.
- **Competitions, match tables** — P7.

---

## 2. References

- **PRODUCT_REQUIREMENTS.md** — FR-3.1–FR-3.5 (schedules, sessions, routines, level requirements); FR-12.2 (Admin CRUD); NFRs.
- **OPP Platform.md** — Tables: schedules, sessions, routines, level_requirements; structure of schedule/session/routine rows.
- **OPP_TRAINING_RATING_ENGINE_SPEC_v2.md** — Level requirements (per-decade target %, hits/darts); used to define `level_requirements` columns.
- **OPP Cohort example.md** — Example schedule (Beginner Daily, day/session layout, session names).
- **RSD_DATA_MODELLING_GUIDE.md** — UUIDs, timestamps, RLS, naming, snake_case.
- **P1_FOUNDATION_DOMAIN.md** — Players, auth, admin skeleton; P2 builds on P1.

---

## 3. Data model overview

Training content is hierarchical:

- **Schedule** → has many **schedule_entries** (day_no, session_no → session_id).
- **Session** → has many **session_routines** (routine_no → routine_id).
- **Routine** → has many **routine_steps** (step_no, target segment).
- **Level requirements** → standalone table (min_level = decade start, tgt_hits, darts_allowed).

All tables use UUID primary keys, `created_at` / `updated_at` (trigger-maintained), and RLS. Naming: plural snake_case tables, snake_case columns.

---

## 4. Tables and schema

### 4.1 `schedules`

Programme definition (e.g. “Beginner Daily”, “Advanced Daily”).

| Column       | Type         | Constraints                    | Description                    |
|-------------|--------------|--------------------------------|--------------------------------|
| `id`        | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key.            |
| `name`      | `text`       | NOT NULL                       | Descriptive name.              |
| `created_at`| `timestamptz`| NOT NULL DEFAULT now()         | Immutable.                     |
| `updated_at`| `timestamptz`| NOT NULL DEFAULT now()         | Updated via trigger.           |

### 4.2 `schedule_entries`

Which session runs on which day and slot. One row per (schedule, day_no, session_no).

| Column        | Type         | Constraints                    | Description                    |
|---------------|--------------|--------------------------------|--------------------------------|
| `id`          | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key.            |
| `schedule_id` | `uuid`       | NOT NULL REFERENCES schedules(id) ON DELETE CASCADE | Parent schedule.               |
| `day_no`      | `int`        | NOT NULL, ≥ 1                  | Training day number (1 = first day). |
| `session_no`  | `int`        | NOT NULL, ≥ 1                  | Session index within that day (1 = first session). |
| `session_id`  | `uuid`       | NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT | Session to run.                |
| `created_at`  | `timestamptz`| NOT NULL DEFAULT now()         | Immutable.                     |
| `updated_at`  | `timestamptz`| NOT NULL DEFAULT now()         | Updated via trigger.           |

- **Unique:** `(schedule_id, day_no, session_no)` so each slot is defined once per schedule.

### 4.3 `sessions`

Named session (e.g. “Singles (1..10)”, “2D Checkouts”). Comprises ordered routines.

| Column       | Type         | Constraints                    | Description                    |
|-------------|--------------|--------------------------------|--------------------------------|
| `id`        | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key.            |
| `name`      | `text`       | NOT NULL                       | Session name.                  |
| `created_at`| `timestamptz`| NOT NULL DEFAULT now()         | Immutable.                     |
| `updated_at`| `timestamptz`| NOT NULL DEFAULT now()         | Updated via trigger.           |

### 4.4 `session_routines`

Order of routines within a session. One row per (session, routine_no).

| Column        | Type         | Constraints                    | Description                    |
|---------------|--------------|--------------------------------|--------------------------------|
| `id`          | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key.            |
| `session_id` | `uuid`       | NOT NULL REFERENCES sessions(id) ON DELETE CASCADE | Parent session.               |
| `routine_no`  | `int`        | NOT NULL, ≥ 1                  | Order of routine in session (1 = first). |
| `routine_id`  | `uuid`       | NOT NULL REFERENCES routines(id) ON DELETE RESTRICT | Routine to run.               |
| `created_at`  | `timestamptz`| NOT NULL DEFAULT now()         | Immutable.                     |
| `updated_at`  | `timestamptz`| NOT NULL DEFAULT now()         | Updated via trigger.           |

- **Unique:** `(session_id, routine_no)`.

### 4.5 `routines`

Named routine (e.g. “Singles”, “Doubles (20,10,5,…)”). Comprises ordered steps (targets).

| Column        | Type         | Constraints                    | Description                    |
|---------------|--------------|--------------------------------|--------------------------------|
| `id`          | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key.            |
| `name`        | `text`       | NOT NULL                       | Routine name.                  |
| `description` | `text`       | NULL                           | Optional description.         |
| `created_at`  | `timestamptz`| NOT NULL DEFAULT now()         | Immutable.                     |
| `updated_at`  | `timestamptz`| NOT NULL DEFAULT now()         | Updated via trigger.           |

### 4.6 `routine_steps`

One target per step (one throw). Target = segment code (e.g. S20, D16, T20, B for bull) or numeric segment id per platform convention.

| Column        | Type         | Constraints                    | Description                    |
|---------------|--------------|--------------------------------|--------------------------------|
| `id`          | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key.            |
| `routine_id`  | `uuid`       | NOT NULL REFERENCES routines(id) ON DELETE CASCADE | Parent routine.               |
| `step_no`     | `int`        | NOT NULL, ≥ 1                  | Order of step in routine (1 = first). |
| `target`      | `text`       | NOT NULL                       | Target segment (e.g. S20, D16, T20).  |
| `created_at`  | `timestamptz`| NOT NULL DEFAULT now()         | Immutable.                     |
| `updated_at`  | `timestamptz`| NOT NULL DEFAULT now()         | Updated via trigger.           |

- **Unique:** `(routine_id, step_no)`.

### 4.7 `level_requirements`

Per-decade expected performance: minimum hits required for a given number of darts (used for pass/fail and TR progression in P5). Stored and configurable; no application logic in P2 beyond CRUD.

| Column          | Type         | Constraints                    | Description                    |
|-----------------|--------------|--------------------------------|--------------------------------|
| `id`            | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key.            |
| `min_level`     | `int`        | NOT NULL, ≥ 0                  | Decade start (0 = 0–9, 10 = 10–19, …, 90 = 90–99). |
| `tgt_hits`      | `int`        | NOT NULL, ≥ 0                  | Required hits (e.g. 2 for level 20–29). |
| `darts_allowed` | `int`        | NOT NULL, ≥ 1                  | Darts per “round” (usually 9). |
| `created_at`    | `timestamptz`| NOT NULL DEFAULT now()         | Immutable.                     |
| `updated_at`    | `timestamptz`| NOT NULL DEFAULT now()         | Updated via trigger.           |

- **Unique:** `min_level` (one row per decade).
- **Reference:** OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §7 (Level Requirements table: 0–9 → 0/9, 10–19 → 1/9, 20–29 → 2/9, etc.).

### 4.8 Indexes and triggers

- **Indexes:** `schedule_entries(schedule_id)`, `schedule_entries(session_id)`; `session_routines(session_id)`, `session_routines(routine_id)`; `routine_steps(routine_id)`; `level_requirements(min_level)` (unique covers lookup).
- **Triggers:** `updated_at = now()` on BEFORE UPDATE for: schedules, schedule_entries, sessions, session_routines, routines, routine_steps, level_requirements (reuse P1-style trigger pattern).

---

## 5. Row Level Security (RLS)

### 5.1 Principle

- All seven tables have RLS enabled. Default: DENY.
- **P2 only:** Only admins (same condition as P1: current user has `players.role = 'admin'`) may SELECT, INSERT, UPDATE, DELETE on these tables. No player-facing read in P2 (player reads come in P3/P4 when calendar and “next session” exist).
- Use a SECURITY DEFINER helper (e.g. `current_user_is_players_admin()`) for admin checks if policies reference `players`, to avoid recursion.

### 5.2 Policies (per table)

For each of: `schedules`, `schedule_entries`, `sessions`, `session_routines`, `routines`, `routine_steps`, `level_requirements`:

- **SELECT:** Allow if `current_user_is_players_admin()` (admin can read all; in P3 we may add player-readable policies for calendar/session data).
- **INSERT / UPDATE / DELETE:** Allow if `current_user_is_players_admin()`.

No separate “own row” policies; these tables are admin-managed content.

---

## 6. Data access layer (`packages/data`)

### 6.1 Rules

- UI and app code must not call Supabase directly. All access via `packages/data` functions.
- Functions accept Supabase client (from app context). Admin-only functions must enforce admin in data layer (e.g. getCurrentPlayer, check role) or rely on RLS (RLS enforces; data layer can still check for clearer errors).

### 6.2 Required functions (P2)

- **listSchedules(client)**  
  - Returns list of schedules (id, name, created_at). Optionally with entry count or full entries; minimal P2: list with id/name.
- **getScheduleById(client, scheduleId)**  
  - Returns schedule row plus its schedule_entries (ordered by day_no, session_no), each entry including session_id and optionally session name (join or second query).
- **createSchedule(client, payload)**  
  - Insert schedule; payload: { name }. Returns created schedule. Admin only (RLS).
- **updateSchedule(client, scheduleId, payload)**  
  - Update schedule (e.g. name). Returns updated schedule. Admin only.
- **deleteSchedule(client, scheduleId)**  
  - Delete schedule (CASCADE deletes schedule_entries). Admin only.

- **listSessions(client)**  
  - Returns list of sessions (id, name). Optionally with routine count.
- **getSessionById(client, sessionId)**  
  - Returns session row plus its session_routines (ordered by routine_no), each with routine_id and optionally routine name; optionally expand to routine steps for GE prep (P2 can keep minimal: session + routine ids/names).
- **createSession(client, payload)**  
  - Insert session; payload: { name }. Returns created session.
- **updateSession(client, sessionId, payload)**  
  - Update session (e.g. name). Returns updated session.
- **deleteSession(client, sessionId)**  
  - Delete session (CASCADE deletes session_routines). Admin only. RESTRICT on schedule_entries references: do not delete if referenced.

- **listRoutines(client)**  
  - Returns list of routines (id, name, description).
- **getRoutineById(client, routineId)**  
  - Returns routine row plus its routine_steps (ordered by step_no).
- **createRoutine(client, payload)**  
  - Insert routine; payload: { name, description? }. Returns created routine.
- **updateRoutine(client, routineId, payload)**  
  - Update routine (name, description). Returns updated routine.
- **deleteRoutine(client, routineId)**  
  - Delete routine (CASCADE deletes routine_steps). Admin only. Do not delete if referenced by session_routines (DB RESTRICT).

- **listScheduleEntries(client, scheduleId)**  
  - Returns schedule_entries for a schedule (ordered by day_no, session_no). Used by admin when editing a schedule.
- **setScheduleEntries(client, scheduleId, entries)**  
  - Replace all entries for a schedule: payload array of { day_no, session_no, session_id }. Delete existing, insert new (or upsert by (schedule_id, day_no, session_no)). Idempotent for same input.
- **listSessionRoutines(client, sessionId)**  
  - Returns session_routines for a session (ordered by routine_no).
- **setSessionRoutines(client, sessionId, routines)**  
  - Replace all session_routines: payload array of { routine_no, routine_id }.
- **listRoutineSteps(client, routineId)**  
  - Returns routine_steps for a routine (ordered by step_no).
- **setRoutineSteps(client, routineId, steps)**  
  - Replace all steps: payload array of { step_no, target }.

- **listLevelRequirements(client)**  
  - Returns all level_requirements (ordered by min_level). Used by admin and later by GE/TR.
- **getLevelRequirementByMinLevel(client, minLevel)**  
  - Returns single row for min_level or null.
- **createLevelRequirement(client, payload)**  
  - Insert; payload: { min_level, tgt_hits, darts_allowed }. Unique on min_level.
- **updateLevelRequirement(client, id, payload)**  
  - Update row by id. Returns updated row.
- **deleteLevelRequirement(client, id)**  
  - Delete by id.

### 6.3 Errors

- Map Supabase errors to clear types (NOT_FOUND, FORBIDDEN, CONFLICT for unique violations). No raw Supabase errors or secrets to UI.

---

## 7. Admin UI (web app)

### 7.1 Routes (under `/admin`)

- `/admin/schedules` — List schedules; “New”, “Edit”, “Delete” (with confirm). Edit → `/admin/schedules/:id` (form: name; list of schedule_entries with day_no, session_no, session dropdown).
- `/admin/sessions` — List sessions; New / Edit / Delete. Edit → `/admin/sessions/:id` (name; list of session_routines: routine_no, routine dropdown).
- `/admin/routines` — List routines; New / Edit / Delete. Edit → `/admin/routines/:id` (name, description; list of routine_steps: step_no, target).
- `/admin/level-requirements` — List level_requirements (min_level, tgt_hits, darts_allowed); New / Edit / Delete. One row per decade (0, 10, …, 90).

### 7.2 Navigation

- Add to admin sidebar/nav: “Schedules”, “Sessions”, “Routines”, “Level requirements” (alongside existing “Dashboard”, “Players”).

### 7.3 Behaviour

- All mutations go through `packages/data`. No direct Supabase in UI.
- Delete schedule/session/routine: confirm before delete. Handle RESTRICT (e.g. “Cannot delete session: used in schedule”) with clear message.
- Level requirements: ensure unique min_level on create/update (one row per decade).

---

## 8. Migrations

- All schema changes in `supabase/migrations/`, one migration per logical set. Naming: `YYYYMMDDHHMMSS_description.sql`.
- P2 migrations (suggested order):
  1. Create tables: schedules, schedule_entries, sessions, session_routines, routines, routine_steps, level_requirements (columns and constraints as in §4).
  2. Triggers for updated_at on all seven tables.
  3. RLS: enable RLS; add admin SELECT/INSERT/UPDATE/DELETE policies using `current_user_is_players_admin()`.
  4. Indexes as in §4.8.
- Optional seed: insert default level_requirements rows (0–90 decades per TR spec §7) so admin can edit rather than create from scratch.

---

## 9. Testing and acceptance

- **Unit tests:** Mock client for listSchedules, getScheduleById, createSchedule, listSessions, getSessionById, createSession, listRoutines, getRoutineById, createRoutine, listLevelRequirements, createLevelRequirement, setScheduleEntries, setSessionRoutines, setRoutineSteps. Test NOT_FOUND, FORBIDDEN (non-admin), and success paths.
- **Manual:** Admin can create a schedule with name and entries (day_no, session_no, session); create sessions with routines; create routines with steps; CRUD level requirements. No Game Engine yet; data is ready for P3/P4.

---

## 10. Document history

- **v1.0** — Initial P2 Training Content domain (schedules, sessions, routines, level requirements; schema, RLS, data layer, admin CRUD).
