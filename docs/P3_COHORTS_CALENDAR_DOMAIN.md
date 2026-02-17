# P3 — Cohorts and Calendar: Domain Document

**Document Type:** Domain specification (Phase 3)  
**Project:** OPP Darts Training Platform  
**Audience:** Delivery team, Cursor  
**Status:** v1.0  
**Authority:** Defines all required behaviour for Phase 3 (Cohorts and calendar). Implementation must conform to this document.

---

## 1. Purpose and scope

### 1.1 Purpose

This document describes **every behaviour required for Phase 3 — Cohorts and calendar** so that:

- Implementers can build without ambiguity.
- Acceptance criteria are testable.
- Scope is limited to cohorts, cohort membership, calendar, player_calendar, admin CRUD, and “next session” / “available sessions” for a player; no Game Engine execution or score capture yet.

### 1.2 Phase 3 objectives (from PRD)

- **Cohorts:** Create cohorts with name, level (decade), start/end date, and schedule reference. Cohorts are finite; can be closed.
- **Cohort members:** Assign players to at most one cohort at a time; membership drives which calendar/schedule the player sees and which sessions are “theirs”.
- **Calendar:** Define “what session is scheduled when” for a cohort: datetime, cohort, schedule, day_no, session_no, session_id.
- **Player calendar:** Link each player to calendar entries with status (e.g. planned, completed). Used to show “next session” and “available/missed” sessions.
- **Admin CRUD:** Full create/read/update/delete for cohorts, cohort members, and calendar (and by implication player_calendar when generated from cohort + members).
- **Player-facing reads:** “Next session” and “available sessions” for the current player (current cohort only).

### 1.3 In scope for P3

- Schema and migrations for: `cohorts`, `cohort_members`, `calendar`, `player_calendar`.
- RLS: admin full access; players can read own cohort membership and own player_calendar (and calendar entries for their cohort) for “next session” and “available sessions”.
- Admin UI: CRUD for cohorts (with member assignment and calendar generation), cohort members; view/edit calendar and player_calendar as needed.
- Data layer: list/get for cohorts, cohort_members; list/get for calendar (by cohort); list/get/update for player_calendar (by player). Functions for “next session” and “available sessions” for a player.
- Business rule: at most one cohort per player at a time (enforced in app and/or DB).

### 1.4 Out of scope for P3

- **Game Engine (GE)** — Running a session, recording darts, computing scores (P4).
- **TR/BR/ITA, session/routine scores, dart_scores** — P4/P5.
- **Dashboard UI** (beyond data readiness) — P6; P3 only ensures data and APIs exist.
- **Competitions, match tables** — P7.
- **Notifications** (e.g. “Day 2 - Singles due …”) — P8 or later; placeholder acceptable.

---

## 2. References

- **PRODUCT_REQUIREMENTS.md** — FR-2.1–FR-2.4 (cohorts, cohort members); FR-4.1–FR-4.4 (calendar, player_calendar, available sessions, completion); FR-9.1 (dashboard cohort, next session); FR-12.2 (Admin CRUD).
- **OPP Platform.md** — Tables: cohorts, cohort_members, calendar, player_calendar; structure and examples.
- **OPP Cohort example.md** — Example cohort (BanjaxFruitcake-Mar26, 42 days, Beginner Daily, competition days, finals).
- **P2_TRAINING_CONTENT_DOMAIN.md** — Schedules, schedule_entries, sessions; P3 calendar references schedule_id, day_no, session_no, session_id.
- **P1_FOUNDATION_DOMAIN.md** — Players, auth, admin; RLS and `current_user_is_players_admin()`.
- **RSD_DATA_MODELLING_GUIDE.md** — UUIDs, timestamps, RLS, naming, snake_case.

---

## 3. Data model overview

- **Cohort** — Finite group: name, level (decade), start_date, end_date, schedule_id. Has many cohort_members and many calendar entries.
- **Cohort member** — Links a player to a cohort. A player has at most one active cohort membership at a time.
- **Calendar** — One row per scheduled occurrence for a cohort: scheduled_at (timestamptz), cohort_id, schedule_id, day_no, session_no, session_id. Derived from cohort start_date + schedule_entries (with a configurable or default time of day).
- **Player calendar** — One row per (player, calendar entry): player_id, calendar_id, status (planned | completed). Created when calendar is generated for a cohort, for each member. Completing a session (in P4) will set status to completed.

Relationships:

