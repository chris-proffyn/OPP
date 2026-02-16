# P4 — Game Engine: Domain Document

**Document Type:** Domain specification (Phase 4)  
**Project:** OPP Darts Training Platform  
**Audience:** Delivery team, Cursor  
**Status:** v1.0  
**Authority:** Defines all required behaviour for Phase 4 (Game Engine core). Implementation must conform to this document.

---

## 1. Purpose and scope

### 1.1 Purpose

This document describes **every behaviour required for Phase 4 — Game Engine core** so that:

- Implementers can build without ambiguity.
- Acceptance criteria are testable.
- Scope is limited to: running a training session, recording darts, computing routine and session scores, persisting to `dart_scores` and related tables, level check and display. TR progression (CR update) is P5; ITA/BR and competition sessions are P5/P7.

### 1.2 Phase 4 objectives (from PRD)

- **GE UI:** Player selects a session from available sessions (next + missed); GE guides them through session → routines → steps; manual dart input first; store every throw and derived scores.
- **Score capture:** Record target, actual, hit/miss per dart (`dart_scores`); compute round score = (hits / target hits) × 100; routine score and session score = averages as per Training Rating spec; store routine and session scores.
- **Persistence:** `session_runs` (one per player per calendar session), `dart_scores`, `player_routine_scores`; session score stored on `session_runs` or equivalent; mark `player_calendar` entry as `completed` when session ends.
- **Level check and display:** Read `level_requirements` for player’s level decade; display expected (e.g. 2/9) and current performance; no CR/TR update in P4 (P5).

### 1.3 In scope for P4

- Schema and migrations for: `session_runs` (training event), `dart_scores`, `player_routine_scores` (and optionally a dedicated `player_session_scores` table if not folded into `session_runs`).
- RLS: players can create/read/update own session runs and own dart/routine/session scores; admins can read all.
- GE UI: list available sessions → select session → game screen (context, progress) → start → per routine: show step, target, record darts → round/routine score → next routine → end session → save all, set player_calendar to completed.
- Scoring logic: round % = (hits / target hits) × 100; routine score = average of round scores in that routine; session score = average of round scores (or of routine scores) per TR spec; persist after each routine and at session end.
- Data layer: start session run, record darts, save routine score, complete session run (session score, update player_calendar); read session/routine structure from existing P2/P3 data.
- Level check: display player’s level (from `players`), level requirement (e.g. 2/9 for decade 20–29), and current performance; no CR change.

### 1.4 Out of scope for P4

- **TR progression (CR update)** — Session score → level change (−1/0/+1/+2/+3) and CR clamp 1–99 are P5.
- **ITA / BR / Initial Training Assessment** — P5.
- **Voice input** — P8; P4 is manual input only.
- **Competition sessions, match results, MR/OMR** — P7.
- **Dashboard UI** (beyond data readiness) — P6; P4 only ensures GE works and data is stored; dashboard can show “next session” using existing P3 APIs.
- **Performance Analyzer** — P6.

---

## 2. References

- **PRODUCT_REQUIREMENTS.md** — FR-4.3, FR-4.4 (available sessions, completion); FR-5.1–FR-5.4 (GE session start, routine execution, round/visit score, session end); FR-6.x (TR referenced for scoring structure only; progression in P5).
- **OPP Platform.md** — Game Engine section (GE landing, game screen, session start, routine details, score input); tables: dart_scores, Player Session Scores, Player routine scores; scoring at dart, round, session level.
- **OPP_TRAINING_RATING_ENGINE_SPEC_v2.md** — §6 Training Scoring Mechanism (round score = hits/target×100, session score = average of round scores); §7 Level requirements (per-decade tgt_hits, darts_allowed); §8 Progression (deferred to P5).
- **P2_TRAINING_CONTENT_DOMAIN.md** — Sessions, session_routines, routines, routine_steps (target per step); level_requirements.
- **P3_COHORTS_CALENDAR_DOMAIN.md** — Calendar, player_calendar; getNextSessionForPlayer, getAvailableSessionsForPlayer; updatePlayerCalendarStatus.
- **P1_FOUNDATION_DOMAIN.md** — Players (id, role, baseline_rating, training_rating, etc.); auth; RLS.
- **RSD_DATA_MODELLING_GUIDE.md** — UUIDs, timestamps, RLS, snake_case.

---

## 3. Data model overview

