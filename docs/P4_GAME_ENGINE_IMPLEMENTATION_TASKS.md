# P4 — Game Engine: Implementation Tasks

**Document Type:** Implementation plan (Phase 4)  
**Project:** OPP Darts Training Platform  
**Spec reference:** `docs/P4_GAME_ENGINE_DOMAIN.md`  
**Status:** Not started

---

## 1. Migrations and schema

Per domain §4 and §10.

- [x] **1.1** Create migration file(s) in `supabase/migrations/` (Supabase timestamp naming, e.g. `YYYYMMDDHHMMSS_add_game_engine_tables.sql`).
- [x] **1.2** In migration: create **`session_runs`** table — `id` (uuid PK, gen_random_uuid), `player_id` (NOT NULL REFERENCES players(id) ON DELETE CASCADE), `calendar_id` (NOT NULL REFERENCES calendar(id) ON DELETE CASCADE), `started_at` (timestamptz NOT NULL DEFAULT now()), `completed_at` (timestamptz NULL), `session_score` (numeric NULL), `created_at`, `updated_at` (timestamptz NOT NULL DEFAULT now()). Add UNIQUE (player_id, calendar_id).
- [x] **1.3** In migration: create **`dart_scores`** table — `id` (uuid PK), `player_id` (NOT NULL REFERENCES players(id) ON DELETE CASCADE), `training_id` (NOT NULL REFERENCES session_runs(id) ON DELETE CASCADE), `routine_id` (NOT NULL REFERENCES routines(id) ON DELETE RESTRICT), `routine_no` (int NOT NULL ≥ 1), `step_no` (int NOT NULL ≥ 1), `dart_no` (int NOT NULL ≥ 1), `target` (text NOT NULL), `actual` (text NOT NULL), `result` (text NOT NULL; 'H' or 'M'), `created_at` (timestamptz NOT NULL DEFAULT now()). Optionally add CHECK (result IN ('H', 'M')).
- [x] **1.4** In migration: create **`player_routine_scores`** table — `id` (uuid PK), `player_id` (NOT NULL REFERENCES players(id) ON DELETE CASCADE), `training_id` (NOT NULL REFERENCES session_runs(id) ON DELETE CASCADE), `routine_id` (NOT NULL REFERENCES routines(id) ON DELETE RESTRICT), `routine_score` (numeric NOT NULL), `created_at`, `updated_at`. Add UNIQUE (training_id, routine_id).
- [x] **1.5** In migration: add **triggers** for `updated_at = now()` on BEFORE UPDATE for `session_runs` and `player_routine_scores` (reuse P1-style set_updated_at or equivalent). No trigger on `dart_scores` (append-only).
- [x] **1.6** In migration: **enable RLS** on all three tables. **session_runs:** SELECT/INSERT/UPDATE allow when row’s player_id = current_user_player_id() OR current_user_is_players_admin(); DELETE admin only. **dart_scores:** SELECT/INSERT allow when row’s player_id = current_user_player_id() OR admin; UPDATE/DELETE admin only. **player_routine_scores:** SELECT/INSERT/UPDATE allow when row’s player_id = current_user_player_id() OR admin. Use `current_user_player_id()` (existing P3 helper) in policies.
- [x] **1.7** In migration: add **indexes** — session_runs(player_id), session_runs(calendar_id), session_runs(player_id, calendar_id) unique; dart_scores(training_id), dart_scores(player_id), dart_scores(training_id, routine_id); player_routine_scores(training_id), player_routine_scores(player_id).
- [x] **1.8** Apply migration(s) to Supabase project; verify tables, triggers, RLS policies, and indexes exist. Run `supabase db push` when project is linked.

**Migration order note:** session_runs first (depends on players, calendar); then dart_scores and player_routine_scores (depend on session_runs, routines).

---

## 2. Data layer — types and exports

Per domain §8. Types match DB (snake_case); ids as string.

- [x] **2.1** In `packages/data`: define TypeScript types **SessionRun**, **DartScore**, **PlayerRoutineScore** (match table columns; ids as string).
- [x] **2.2** Define payload types: **CreateSessionRunPayload** or use (playerId, calendarId); **DartScorePayload** ({ player_id, training_id, routine_id, routine_no, step_no, dart_no, target, actual, result }); **PlayerRoutineScorePayload** ({ player_id, training_id, routine_id, routine_score }). Result type for **completeSessionRun** (session_score, completed_at).
- [x] **2.3** Export all new types from `packages/data`. Ensure **DataError** / **isDataError** (NOT_FOUND, FORBIDDEN, CONFLICT) remain the error contract for new functions.

---

## 3. Data layer — session runs

