# OPP Checkout Training — Implementation Checklist

Detailed implementation checklist for the functionality described in **OPP_CHECKOUT_TRAINING_DOMAIN.md**, with reference to **OPP_SCORING_UPDATE.md** where relevant. This covers admin configuration, player execution flow, expectation formula, step/routine/session scoring, and data model changes.

**Prerequisites**: Routine types (SS, SD, ST, C) and `routine_type` on `routine_steps` and `level_requirements` are already in scope per OPP_SCORING_UPDATE_IMPLEMENTATION_TASKS.md and migration `20260230120000_add_routine_type_to_steps_and_level_requirements.sql`. This checklist focuses on **checkout (C)** behaviour end-to-end.

---

## 1. Data model and migrations

### 1.1 Session run — snapshot player level

- [x] Add column `player_level_snapshot` (int, nullable) to `public.session_runs`.
- [x] Purpose: store the player’s level at session start for deterministic expected-completions calculation (checkout uses level_averages by level band).
- [x] Backfill: leave NULL for existing rows; set on insert when starting a session run (from cohort level or player training_rating → level).
- [x] Add comment: “Player level at session start; used for checkout expected_successes calculation.”

### 1.2 Checkout config (attempt_count, allowed_throws_per_attempt)

- [x] Decide where to store checkout-specific config:
  - **Option A**: Extend `level_requirements` for `routine_type = 'C'`: add `attempt_count` (int, default 9) and `allowed_throws_per_attempt` (int, default 9) for C rows only (nullable for SS/SD/ST).
  - **Option B**: New table `checkout_config` (e.g. level_band or global) with `attempt_count`, `allowed_throws_per_attempt`.
- [x] Implement chosen option:
  - If Option A: migration to add `attempt_count` and `allowed_throws_per_attempt` to `level_requirements` (nullable; used when routine_type = 'C'). Defaults 9, 9. CHECK constraints: >= 1.
  - If Option B: migration to create `checkout_config` with appropriate keys and RLS.
- [x] Document in migration: “Checkout routines use these for expectation and scoring; admin configurable per OPP_CHECKOUT_TRAINING_DOMAIN.”

### 1.3 Player step runs (per-step outcomes for checkout)

- [x] Create table `public.player_step_runs`:
  - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
  - `player_id` uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE
  - `training_id` uuid NOT NULL REFERENCES session_runs(id) ON DELETE CASCADE
  - `routine_id` uuid NOT NULL REFERENCES routines(id) ON DELETE RESTRICT
  - `routine_no` int NOT NULL (matches session_routines.routine_no)
  - `step_no` int NOT NULL (matches routine_steps.step_no)
  - `routine_step_id` uuid REFERENCES routine_steps(id) ON DELETE RESTRICT (optional but recommended for FK clarity)
  - `checkout_target` int NOT NULL (e.g. 41, 51, 61 — parsed from routine_steps.target for type C)
  - `expected_successes` numeric NOT NULL (raw from expectation formula)
  - `expected_successes_int` int NOT NULL (rounded, clamped 0..attempt_count)
  - `actual_successes` int NOT NULL DEFAULT 0
  - `step_score` numeric (nullable until step completed; then (actual/expected_int)*100, capped)
  - `completed_at` timestamptz
  - `created_at` timestamptz NOT NULL DEFAULT now()
  - `updated_at` timestamptz NOT NULL DEFAULT now()
  - UNIQUE (training_id, routine_id, step_no)
- [x] Add indexes: (training_id), (player_id).
- [x] RLS: same pattern as session_runs (SELECT/INSERT/UPDATE own or admin; DELETE admin).
- [x] Trigger: set_updated_at on UPDATE.
- [x] Comment: “Per-step run for checkout routines: expected/actual successes and step score.”

### 1.4 Player attempt results (optional but recommended)

- [x] Create table `public.player_attempt_results`:
  - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
  - `player_step_run_id` uuid NOT NULL REFERENCES player_step_runs(id) ON DELETE CASCADE
  - `attempt_index` int NOT NULL (1..N)
  - `is_success` boolean NOT NULL
  - `darts_used` int NOT NULL CHECK (darts_used >= 1)
  - `completed_at` timestamptz NOT NULL DEFAULT now()
  - UNIQUE (player_step_run_id, attempt_index)
- [x] RLS: allow SELECT/INSERT/UPDATE where player owns the step run (via player_step_runs.player_id); admin full.
- [x] Comment: “Per-attempt success/failure for checkout steps; actual_successes = count(where is_success).”

### 1.5 Dart scores — checkout support

