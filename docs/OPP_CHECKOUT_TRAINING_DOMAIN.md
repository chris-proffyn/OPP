# CHECKOUT_TRAINING_DOMAIN

## Purpose

Define the end-to-end functional domain for **Checkout Training** in OPP, including:

- Admin configuration of **Routines**, **Routine Steps**, **Sessions**, and **Schedules** for checkout routine_types

- Player execution flow for a checkout session

- Data required to store throws and outcomes (re-using `dart_scores`)

- A deterministic formula to calculate **expected completions** for a given player level and checkout target

- Scoring rules for **Routine Step Score**, **Routine Score**, and **Session Score**

This document is written so Cursor can implement the full behaviour without needing additional context.


## Key Concepts

### Routine steps. 

A routine step is the lowest atomic unit in OPP. It is represented by a single target value. When a target value cannot be achieved with a single dart throw, this is known as a checkout routine step and should have the routine_type = C

### Checkout Routine

A **Routine** is a reusable training container (e.g., *Checkouts*).  

A routine contains ordered **Routine Steps**, each defining a checkout **target** (e.g., 41, 51, 61).

### Session
A **Session** is a runnable instance (or template) that references a routine and can be scheduled.  
Example: Session called **Checkouts under 61** contains steps for 41, 51, 61.

### Schedule
A schedule assigns a session to players within a **level band** (e.g., 20–29), and optionally by calendar frequency.

### Attempt
For each routine step target, the player performs a fixed number of **attempts** (default `attempt_count = 9`).  
Each attempt allows up to `allowed_throws_per_attempt` darts (default `9`).

### Success Criterion
A **success** means the player checks out the target **within the allowed throws** of that attempt (default 9 darts), and the **final dart** that reduces the remaining total to zero must be a **double** (D1–D20) or **bullseye** (Bull). Any other outcome for that attempt is a **bust** (0 points for that attempt).

> Note: This domain treats “checkout target” as a single number (e.g., 61) and does not require segment-route correctness to count a success. Route guidance can be layered on later. The core requirement is success/failure within an attempt window.

### Valid finish and bust
- **Valid finish:** Remaining reaches exactly 0 and the dart that brought it to 0 is a **double** (D1–D20) or **bullseye** (Bull). Example: needing 18 and hitting D9 = success.
- **Bust (attempt fails, 0 points):**
  - **Went over:** A dart reduces remaining below 0 (e.g. need 18, hit S20).
  - **Left one:** Remaining becomes 1 (no double from 1). Example: need 18, hit S17 → remaining 1 = bust.
  - **Wrong finish:** Remaining reaches 0 but the finishing dart was a single or treble (e.g. need 18, hit S18). The player must finish on a double or bull; S18 counts as a bust.

### Expected Completions
For each step (target + player level band), OPP computes an **expected number of successes out of N attempts** (default N=9).  
This expected value becomes the **performance target** for scoring.

## Configurable elements

Both the max allowed darts (e.g. 9) and the number of allowed attempts (e.g. 3) should be configurable via the admin portal

## Dependencies / Existing Tables

You stated these already exist:

- `level_averages` (or equivalent), containing at least:
  - `level_min` (int)
  - `level_max` (int)
  - `three_dart_avg` (numeric) — “3DA”
  - `doubles_accuracy_pct` (numeric, 0–100)
  - (optionally) singles/trebles accuracy (not required by the expectation formula below)

This domain only requires `three_dart_avg` and `doubles_accuracy_pct` for expectation modelling.


## Data Model

### 1) Routines

### 2) Routine Steps

### 3) Sessions

### 4) Schedules

### 5) (Player) Session Runs

### 6) (Player( routine Step

### 7) Dart Scores (re-use)

## Player Flow (Runtime Behaviour)

This is the behaviour Cursor must implement, aligned to your example.

### A) Admin Setup

1. Admin creates a routine: **Checkouts** of type C
2. Admin creates routine steps (targets): **41**, **51**, **61**
3. Admin creates a session called **Checkouts under 61** referencing that routine
4. Admin schedules this session for **level band 20–29**