Per domain §8.2. All functions accept Supabase client.

- [x] **3.1** **createSessionRun(client, playerId, calendarId)** — INSERT session_run (player_id, calendar_id, started_at). Return created row. Enforce unique (player_id, calendar_id): if row already exists, either return existing run (for resume) or throw CONFLICT; document product choice (e.g. CONFLICT with message “Session already started”).
- [x] **3.2** **getSessionRunByPlayerAndCalendar(client, playerId, calendarId)** — SELECT session_run where player_id = playerId and calendar_id = calendarId; return row or null (for resume/display).
- [x] **3.3** **completeSessionRun(client, sessionRunId, sessionScore)** — UPDATE session_runs SET completed_at = now(), session_score = sessionScore WHERE id = sessionRunId. Enforce ownership (row’s player_id = current user’s player id) or admin; throw FORBIDDEN or NOT_FOUND as appropriate.

---

## 4. Data layer — dart scores

- [x] **4.1** **insertDartScore(client, payload)** — INSERT one row into dart_scores (player_id, training_id, routine_id, routine_no, step_no, dart_no, target, actual, result). Return created row or void. Validate result in ('H', 'M') in app or DB.
- [x] **4.2** **insertDartScores(client, payloads)** — Bulk INSERT dart_scores (optional; for efficiency). Accept array of DartScorePayload; return void or array of created rows.

---

## 5. Data layer — player routine scores

- [x] **5.1** **upsertPlayerRoutineScore(client, payload)** — INSERT or UPDATE player_routine_scores (player_id, training_id, routine_id, routine_score). Unique on (training_id, routine_id); use upsert (ON CONFLICT DO UPDATE) or select-then-insert/update. Return row.

---

## 6. Data layer — level requirements (read for GE)

Per domain §8.2. P2 may already expose these; ensure GE can read by decade.

- [x] **6.1** Ensure **listLevelRequirements(client)** exists (P2) and returns rows ordered by min_level. If missing, add in P2 package or P4.
- [x] **6.2** Ensure **getLevelRequirementByMinLevel(client, minLevel)** exists or can be implemented — return one row where min_level = minLevel (decade start, e.g. 0, 10, 20, …, 90) for level-check display. Add if not present in P2.

---

## 7. Scoring logic (pure functions)

Per domain §6. Used by GE to compute round, routine, and session scores before persisting.

- [x] **7.1** Implement **roundScore(hits, targetHits): number** — return (hits / targetHits) × 100; handle targetHits = 0 (return 0 or avoid call). Scores may exceed 100. Unit-test.
- [x] **7.2** Implement **routineScore(roundScores: number[]): number** — return average of roundScores; empty array → 0 or undefined per product choice. Unit-test.
- [x] **7.3** Implement **sessionScore(roundScores: number[])** or **sessionScoreFromRoutineScores(routineScores: number[])** — session score = average of all round scores (or average of routine scores). Unit-test. Document in code that this matches OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §6.

---

## 8. GE UI — routes and navigation

Per domain §9. Player-facing; not under /admin.

- [x] **8.1** Add **Play** or **Training** entry to authenticated layout (e.g. nav link or dashboard button) — links to `/play` (or `/training`). Guard: only authenticated users with player; redirect to home or login if not.
- [x] **8.2** Register routes: **`/play`** (GE landing: list available sessions), **`/play/session/:calendarId`** (game screen for one calendar entry). Use existing layout (authenticated) as parent. Ensure calendarId is validated (e.g. session exists and player has access via player_calendar).

---

## 9. GE UI — landing (all sessions)

Per domain §7.1 and §9.1.

- [x] **9.1** **Landing page** (`/play`): call **getAllSessionsForPlayer(client, playerId)**. Display **all** sessions: session name, scheduled_at, day no, session no, **Status** (Completed / Due / Future), **Score** (session score % for completed, "—" otherwise). Each row: action **Start** (Due/Future) or **View** (Completed) → navigate to `/play/session/:calendarId`. Show empty state if no sessions (e.g. “No sessions due. Check back later.”).
- [x] **9.2** All data via `packages/data`; no direct Supabase. Handle loading and error states; show clear message if not in a cohort or no calendar entries.

---

## 10. GE UI — game screen (session run)

Per domain §7.2–7.7 and §9.2.