- [x] Add column `attempt_index` (int, nullable) to `public.dart_scores`. For checkout steps: 1..attempt_count; for non-checkout leave NULL.
- [x] Clarify semantics: for checkout, `dart_no` is the dart index **within the step** (1 to attempt_count × allowed_throws_per_attempt), e.g. 1..27 for 9 darts × 3 attempts. Last dart of a successful checkout has `result = 'H'`.
- [x] Add comment on `dart_scores`: “For checkout (C): attempt_index and dart_no are per-step; dart_no can go up to attempt_count * allowed_throws_per_attempt.”
- [x] Ensure INSERT path for darts accepts `attempt_index` and that GE passes it for checkout steps.

### 1.6 Level band assignment for sessions (scheduling)

- [x] Confirm how “schedule for level band 20–29” is represented:
  - If cohort has a single `level`: use that level for lookup; document that cohort level defines the band (level_averages row where level_min <= level <= level_max).
  - If explicit band required: add table or columns (e.g. `session_level_band_min`, `session_level_band_max` on a link table, or schedule_entry level band). Implement chosen approach.
- [x] Document in checklist or PRODUCT_REQUIREMENTS how level band is derived when starting a checkout session.
  - **Implemented:** Cohort has `level` (int). When starting a session run, set `session_runs.player_level_snapshot` from cohort level or from player `training_rating` → level (app logic). Level band for expectation = `getLevelAverageForLevel(client, player_level_snapshot)`. No new tables; document in GE when implementing session start.

---

## 2. Expectation formula (expected checkout completions)

### 2.1 Level averages lookup

- [x] Ensure `getLevelAverageForLevel(client, playerLevel)` exists and returns the row where `level_min <= player_level <= level_max` (already present in `packages/data/src/level-averages.ts`).
- [x] Confirm column names: `three_dart_avg`, `double_acc_pct` (domain doc uses “doubles_accuracy_pct” — map to `double_acc_pct`).

### 2.2 Deterministic expectation calculation

- [x] Implement the full **Expectation Formula** from OPP_CHECKOUT_TRAINING_DOMAIN.md in one place. Preferred: shared function in `@opp/data` (e.g. `packages/data/src/checkout-expectation.ts`) so it can be used server-side and in tests; alternatively SQL function or Edge function.
- [x] Inputs: `playerLevel`, `target` (int), `allowed_throws_per_attempt` (default 9), `attempt_count` (default 9), and level_averages row (or fetch inside if using client).
- [x] Steps to implement:
  - Step 1: `W = max(target - 40, 0)`
  - Step 2: `ppd = three_dart_avg / 3`
  - Step 3: `E = W === 0 ? 0 : W / ppd`
  - Step 4: `scoring_darts = allowed_throws_per_attempt - 1`; if E === 0 then P_reach = 1; else `r = scoring_darts / E`, `P_reach = 1 / (1 + exp(-k * (r - 1)))`, k = 3
  - Step 5: `n = round(allowed_throws_per_attempt - min(E, scoring_darts))`, clamp `n = max(1, min(n, allowed_throws_per_attempt))`
  - Step 6: `pD = doubles_accuracy_pct / 100`, `P_finish_given_reach = 1 - (1 - pD)^n`
  - Step 7: `P_checkout = P_reach * P_finish_given_reach`
  - Step 8: `expected_successes = attempt_count * P_checkout`, `expected_successes_int = round(expected_successes)`, clamp to `max(0, min(expected_successes_int, attempt_count))`
- [x] Return type: `{ expected_successes: number; expected_successes_int: number; P_checkout?: number; P_reach?: number; n?: number; E?: number }` (debug fields optional).
- [x] Add unit tests: target ≤ 40 (W=0, P_reach=1), target 41/51/61 with known level_averages, edge cases (very low doubles accuracy, E_int rounds to 0).

### 2.3 Data access for expectation

- [x] Expose API: e.g. `getExpectedCheckoutSuccesses(client, playerLevel, target, allowedThrowsPerAttempt?, attemptCount?)` that loads level_averages for playerLevel and calls the pure expectation function. Use level_requirements (routine_type C) for defaults if config is stored there.

---

## 3. Step, routine, and session scoring (checkout)

### 3.1 Step scoring formula

- [x] Implement in `packages/data/src/scoring.ts` (or checkout-specific module):  
  `stepScore(expected_successes_int, actual_successes)`:
  - If `expected_successes_int === 0`: if `actual_successes === 0` return 100, else return 200 (or cap).
  - Else: `step_score = (actual_successes / expected_successes_int) * 100`.
  - Cap: `min(step_score, 200)`.
- [x] Add unit tests: (5,5)→100, (4,2)→50, (4,6)→150; (0,0)→100, (0,1)→200; cap at 200.

### 3.2 Routine and session score (checkout)

- [x] Routine score = average of step scores for that routine: `routine_score = average(step_score_1 .. step_score_N)`; optionally cap at 200.
- [x] Session score = routine_score when the session contains a single checkout routine; if multiple routines in session, session score remains average of all routine scores (per existing behaviour).
- [x] Ensure `completeSessionRun` (or equivalent) can accept routine_score from checkout flow and set `session_runs.session_score` and `player_routine_scores.routine_score` accordingly.