### B) Player Execution

When Player 1 starts the session:

1. Create `player_session_runs` row (snapshot player level at start).
2. Load ordered routine steps for the session’s routine.
3. For each step:
   - Set active target (e.g., 41)
   - Compute expected successes for this step:
     - Look up player level band stats from `level_averages`
     - Use the **Expectation Formula** (below) to compute:
       - `expected_successes` (numeric for N attempts)
       - `expected_successes_int` (rounded integer target)
   - Create `player_step_runs` row with expected values.
   - Run attempts:
     - For attempt_index 1..N:
       - Set `remaining = checkout_target`
       - Player throws up to `allowed_throws_per_attempt` darts
       - Record each dart in `dart_scores`
       - Apply remaining-score rules:
         - If remaining reaches 0 and the dart that caused it is a **double or bull** -> success, stop attempt
         - If remaining goes below 0 (went over), or remaining becomes 1 (no double from 1), or remaining reaches 0 on a single/treble (invalid finish) -> **bust**, attempt fails (0 for that attempt)
         - If darts exhausted without a valid finish -> fail attempt
   - After N attempts, set:
     - `actual_successes = count(success attempts)`
     - `step_score = Step Scoring Formula` (below)
   - In the darts_scores table, the dart no should be calculate as dart no X attempt number, so if the player has up to 9 darts to checkout a target and 3 attempts per target number, then for this routine step, the dart_no value could reach 9x3=27. Note: If the player checks out early, they won't need all 27 darts. However in this case the last dart should have a value of H in the result column.

4. After all steps:
   - `routine_score = aggregate(step_score across steps)` (below)
   - `session_score = routine_score` (as per your example)
   - Update `player_session_runs.completed_at`, `routine_score`, `session_score`

### C) Example Outcome (Must Match)

For a **Level 20–29** player running targets 41, 51, 61 with 9 attempts each:

- 41: expected = 5, actual = 5 -> step score = 100
- 51: expected = 4, actual = 2 -> step score = 50
- 61: expected = 4, actual = 6 -> step score = 150
- Routine score = average(100, 50, 150) = 100
- Session score = 100


## Expectation Formula (Expected Checkout Completions)

### Inputs

- `player_level` (int)
- `target` (int) — checkout target score (e.g., 61)
- `allowed_throws_per_attempt` (int, default 9)
- `attempt_count` (int, default 9)

From `level_averages` lookup (by numeric bounds containing `player_level`):
- `three_dart_avg` (3DA)
- `doubles_accuracy_pct` (0..100)

### Key Assumptions

- A “1-dart finish” is available when remaining score is **<= 40** (assume D20 as standard).
- Player needs at least **1 dart reserved** for the finishing double, so the scoring phase uses:
  - `scoring_darts = allowed_throws_per_attempt - 1`
- If target <= 40, player is already “in range” (scoring phase requirement is 0).

### Step 1 — Scoring required to reach <= 40

`W = max(target - 40, 0)`

### Step 2 — Points per dart (scoring power)

`ppd = three_dart_avg / 3`

### Step 3 — Expected darts needed to reach <= 40

If `W == 0` then `E = 0` else:

`E = W / ppd`

### Step 4 — Probability of reaching <= 40 within scoring_darts

We need a probability from an expectation. Use a simple logistic based on how “ahead” the player is:

If `E == 0`, treat `r` as a very large number (and `P_reach = 1`).

Otherwise:

- `r = scoring_darts / E`

Then:

- `P_reach = 1 / (1 + exp(-k * (r - 1)))`

Recommended constant:
- `k = 3` (tunable later with real data)

Properties:
- If `E == scoring_darts`, then `r=1` -> `P_reach = 0.5`
- If `E < scoring_darts`, then `r>1` -> `P_reach > 0.5`
- If `E > scoring_darts`, then `r<1` -> `P_reach < 0.5`

### Step 5 — Effective number of double attempts remaining

Approximate how many darts the player has left for doubles *if they reach range*:

- `n = round(allowed_throws_per_attempt - min(E, scoring_darts))`