- **Session run (training event)** — One row per “player is doing this calendar session”. Links player, calendar entry, and optional started_at/completed_at/session_score. Its `id` is the `training_id` used in dart_scores and player_routine_scores.
- **Dart score** — One row per dart: player_id, training_id (session_run.id), routine_id, routine_no (which routine in session order), step/dart identifier, target, actual, result (hit/miss). Enables round score = (hits / target hits) × 100.
- **Player routine score** — One row per (training_id, routine_id): routine_score % for that routine within that session run.
- **Session score** — Stored on `session_runs` as `session_score` (nullable until session end), or in a separate `player_session_scores` table keyed by training_id; domain allows either. This doc uses `session_runs.session_score` for simplicity.

Relationships:

- `session_runs.player_id` → `players.id`
- `session_runs.calendar_id` → `calendar.id`
- `dart_scores.training_id` → `session_runs.id` (or equivalent)
- `dart_scores.routine_id` → `routines.id`
- `player_routine_scores.training_id` → `session_runs.id`, `player_routine_scores.routine_id` → `routines.id`

Calendar gives session_id; session gives ordered routines; each routine gives ordered steps (targets). One “round” in the TR spec = one visit (e.g. 9 darts at a step or group of steps). For simplicity, **round** = one routine step’s darts (e.g. 3 darts or 9 darts per step depending on routine design). Round score = (hits for that round / target hits for that round) × 100. Routine score = average of round scores in that routine. Session score = average of all round scores in the session. (TR spec: “Session Score = Average of Round Scores”.)

---

## 4. Tables and schema

### 4.1 `session_runs`

One row per player undertaking a specific calendar session (training event). Provides `training_id` for dart_scores and player_routine_scores.

| Column          | Type         | Constraints                    | Description |
|-----------------|--------------|--------------------------------|-------------|
| `id`            | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Training event id (training_id). |
| `player_id`     | `uuid`       | NOT NULL REFERENCES players(id) ON DELETE CASCADE | Player. |
| `calendar_id`   | `uuid`       | NOT NULL REFERENCES calendar(id) ON DELETE CASCADE | Calendar entry (session, day_no, session_no). |
| `started_at`    | `timestamptz`| NOT NULL DEFAULT now()         | When the run started. |
| `completed_at`  | `timestamptz`| NULL                           | Set when session ends. |
| `session_score` | `numeric`    | NULL                           | Session score %; set at session end. |
| `created_at`    | `timestamptz`| NOT NULL DEFAULT now()         | Immutable. |
| `updated_at`    | `timestamptz`| NOT NULL DEFAULT now()         | Updated via trigger. |

- **Unique:** `(player_id, calendar_id)` so a player has at most one run per calendar entry (one session completion per scheduled slot).
- **Indexes:** `session_runs(player_id)`, `session_runs(calendar_id)`, `session_runs(player_id, calendar_id)` (unique).

### 4.2 `dart_scores`

One row per dart thrown. High volume; index by training_id and (training_id, routine_id) for GE and analytics.

| Column        | Type         | Constraints                    | Description |
|---------------|--------------|--------------------------------|-------------|
| `id`          | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key. |
| `player_id`   | `uuid`       | NOT NULL REFERENCES players(id) ON DELETE CASCADE | Player. |
| `training_id` | `uuid`       | NOT NULL REFERENCES session_runs(id) ON DELETE CASCADE | Session run (training event). |
| `routine_id`  | `uuid`       | NOT NULL REFERENCES routines(id) ON DELETE RESTRICT | Routine. |
| `routine_no`  | `int`        | NOT NULL, ≥ 1                 | Routine order in session (1 = first routine). |
| `step_no`     | `int`        | NOT NULL, ≥ 1                 | Step order within routine (from routine_steps). |
| `dart_no`     | `int`        | NOT NULL, ≥ 1                 | Dart index within step/visit (e.g. 1–3 or 1–9). |
| `target`      | `text`       | NOT NULL                      | Target segment (e.g. S20, D16). |
| `actual`      | `text`       | NOT NULL                      | Segment hit (e.g. S20, S5, M). |
| `result`      | `text`       | NOT NULL                      | `H` (hit) or `M` (miss). |
| `created_at`  | `timestamptz`| NOT NULL DEFAULT now()        | Immutable. |

- **Indexes:** `dart_scores(training_id)`, `dart_scores(player_id)`, `dart_scores(training_id, routine_id)`. Consider partitioning by training_id or time later (NFR-10).

### 4.3 `player_routine_scores`

One row per (training_id, routine_id): routine score % for that routine in that session run.