### 3.3 Persisting step and routine scores

- [x] When a checkout step is completed: set `player_step_runs.actual_successes`, `player_step_runs.step_score`, `player_step_runs.completed_at`.
- [x] When all steps of a checkout routine are completed: compute routine_score from step scores; upsert `player_routine_scores` for (training_id, routine_id).
- [x] When session is completed: set `session_runs.completed_at`, `session_runs.session_score`, and optionally `session_runs.player_level_snapshot` if not set at start.

---

## 4. Player execution flow (Game Engine)

### 4.1 Starting a checkout session

- [x] When player starts a session that contains a checkout routine:
  - Create or get `session_runs` row (existing flow; ensure one per player per calendar slot).
  - Set `session_runs.player_level_snapshot` to current player level (from cohort or training_rating → level).
- [x] Load session → session_routines → routine → routine_steps (ordered by step_no). For steps with `routine_type = 'C'`, parse target as integer (e.g. 41, 51, 61).

### 4.2 Loading steps and expected values

- [x] For each checkout step: call `getExpectedCheckoutSuccesses(client, playerLevel, target, allowedThrowsPerAttempt, attemptCount)` using config from level_requirements (C) or checkout_config.
- [x] Create `player_step_runs` row for each step with `expected_successes`, `expected_successes_int`; leave `actual_successes` and `step_score` as 0 until step is completed.

### 4.3 Running attempts per step

- [x] For each step, for attempt_index 1..attempt_count (v1: one visit = one attempt per step):
  - Initialize `remaining = checkout_target`.
  - For each dart (up to allowed_throws_per_attempt): record in `dart_scores` with correct `routine_no`, `step_no`, `dart_no` (global index within step: (attempt_index - 1) * allowed_throws_per_attempt + dart_index), `attempt_index`, `target` (e.g. “41”), `actual`, `result`.
  - Apply remaining-score rules: if remaining reaches 0 on a valid finishing double (or any finish for v1) → success; else if darts exhausted → fail.
  - Record success/failure in `player_attempt_results` (if table exists) or derive from darts when finalising step.
- [x] On last dart of a successful checkout: set `result = 'H'` for that dart.

### 4.4 Finalising step and routine

- [x] After visit: set `actual_successes`, `step_score`, `completed_at` on `player_step_runs` for C steps.
- [x] After all steps of the routine: compute `routine_score` = checkoutRoutineScore(step_scores); upsert `player_routine_scores`.
- [x] After all routines in session: set `session_score` = sessionScore(routine_scores); complete `session_runs` (completed_at, session_score).

### 4.5 UI behaviour

- [x] Player sees step order and target for each step (e.g. 41, 51, 61).
- [x] Display expected completions per step (expected_successes_int out of attempt_count).
- [x] Show attempt-by-attempt progress and final step score / routine score / session score.

---

## 5. Admin configuration

### 5.1 Routines and steps (checkout)

- [x] Admin can create a routine of type “Checkout” (e.g. name “Checkouts”, steps with routine_type = 'C').
- [x] Admin can add routine steps with target as integer (e.g. 41, 51, 61) and routine_type = 'C' (suggested when target is numeric 2–170).
- [x] Admin can create a session (e.g. “Checkouts under 61”) that references this routine (existing session edit + routine dropdown).
- [x] Admin can assign session to a schedule (existing schedule_entries). Level band is determined by cohort level at play time (player_level_snapshot from getCurrentCohortForPlayer or training_rating).

### 5.2 Checkout config (attempt_count, allowed_throws_per_attempt)

- [x] Admin UI to configure `attempt_count` and `allowed_throws_per_attempt` for checkout in level_requirements when routine_type = 'C'. Defaults 9 and 9.
- [x] Validation: both >= 1; upper bounds attempt_count max 99, allowed_throws_per_attempt max 9.

### 5.3 Level requirements for C

- [x] Admin can create/edit level_requirements with routine_type = 'C' and set attempt_count and allowed_throws_per_attempt. List page shows C columns and filter by routine_type.

---

## 6. Types and data layer (@opp/data)

### 6.1 Types

- [x] Add `PlayerStepRun` interface (id, player_id, training_id, routine_id, routine_no, step_no, routine_step_id, checkout_target, expected_successes, expected_successes_int, actual_successes, step_score, completed_at, created_at, updated_at).
- [x] Add `PlayerAttemptResult` (player_step_run_id, attempt_index, is_success, darts_used, completed_at) and `CreatePlayerAttemptResultPayload`.
- [x] Add `SessionRun.player_level_snapshot?: number | null`.
- [x] Add `DartScore.attempt_index?: number | null` and extend `DartScorePayload` with optional `attempt_index`.
- [x] Add payload types for creating/updating player_step_runs and player_attempt_results.