Clamp:
- `n = max(1, min(n, allowed_throws_per_attempt))`

### Step 6 — Probability of finishing once in range

Convert double accuracy:

- `pD = doubles_accuracy_pct / 100`

Then:

- `P_finish_given_reach = 1 - (1 - pD)^n`

### Step 7 — Probability of checkout within the attempt window

- `P_checkout = P_reach * P_finish_given_reach`

### Step 8 — Expected completions for N attempts + integer target

- `expected_successes = attempt_count * P_checkout`

Integer performance target (used for scoring):

- `expected_successes_int = round(expected_successes)`

Clamp recommended:
- `expected_successes_int = max(0, min(expected_successes_int, attempt_count))`

This integer target is what your example uses (e.g., expected=5 out of 9).


## Step Scoring Formula

Inputs:
- `expected_successes_int` (E_int)
- `actual_successes` (A)

Base formula:

- `step_score = (A / E_int) * 100`

Rules:
- If `E_int == 0`:
  - If `A == 0` -> step_score = 100 (met expectation)
  - If `A > 0` -> step_score = 200 (or cap; see below)
- Recommended cap:
  - `step_score = min(step_score, 200)` to prevent runaway values
- Store the raw and capped score if you want richer analytics.

This yields your examples:
- 5/5 -> 100
- 2/4 -> 50
- 6/4 -> 150


## Routine Score and Session Score

### Routine Score
Routine score is the average of step scores:

- `routine_score = average(step_score_1..step_score_N)`

Optionally cap:
- `routine_score = min(routine_score, 200)`

### Session Score
For this domain:
- `session_score = routine_score`


## Implementation Notes (Cursor Guidance)

### Level Averages Lookup
Implement a helper that returns the appropriate row from `level_averages`:

- Query:
  - `select * from level_averages where :player_level between level_min and level_max limit 1;`

### Deterministic Calculation Function
Implement expectation calculation in one place (server-side preferred), e.g.:

- SQL function in Postgres, or
- Edge function / server action, or
- Shared backend library called by API routes

Required outputs:
- `expected_successes` (numeric)
- `expected_successes_int` (int)
- plus debug: `P_checkout`, `P_reach`, `n`, `E`

### Recording Attempts
When the player begins a step:
- Create `player_step_runs`
- For each attempt, create darts in `dart_scores` with `attempt_index`

At the end of each attempt:
- Mark attempt as success/failure (either:
  - derived from darts in attempt, or
  - explicitly stored in an `attempt_results` table)

Minimal recommended table (optional but clean):

**Table: `player_attempt_results`**
- `id` (uuid)
- `player_step_run_id` (uuid)
- `attempt_index` (int)
- `is_success` (bool)
- `darts_used` (int)
- `completed_at` (timestamptz)

This makes aggregation trivial:
- `actual_successes = count(where is_success)`


## Edge Cases

- **Target <= 40**:
  - `W=0`, `E=0`, `P_reach=1`
  - Player has all darts for doubles (`n` ~= allowed_throws_per_attempt)
- **Very low doubles accuracy**:
  - `P_finish_given_reach` stays low; expectation drops naturally
- **Expected integer target rounds to 0**:
  - Step still runnable; scoring rule handles it
- **Capping**:
  - Replace any UI “expected completions” > attempt_count with attempt_count
  - Keep raw probabilities for analytics


## Acceptance Criteria (Must Pass)

1. Admin can create a checkout routine, add steps 41/51/61, create session "Checkouts under 61", and schedule for level 20–29.
2. Player starting the session sees step order and target for each step.
3. For each step, system computes `expected_successes_int` using the formula above (given level, target, 9 throws/attempt, 9 attempts).
4. Player completes each step with measured actual successes.
5. Step scores computed as `(actual/expected)*100`, producing:
   - 41: expected 5, actual 5 -> 100
   - 51: expected 4, actual 2 -> 50
   - 61: expected 4, actual 6 -> 150
6. Routine score = average(step scores) = 100
7. Session score = 100
8. All darts are recorded in `dart_scores` and linked to the player_step_run + attempt indices.