- `cohorts.schedule_id` → `schedules.id`
- `cohort_members.cohort_id` → `cohorts.id`, `cohort_members.player_id` → `players.id`
- `calendar.cohort_id` → `cohorts.id`, `calendar.schedule_id` → `schedules.id`, `calendar.session_id` → `sessions.id`
- `player_calendar.player_id` → `players.id`, `player_calendar.calendar_id` → `calendar.id`

All tables use UUID primary keys, `created_at` / `updated_at` (trigger-maintained where applicable), and RLS. Naming: plural snake_case tables, snake_case columns.

---

## 4. Tables and schema

### 4.1 `cohorts`

Finite training group with a schedule and date range.

| Column         | Type         | Constraints                    | Description |
|----------------|--------------|--------------------------------|-------------|
| `id`           | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key. |
| `name`         | `text`       | NOT NULL                       | Descriptive name (e.g. BanjaxFruitcake-Mar26). |
| `level`        | `int`        | NOT NULL                       | Decade indicator (e.g. 20 = levels 20–29). |
| `start_date`   | `date`       | NOT NULL                       | First day of cohort. |
| `end_date`     | `date`       | NOT NULL                       | Last day of cohort. |
| `schedule_id`  | `uuid`       | NOT NULL REFERENCES schedules(id) ON DELETE RESTRICT | Schedule followed by this cohort. |
| `created_at`   | `timestamptz`| NOT NULL DEFAULT now()        | Immutable. |
| `updated_at`   | `timestamptz`| NOT NULL DEFAULT now()        | Updated via trigger. |

- **Invariant:** `end_date >= start_date` (CHECK or app).

### 4.2 `cohort_members`

Assignment of players to cohorts.

| Column       | Type         | Constraints                    | Description |
|--------------|--------------|--------------------------------|-------------|
| `id`         | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key. |
| `cohort_id`  | `uuid`       | NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE | Cohort. |
| `player_id`  | `uuid`       | NOT NULL REFERENCES players(id) ON DELETE CASCADE | Player. |
| `created_at` | `timestamptz`| NOT NULL DEFAULT now()        | Immutable. |
| `updated_at` | `timestamptz`| NOT NULL DEFAULT now()        | Updated via trigger. |

- **Unique:** `(cohort_id, player_id)` so a player is in a cohort at most once.
- **Business rule (app or trigger):** A player must not appear in more than one cohort with overlapping or “active” dates (e.g. end_date >= today). Enforced in application layer or via trigger; exact rule (e.g. “at most one cohort where end_date >= current_date”) to be implemented in P3.

### 4.3 `calendar`

Planned session occurrences for a cohort. One row per (cohort, day_no, session_no).

| Column        | Type         | Constraints                    | Description |
|---------------|--------------|--------------------------------|-------------|
| `id`          | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key. |
| `scheduled_at`| `timestamptz`| NOT NULL                       | When this session is scheduled. |
| `cohort_id`   | `uuid`       | NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE | Cohort. |
| `schedule_id` | `uuid`       | NOT NULL REFERENCES schedules(id) ON DELETE RESTRICT | Denormalised for convenience. |
| `day_no`      | `int`        | NOT NULL, ≥ 1                  | Training day number. |
| `session_no`  | `int`        | NOT NULL, ≥ 1                  | Session index within that day. |
| `session_id`  | `uuid`       | NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT | Session to run. |
| `created_at`  | `timestamptz`| NOT NULL DEFAULT now()         | Immutable. |
| `updated_at`  | `timestamptz`| NOT NULL DEFAULT now()         | Updated via trigger. |

- **Unique:** `(cohort_id, day_no, session_no)` so each slot is defined once per cohort.
- **Generation:** Rows are created when “generating” or “publishing” the calendar for a cohort: for each schedule_entry of the cohort’s schedule, compute `scheduled_at` = cohort.start_date + (day_no - 1) days + time-of-day (default or configurable, e.g. 19:00). P3 implementation may add a cohort-level “default session time” or use a platform default.

### 4.4 `player_calendar`

Player-specific view of calendar entries; status drives “next” and “available” sessions.

| Column       | Type         | Constraints                    | Description |
|--------------|--------------|--------------------------------|-------------|
| `id`         | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key. |
| `player_id`  | `uuid`       | NOT NULL REFERENCES players(id) ON DELETE CASCADE | Player. |
| `calendar_id`| `uuid`       | NOT NULL REFERENCES calendar(id) ON DELETE CASCADE | Calendar entry. |
| `status`     | `text`       | NOT NULL                       | `planned` or `completed`. |
| `created_at` | `timestamptz`| NOT NULL DEFAULT now()        | Immutable. |
| `updated_at` | `timestamptz`| NOT NULL DEFAULT now()        | Updated via trigger. |