| Column          | Type         | Constraints                    | Description |
|-----------------|--------------|--------------------------------|-------------|
| `id`            | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Table primary key. |
| `player_id`     | `uuid`       | NOT NULL REFERENCES players(id) ON DELETE CASCADE | Player. |
| `training_id`   | `uuid`       | NOT NULL REFERENCES session_runs(id) ON DELETE CASCADE | Session run. |
| `routine_id`    | `uuid`       | NOT NULL REFERENCES routines(id) ON DELETE RESTRICT | Routine. |
| `routine_score` | `numeric`    | NOT NULL                      | Routine score % (0–100+). |
| `created_at`    | `timestamptz`| NOT NULL DEFAULT now()        | Immutable. |
| `updated_at`    | `timestamptz`| NOT NULL DEFAULT now()         | Updated via trigger. |

- **Unique:** `(training_id, routine_id)` so one score per routine per session run.
- **Indexes:** `player_routine_scores(training_id)`, `player_routine_scores(player_id)`.

### 4.4 Triggers and indexes

- **Triggers:** `updated_at = now()` on BEFORE UPDATE for `session_runs`, `player_routine_scores` (reuse P1-style trigger pattern).
- **Indexes:** As above; no trigger on `dart_scores` (append-only, no update).

---

## 5. Row Level Security (RLS)

### 5.1 Principle

- All new tables have RLS enabled. Default: DENY.
- **Players:** May INSERT/SELECT/UPDATE their own rows only (`player_id` = current user’s player id, or `training_id` belonging to a session_run where `player_id` = current user’s player id for dart_scores and player_routine_scores).
- **Admins:** Full SELECT (and optionally UPDATE for corrections) on all; INSERT/UPDATE/DELETE as needed (e.g. admin may create session_run for a player for testing; policy can allow admin to do everything).

### 5.2 Policies (per table)

- **session_runs**  
  - SELECT: admin OR row’s `player_id` = current user’s player id.  
  - INSERT: admin OR row’s `player_id` = current user’s player id (player starts own session).  
  - UPDATE: admin OR row’s `player_id` = current user’s player id (player completes own session, sets session_score).  
  - DELETE: admin only (or deny; allow only for cleanup by admin).

- **dart_scores**  
  - SELECT: admin OR row’s `player_id` = current user’s player id.  
  - INSERT: admin OR row’s `player_id` = current user’s player id.  
  - UPDATE/DELETE: admin only (darts are immutable once written; or allow update only during same session run if product requires).

- **player_routine_scores**  
  - SELECT: admin OR row’s `player_id` = current user’s player id.  
  - INSERT: admin OR row’s `player_id` = current user’s player id.  
  - UPDATE: admin OR row’s `player_id` = current user’s player id.

Use `current_user_player_id()` (SECURITY DEFINER) where policies need the current user’s `players.id`.

---

## 6. Scoring logic

Per **OPP_TRAINING_RATING_ENGINE_SPEC_v2.md** §6:

- **Round score (%)** = (Actual hits / Target hits) × 100.  
  Target hits per round = 1 per dart that has the same target (e.g. 9 darts at S20 → target 9 hits; or 3 darts at S20 → target 3 hits). Scores may exceed 100%.
- **Routine score (%)** = Average of round scores for that routine.
- **Session score (%)** = Average of round scores for the whole session (equivalently: average of routine scores if each routine contributes one or more rounds).

Implementation notes:

- Each **routine step** has one target (e.g. S20). A “round” can be defined as one step: e.g. 3 darts at that step → round score = (hits/3)×100; or 9 darts at that step → (hits/9)×100. The TR spec uses “9 darts” typically; routine_steps define one target per step, so multiple steps (e.g. 9 steps of 1 dart, or 3 steps of 3 darts) form the routine. For **round** we take “one visit” = one set of darts at one step: e.g. step has target S20, 3 darts thrown → round = (hits/3)×100. So **round** = one (step_no, dart_no 1..N) group; target hits = number of darts at that step (usually 3 or 9).
- **Level requirements:** Per decade, `tgt_hits` and `darts_allowed` (e.g. 2/9 for level 20–29). Used in P4 for **display only** (expected vs actual); progression (CR change) in P5.

---

## 7. Game Engine flow (UI and orchestration)

### 7.1 GE entry and session selection