### 6.2 Data access

- [x] `createPlayerStepRun(client, payload)` — insert player_step_runs.
- [x] `updatePlayerStepRun(client, id, payload)` — set actual_successes, step_score, completed_at.
- [x] `getPlayerStepRunsForSessionRun(client, trainingId)` and `getPlayerStepRunByTrainingRoutineStep(client, trainingId, routineId, stepNo)`.
- [x] `insertPlayerAttemptResult(client, payload)`, `listAttemptResultsForStepRun(client, playerStepRunId)`.
- [x] `insertDartScore` / `insertDartScores` accept optional `attempt_index` and persist it.

### 6.3 Level averages

- [x] `LevelAverage` and `getLevelAverageForLevel` expose `three_dart_avg` and `double_acc_pct` (already as double_acc_pct in types). Use `double_acc_pct` for “doubles_accuracy_pct” in the formula.

---

## 7. Edge cases and acceptance criteria

### 7.1 Edge cases (from domain doc)

- [x] Target ≤ 40: W=0, E=0, P_reach=1; n ≈ allowed_throws_per_attempt; expectation and scoring still correct (formula + unit tests).
- [x] Very low doubles accuracy: expected_successes_int may be 0; stepScore (0,0)→100, (0,1)→200; covered by unit tests.
- [x] expected_successes_int clamped to [0, attempt_count] in formula; UI displays min(expected, attempt_count).

### 7.2 Acceptance criteria (must pass)

- [x] **AC1**: Admin can create a checkout routine, add steps 41, 51, 61, create session “Checkouts under 61”, and schedule for level band 20–29.
- [x] **AC2**: Player starting the session sees step order and target for each step.
- [x] **AC3**: For each step, system computes expected_successes_int using the formula (player level, target, 9 throws/attempt, 9 attempts).
- [x] **AC4**: Player completes each step with measured actual successes.
- [x] **AC5**: Step scores: (actual/expected)*100 → 41: exp 5, act 5 → 100; 51: exp 4, act 2 → 50; 61: exp 4, act 6 → 150.
- [x] **AC6**: Routine score = average(step scores) = 100 in the example.
- [x] **AC7**: Session score = 100 in the example.
- [x] **AC8**: All darts recorded in dart_scores linked to session run and step; dart_no semantics per step (e.g. 1..27); last dart of successful checkout has result 'H'.

---

## 8. Testing and documentation

### 8.1 Unit tests

- [x] Expectation formula: multiple targets (≤40, 41, 51, 61), known level_averages; edge E=0, r=1 (P_reach=0.5) in checkout-expectation.test.ts.
- [x] Step scoring: (5,5)→100, (4,2)→50, (4,6)→150; (0,0)→100, (0,1)→200; cap 200 in scoring.test.ts.
- [x] getExpectedCheckoutSuccesses with mocked client and level_averages row in checkout-expectation.test.ts.

### 8.2 Integration / E2E

- [x] Admin: create checkout routine + steps + session + schedule; configure attempt_count / allowed_throws_per_attempt (§5; verify manually or E2E).
- [x] Player: start session, complete steps with mixed outcomes, verify step_score and session_score and dart_scores (§4; verify manually or E2E).

### 8.3 Documentation

- [x] PROJECT_STATUS_TRACKER.md updated with Checkout training completed.
- [x] OPP_SCORING_UPDATE.md “Checkout training” section to PRODUCT_REQUIREMENTS or OPP_SCORING_UPDATE.md referencing this checklist and OPP_CHECKOUT_TRAINING_DOMAIN.md.

---

## 9. Summary and dependencies

| Area | Action |
|------|--------|
| **session_runs** | Add `player_level_snapshot`; set when starting run. |
| **Checkout config** | Add attempt_count & allowed_throws_per_attempt (level_requirements for C or new table). |
| **player_step_runs** | New table: per-step expected/actual successes and step_score. |
| **player_attempt_results** | Optional table for per-attempt success/failure. |
| **dart_scores** | Add `attempt_index`; clarify dart_no semantics for checkout. |
| **Expectation** | Implement full formula in @opp/data; expose getExpectedCheckoutSuccesses. |
| **Scoring** | Step score (actual/expected)*100 capped at 200; routine = avg(steps); session = routine (or avg routines). |
| **GE flow** | Start run → create step runs with expected → run attempts → record darts → finalise step → routine → session. |
| **Admin** | Configure checkout routine/steps/session/schedule; configure attempt_count and allowed_throws_per_attempt. |

**Dependencies**: Existing `routine_type` (SS, SD, ST, C) on routine_steps and level_requirements; `level_averages` with `three_dart_avg` and `double_acc_pct`; existing `session_runs`, `dart_scores`, `player_routine_scores`, and calendar/session/routine model.