- **Unique:** `(player_id, calendar_id)` so one row per player per calendar entry.
- **Status values:** `planned`, `completed` (P4 will set to completed when session is finished).

### 4.5 Indexes and triggers

- **Indexes:**  
  `cohort_members(cohort_id)`, `cohort_members(player_id)`;  
  `calendar(cohort_id)`, `calendar(scheduled_at)`, `calendar(cohort_id, day_no, session_no)` (unique);  
  `player_calendar(player_id)`, `player_calendar(calendar_id)`, `player_calendar(player_id, status)` (for “available” queries).
- **Triggers:** `updated_at = now()` on BEFORE UPDATE for: cohorts, cohort_members, calendar, player_calendar (reuse P1-style trigger pattern).

---

## 5. Row Level Security (RLS)

### 5.1 Principle

- All four tables have RLS enabled. Default: DENY.
- **Admins:** Full SELECT, INSERT, UPDATE, DELETE on cohorts, cohort_members, calendar, player_calendar (same condition as P1: `current_user_is_players_admin()`).
- **Players:**  
  - May SELECT cohorts in which they are a member (via cohort_members).  
  - May SELECT calendar rows for cohorts they belong to.  
  - May SELECT and UPDATE their own player_calendar rows (SELECT for “next session” / “available sessions”; UPDATE for P4 when marking completed).  
  - No INSERT/DELETE on cohorts, calendar; no INSERT/DELETE on cohort_members (admin only). Player_calendar rows are created when admin generates calendar for a cohort; players do not create/delete them.

### 5.2 Policies (per table)

- **cohorts**  
  - SELECT: admin OR player is in cohort_members for this cohort.  
  - INSERT / UPDATE / DELETE: admin only.
- **cohort_members**  
  - SELECT: admin OR player is the row’s player_id (own membership).  
  - INSERT / UPDATE / DELETE: admin only.
- **calendar**  
  - SELECT: admin OR current user’s player row is in cohort_members for calendar.cohort_id.  
  - INSERT / UPDATE / DELETE: admin only.
- **player_calendar**  
  - SELECT: admin OR row’s player_id = current user’s player id.  
  - UPDATE: admin OR row’s player_id = current user’s player id (for status updates in P4).  
  - INSERT / DELETE: admin only (bulk creation when generating calendar; no player self-assign).

Use `auth.uid()` to resolve current user’s `players.id` (e.g. via a helper like `current_user_player_id()`). Use SECURITY DEFINER helpers where policies reference `players` to avoid recursion.

---

## 6. Data access layer (`packages/data`)

### 6.1 Rules

- All access via `packages/data`; no direct Supabase from UI or app code.
- Admin-only mutations enforced by RLS; data layer can check admin for clearer errors.

### 6.2 Required functions (P3)

**Cohorts**

- **listCohorts(client)** — List cohorts (id, name, level, start_date, end_date, schedule_id). Admin sees all; player sees only cohorts they belong to (or restrict to admin if UI is admin-only in P3).
- **getCohortById(client, cohortId)** — Cohort row plus optional schedule name and member count.
- **createCohort(client, payload)** — Insert cohort; payload: { name, level, start_date, end_date, schedule_id }. Admin only.
- **updateCohort(client, cohortId, payload)** — Update cohort. Admin only.
- **deleteCohort(client, cohortId)** — Delete cohort (CASCADE to cohort_members and calendar and player_calendar). Admin only.

**Cohort members**

- **listCohortMembers(client, cohortId)** — List cohort_members for a cohort (player_id, optional player display_name).
- **addCohortMember(client, cohortId, playerId)** — Insert cohort_member. Enforce “at most one cohort per player” in app or DB. Admin only.
- **removeCohortMember(client, cohortId, playerId)** — Delete one cohort_member. Admin only.
- **getCurrentCohortForPlayer(client, playerId)** — Return the single active cohort for the player (e.g. cohort where player is member and cohort.end_date >= current_date), or null.

**Calendar**

- **listCalendarByCohort(client, cohortId)** — Calendar rows for cohort (ordered by scheduled_at). Admin or member.
- **generateCalendarForCohort(client, cohortId, options?)** — Create calendar rows from cohort’s schedule and start_date; optional default time-of-day. Then create player_calendar rows for each cohort_member with status `planned`. Idempotent: replace or skip if calendar already exists for that cohort (define behaviour: e.g. delete existing calendar for cohort and regenerate, or no-op if any exist). Admin only.
- **getCalendarEntryById(client, calendarId)** — Single calendar row with cohort and session info.