- **Entry:** From player dashboard, “Play” / “Training” menu, or direct link. GE landing page shows **all sessions** for the player via `getAllSessionsForPlayer(client, playerId)`: every calendar entry in their player_calendar, with **status** (Completed, Due, Future) and **session score** (for completed sessions, from session_runs). Ordered by scheduled_at.
- **Selection:** Player selects one session (one calendar entry). GE resolves: calendar_id → cohort, schedule, day_no, session_no, session_id → session name; load session with routines and each routine with steps (getSessionById, getRoutineById or equivalent). Access is validated by presence in getAllSessionsForPlayer (so Completed sessions can be opened to view).

### 7.2 Game screen (context)

Display before and during session:

- Player name (from context).
- Current ratings: PR, TR, MR (from player; may show “—” or 0 if not yet set in P4).
- Cohort name (from calendar → cohort).
- Schedule, day no, session no, session name.
- Progress: “Routine x of y”, “Step no”, “Visit no” (optional).
- Current session score (running average of round scores; update after each round/routine).

### 7.3 Session start

- Player taps “Start” or “Go!”.
- **Create session_run:** INSERT into `session_runs` (player_id, calendar_id, started_at). No completed_at or session_score yet.
- GE state: current routine index = 1, current step index = 1, darts in current step = 0.

### 7.4 Routine execution

- For each **routine** in session order:
  - Show routine name.
  - For each **step** in routine (routine_steps ordered by step_no):
    - Show step no, target segment (e.g. “S20”, “Single 20”).
    - **Visit entry:** Players enter the **entire visit** (all darts for that step) in one go. One “visit” = N darts (N = 3 or 9 from level_requirements.darts_allowed).
    - **Segment grid:** Input is a grid of all scoring segments so the player can record what they actually hit per dart:
      - **Singles:** S1–S20
      - **Doubles:** D1–D20
      - **Trebles:** T1–T20
      - **25** (outer bull), **Bull** (bullseye)
      - **Miss** — when the player scores nothing on that dart (no segment hit).
    - Player selects one segment (or Miss) per dart until N darts are chosen, then submits the visit. Each dart is stored with **actual** = the segment code (e.g. S20, T20, M) and **result** = 'H' if actual matches the step target, else 'M'. Round score = (hits / target hits) × 100 as before.
    - On submit: INSERT into `dart_scores` one row per dart (player_id, training_id, routine_id, routine_no, step_no, dart_no, target, actual, result H/M). **actual** records the segment hit (e.g. S20, D16, T20, 25, Bull, M).
    - After darts for that step: compute round score = (hits / N) × 100; display.
  - After all steps in routine: compute **routine score** = average of round scores; INSERT or UPDATE `player_routine_scores` (training_id, routine_id, routine_score).
  - Optionally show “Routine complete: X%”. Advance to next routine.

### 7.5 Session end

- When all routines are complete:
  - Compute **session score** = average of all round scores (or average of routine scores).
  - UPDATE `session_runs` SET completed_at = now(), session_score = &lt;value&gt;.
  - **Mark player_calendar completed:** Find player_calendar row for (player_id, calendar_id); call `updatePlayerCalendarStatus(client, playerCalendarId, 'completed')` (P3).
  - Display summary: session score, routine scores; “Return to dashboard” or similar.

### 7.6 Level check and display

- **Level:** From `players.training_rating` (or baseline_rating) to get current level/decade (e.g. 24 → decade 20–29).
- **Requirement:** From `level_requirements` where min_level = 20 (decade start): e.g. tgt_hits = 2, darts_allowed = 9 → “Expected: 2/9”.
- **Display:** Show “Your level: 24”, “Expected this round: 2/9”, “Your score: 3/9” (or %). No update to CR in P4.

### 7.7 Edge cases

- **Abandon session:** If player leaves without completing, session_run remains with completed_at = NULL; player_calendar stays `planned`. Optionally allow “Resume” later (same session_run) or “Abandon” (leave as-is or mark abandoned in UI only; no DB change required for MVP).
- **Duplicate start:** Enforce unique (player_id, calendar_id) on session_runs; second start for same calendar returns error or reuses existing run (product choice).

---

## 8. Data access layer (`packages/data`)

### 8.1 Rules

- All access via `packages/data`; no direct Supabase from UI.
- GE reads: getAllSessionsForPlayer (all sessions with status and session_score), getAvailableSessionsForPlayer (P3, optional), getSessionById (with routines), getRoutineById (with steps), getCurrentPlayer, getCohortById or calendar/session info; level_requirements (list or by min_level).
- GE writes: createSessionRun, insertDartScore(s) or bulk, saveRoutineScore, completeSessionRun (set session_score, completed_at), updatePlayerCalendarStatus.