- [x] **10.1** **Game screen** (`/play/session/:calendarId`): load calendar entry (getCalendarEntryById and getAllSessionsForPlayer; find session by calendarId to validate access); load session with routines (getSessionById(sessionId)); load each routine with steps (getRoutineById). Resolve cohort name (from calendar → cohort) and player (getCurrentPlayer) for context display. Display running session score during play and final session score in end summary.
- [x] **10.2** **Context display:** Show player name; current PR/TR/MR (from player; “—” or 0 if null); cohort name; schedule, day no, session no, session name; progress “Routine x of y”, “Step no”; running session score (update after each round/routine).
- [x] **10.3** **Level check display:** From player’s training_rating (or baseline_rating) derive decade (e.g. 24 → 20); call getLevelRequirementByMinLevel(20) → show “Expected: 2/9” (tgt_hits/darts_allowed). Show “Your level: 24” and current round/score as entered. No CR update in P4.
- [x] **10.4** **Session start:** “Start” / “Go!” button → call **createSessionRun(client, playerId, calendarId)**; store returned session_run.id (training_id) in component state. On CONFLICT (already started), either show error or load existing run and resume (product choice). Initialize GE state: current routine index 1, current step 1, darts in step 0.
- [x] **10.5** **Routine execution loop:** For each routine (in session order), show routine name. For each step (routine_steps by step_no), show step no and target (e.g. “Single 20”). For each dart (1..N, N = 3 or 9 from level_requirements.darts_allowed or default 3): prompt “Aim at [target]. Enter result.” Manual input: hit/miss (or segment code). On submit: call **insertDartScore** with (player_id, training_id, routine_id, routine_no, step_no, dart_no, target, actual, result). After step darts: compute round score = roundScore(hits, N); display. After all steps in routine: compute routine score = routineScore(roundScores); call **upsertPlayerRoutineScore**. Show “Routine complete: X%”. Advance to next routine.
- [x] **10.6** **Session end:** When all routines complete: compute session score = sessionScore(all round scores). Call **completeSessionRun(client, sessionRunId, sessionScore)**. Find player_calendar row for (player_id, calendar_id) — e.g. from listPlayerCalendar or get from available sessions — and call **updatePlayerCalendarStatus(client, playerCalendarId, 'completed')**. Show summary: session score, routine scores; “Return to dashboard” / “Back to Play” button → navigate to `/play` or home.
- [x] **10.7** **Edge cases:** Abandon (leave mid-session): no DB change; session_run stays with completed_at NULL; optional “Resume” on next visit (getSessionRunByPlayerAndCalendar; if exists and not completed, resume from current routine/step). Duplicate start: handled by createSessionRun (CONFLICT or return existing). All mutations via `packages/data`.

---

## 11. Unit tests (data layer and scoring)

Per domain §11.

- [x] **11.1** **Session runs:** createSessionRun (success; CONFLICT or return existing when duplicate per product choice); getSessionRunByPlayerAndCalendar (found, null); completeSessionRun (success; NOT_FOUND or FORBIDDEN when not owner). Use mocked Supabase client.
- [x] **11.2** **Dart scores:** insertDartScore (success, one row); insertDartScores (bulk, if implemented). Assert row(s) created with correct payload.
- [x] **11.3** **Player routine scores:** upsertPlayerRoutineScore (insert new; update existing for same training_id, routine_id). Assert row content.
- [x] **11.4** **Scoring logic:** Unit tests for roundScore (e.g. 2/3 → 66.67, 0/3 → 0, 3/3 → 100); routineScore ([50, 100] → 75); sessionScore (average of rounds). No CR/TR update in P4.

---

## 12. Documentation and cleanup

- [x] **12.1** Update README or docs: mention P4 Game Engine (play/training flow; session run, dart capture, routine/session scores; level check display). No TR progression yet (P5).
- [x] **12.2** Ensure no GE UI code imports Supabase directly; only `packages/data` and auth context use Supabase.
- [x] **12.3** Update **PROJECT_STATUS_TRACKER.md**: when P4 complete, mark **P4 — Game Engine core** checkbox and add brief “P4 delivered” note in Completed section.

---

## Progress summary

| Section | Tasks | Done |
|---------|-------|------|
| 1. Migrations and schema | 8 | 8 |
| 2. Data layer — types and exports | 3 | 3 |
| 3. Data layer — session runs | 3 | 3 |
| 4. Data layer — dart scores | 2 | 2 |
| 5. Data layer — player routine scores | 1 | 1 |
| 6. Data layer — level requirements | 2 | 2 |
| 7. Scoring logic | 3 | 3 |
| 8. GE UI — routes and navigation | 2 | 2 |
| 9. GE UI — landing | 2 | 2 |
| 10. GE UI — game screen | 7 | 7 |
| 11. Unit tests | 4 | 4 |
| 12. Documentation and cleanup | 3 | 3 |

**Execution rule:** One task (or sub-task) at a time; mark checkbox when done; run relevant tests before moving on.