**Player calendar**

- **listPlayerCalendar(client, playerId, filters?)** — player_calendar rows for player (optional: status, from/to date). For “available sessions” use status=planned and optionally scheduled_at in range.
- **getNextSessionForPlayer(client, playerId)** — The next upcoming session for the player: single calendar entry (with session name, scheduled_at, day_no, session_no) for which player_calendar exists with status `planned` and scheduled_at >= now(), ordered by scheduled_at ASC, limit 1. Return null if none.
- **getAvailableSessionsForPlayer(client, playerId)** — “Available” = next scheduled + missed: all calendar entries for the player where player_calendar.status = `planned` and (scheduled_at >= now() OR scheduled_at in “recent” past, e.g. last 24–48 hours). Ordered by scheduled_at ASC. Design note: whether missed sessions expire after 1 day (or other window) is a product choice; domain allows filtering by date range.
- **updatePlayerCalendarStatus(client, playerCalendarId, status)** — Set status to `completed` (or keep `planned`). Used in P4 when session completes; P3 can expose for admin/testing.

### 6.3 Errors

- Map Supabase errors to clear types (NOT_FOUND, FORBIDDEN, CONFLICT). No raw errors or secrets to UI.

---

## 7. Admin UI (web app)

### 7.1 Routes (under `/admin`)

- **/admin/cohorts** — List cohorts; “New”, “Edit”, “Delete” (with confirm). Edit → `/admin/cohorts/:id`: name, level, start_date, end_date, schedule (dropdown), members (list + add/remove player), “Generate calendar” (if not yet generated or allow regenerate).
- **/admin/cohorts/:id/members** — Manage cohort members (add/remove players); ensure “at most one cohort per player” is surfaced (e.g. warn if player already in another active cohort).
- **/admin/cohorts/:id/calendar** — View and edit calendar entries for the cohort (list by scheduled_at). Admin can edit each entry: at least **scheduled_at** (datetime); optionally **session_id** (reassign to another session). Link to session. View player_calendar status per member if needed.

### 7.2 Navigation

- Add to admin sidebar: “Cohorts” (and sub or inline: members, calendar as above).

### 7.3 Behaviour

- All mutations via `packages/data`. No direct Supabase.
- Generate calendar: one action that creates calendar + player_calendar; confirm before overwrite if idempotency is “replace”.
- At most one cohort per player: validate on add member and show clear error if player already in another active cohort.

---

## 8. “Next session” and “available sessions”

- **Next session:** The single next upcoming planned session for the player (current cohort only): minimum `scheduled_at` where `player_calendar.player_id = current player` and `player_calendar.status = 'planned'` and `scheduled_at >= now()`. Exposed via `getNextSessionForPlayer`.
- **Available sessions:** All planned sessions for the player that are either upcoming or “recently missed” (e.g. scheduled_at in the past but within last 24–48 hours). Exposed via `getAvailableSessionsForPlayer`. Used by GE in P4 to show “next scheduled + missed” list; P3 only defines and implements the data and API.

---

## 9. Migrations

- All schema changes in `supabase/migrations/`, one migration per logical set. Naming: `YYYYMMDDHHMMSS_description.sql`.
- P3 migrations (suggested order):
  1. Create tables: cohorts, cohort_members, calendar, player_calendar (columns and constraints as in §4).
  2. Triggers for updated_at on all four tables.
  3. RLS: enable RLS; add admin and player policies as in §5.
  4. Indexes as in §4.5.
- Optional: trigger or constraint to enforce “player in at most one active cohort” (e.g. unique partial index or application-level check).

---

## 10. Testing and acceptance

- **Unit tests:** Mock client for listCohorts, getCohortById, createCohort, listCohortMembers, addCohortMember, removeCohortMember, getCurrentCohortForPlayer; listCalendarByCohort, generateCalendarForCohort; listPlayerCalendar, getNextSessionForPlayer, getAvailableSessionsForPlayer, updatePlayerCalendarStatus. Test NOT_FOUND, FORBIDDEN (non-admin where required), and success paths. Test “at most one cohort per player” behaviour.
- **Manual:** Admin creates cohort with schedule and dates; adds members; generates calendar. Calendar and player_calendar rows created. Player (or admin as player) can call getNextSessionForPlayer and getAvailableSessionsForPlayer and see correct results. No GE execution yet.

---

## 11. Document history

- **v1.0** — Initial P3 Cohorts and calendar domain (cohorts, cohort_members, calendar, player_calendar; schema, RLS, data layer, admin CRUD, next/available sessions).