### 8.2 Required functions (P4)

**Session runs**

- **createSessionRun(client, playerId, calendarId)** — INSERT session_run (player_id, calendar_id, started_at). Returns session_run (id, …). Enforce unique (player_id, calendar_id); if row exists, return existing or throw CONFLICT per product choice.
- **getSessionRunByPlayerAndCalendar(client, playerId, calendarId)** — Return session_run row or null (for resume/display).
- **completeSessionRun(client, sessionRunId, sessionScore)** — UPDATE session_runs SET completed_at = now(), session_score = sessionScore WHERE id = sessionRunId. Player must own the run (or admin).

**Dart scores**

- **insertDartScore(client, payload)** — INSERT one row into dart_scores. Payload: player_id, training_id, routine_id, routine_no, step_no, dart_no, target, actual, result. Return created row or void.
- **insertDartScores(client, payloads)** — Bulk INSERT dart_scores (optional; for efficiency after a round).

**Player routine scores**

- **upsertPlayerRoutineScore(client, payload)** — INSERT or UPDATE player_routine_scores (player_id, training_id, routine_id, routine_score). Unique on (training_id, routine_id).

**Reads (existing or extend)**

- Use existing: getAvailableSessionsForPlayer, getNextSessionForPlayer, updatePlayerCalendarStatus (P3); getSessionById, getRoutineById (P2); getCurrentPlayer (P1).
- **getLevelRequirements(client)** or **getLevelRequirementByMinLevel(client, minLevel)** — Read level_requirements for display (P2 may already expose list; add by-min_level if needed).

### 8.3 Errors

- Map to DataError: NOT_FOUND (e.g. calendar/session invalid), FORBIDDEN (not own run), CONFLICT (duplicate session run if applicable). No raw errors to UI.

---

## 9. Player-facing GE UI (web app)

### 9.1 Routes

- **/play** or **/training** — GE landing: list **all sessions** (from getAllSessionsForPlayer). Each item: session name, scheduled_at, day no, session no, **Status** (Completed / Due / Future), **Score** (session score % for completed, "—" otherwise); action **Start** (Due/Future) or **View** (Completed) → `/play/session/:calendarId`. Each item: session name, scheduled_at, day no, session no; action “Start”.
- **/play/session/:calendarId** (or similar) — Game screen for one calendar entry: load session + routines + steps; start → run → complete; then redirect to landing or dashboard. Session score is shown during play (running) and in the end summary.

### 9.2 Behaviour

- All data via `packages/data`. No direct Supabase.
- Manual dart input only in P4 (voice in P8).
- After session end: player_calendar updated to completed; session_run completed_at and session_score set; dart_scores and player_routine_scores persisted.

### 9.3 Accessibility and UX

- Mobile-first; clear prompts for target and result; immediate feedback (round score, routine score). Errors (e.g. “Session already completed”) clear and actionable.

---

## 10. Migrations

- All schema changes in `supabase/migrations/`, naming: `YYYYMMDDHHMMSS_add_game_engine_tables.sql` (or split as needed).
- Suggested order:
  1. Create `session_runs` (columns, unique (player_id, calendar_id), FK, indexes).
  2. Create `dart_scores` (columns, FK, indexes).
  3. Create `player_routine_scores` (columns, unique (training_id, routine_id), FK, indexes).
  4. Triggers for updated_at on session_runs, player_routine_scores.
  5. RLS: enable RLS; add policies as in §5.

---

## 11. Testing and acceptance

- **Unit tests (data layer):** Mock client for createSessionRun, getSessionRunByPlayerAndCalendar, completeSessionRun; insertDartScore(s); upsertPlayerRoutineScore. Test NOT_FOUND, FORBIDDEN, CONFLICT (duplicate run) where applicable.
- **Scoring logic:** Unit tests for round score = (hits/target)×100; routine score = average of rounds; session score = average of rounds (or routines). No CR update in P4.
- **Integration / manual:** Player signs in, sees available sessions; starts one session; enters darts for each step (manual); completes session; verify session_runs row has completed_at and session_score; dart_scores and player_routine_scores rows exist; player_calendar status = completed. Level requirement displayed correctly for player’s decade.

---

## 12. Document history

- **v1.0** — Initial P4 Game Engine domain (session_runs, dart_scores, player_routine_scores; schema, RLS, scoring logic, GE flow, data layer, level check; no TR progression, no voice, no competition).
