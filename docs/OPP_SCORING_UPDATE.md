# OPP Scoring Update

Changes to scoring behaviour to support **routine types** (single-dart vs checkout) and **segment-specific expected values** from level accuracy data.

---

## Implementation plan

| Scope | Document | Description |
|-------|----------|-------------|
| **Single-dart + routine_type** | [OPP_SCORING_UPDATE_IMPLEMENTATION_TASKS.md](./OPP_SCORING_UPDATE_IMPLEMENTATION_TASKS.md) | Data model (routine_type on routine_steps and level_requirements), expected hits from level_averages, GE and Admin UI for SS/SD/ST. |
| **Checkout (C)** | [OPP_CHECKOUT_TRAINING_DOMAIN.md](./OPP_CHECKOUT_TRAINING_DOMAIN.md) | Domain spec: expectation formula, step/routine/session scoring, player flow. |
| **Checkout implementation** | [OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md](./OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md) | Detailed checklist: migrations (player_step_runs, dart_scores, config), expectation formula, GE flow, Admin. |

---

## Routine types

There are two broad types of routine:

1. **Single-dart routines** — completable in one throw (e.g. S10, D20). Sub-types by segment: **SS** (single), **SD** (double), **ST** (treble).
2. **Checkout routines (C)** — require more than one dart (e.g. checkout from 41). Full behaviour is defined in **OPP_CHECKOUT_TRAINING_DOMAIN.md**.

Different routine types use different scoring calculations and configuration data.

---

## Single-dart routines (SS, SD, ST)

### Behaviour

- A target segment is set. The player is allowed a fixed number of darts (`darts_allowed` in `level_requirements`) according to their level.
- Score = (successful hits / expected hits) × 100. Scores may exceed 100%.
- **Expected hits** are no longer a single `tgt_hits` per level; they are derived from **routine_type** and **level_averages** (segment accuracy: singles, doubles, trebles per level band).

### Segment sub-types

- **SS** = single segment  
- **SD** = double segment  
- **ST** = treble segment  

Example: a L30 player throwing 9 darts is expected to hit a single more often than a double or treble; `level_averages` holds the segment accuracy percentages per level band.

### UX

- Expected value is calculated at the **routine** level and displayed on the **routine** screen.
- Remove the global “Expected: tgt_hits/darts_allowed” from the **session** screen.
- Use `routine_type` (SS, SD, ST) to determine which accuracy (single/double/treble) to use for expected hits.

### Scoring formula (unchanged)

- Round score (%) = (hits / expectedHits) × 100.  
- Routine/session score = average of round scores.  
- Only the **source** of “expected hits” changes: from level_averages + routine_type instead of a single tgt_hits.

---

## Checkout routines (C)

**Implemented.** See **[OPP_CHECKOUT_TRAINING_DOMAIN.md](./OPP_CHECKOUT_TRAINING_DOMAIN.md)** for:

- Expectation formula (expected checkout completions per step)
- Step score: (actual_successes / expected_successes_int) × 100, capped
- Routine and session score aggregation
- Player flow (attempts, darts, success criteria)

**[OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md](./OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md)** — full implementation checklist (§1–§8). Delivered: migrations (player_step_runs, player_attempt_results, attempt_index on dart_scores, checkout config on level_requirements), expectation formula and getExpectedCheckoutSuccesses in @opp/data, step/routine/session scoring, Game Engine checkout flow (PlaySessionPage), admin routine/level-requirement UI for C, unit tests and documentation.

**Checkout update (route display):** During play on a checkout step, the GE displays a **Checkout** badge, **Start** (original target), **Remaining** (live), and when remaining is 2–170: **Recommended** route from `checkout_combinations` and **Your route** from `player_checkout_variations` (via `getCheckoutCombinationByTotal` and `getPlayerCheckoutVariationByTotal` in @opp/data). See **[OPP_CHECKOUT_UPDATE_DOMAIN.md](./OPP_CHECKOUT_UPDATE_DOMAIN.md)** and **[OPP_CHECKOUT_UPDATE_IMPLEMENTATION_CHECKLIST.md](./OPP_CHECKOUT_UPDATE_IMPLEMENTATION_CHECKLIST.md)**.

---

## Data model changes (summary)

### routine_steps

- Add column **routine_type**. Allowed values: `SS`, `SD`, `ST`, `C`.  
- Drives expected-value calculation and scoring behaviour.  
- Implemented in migration `20260230120000_add_routine_type_to_steps_and_level_requirements.sql`.

### level_requirements

- Add column **routine_type**. Allowed values: `SS`, `SD`, `ST`, `C`.  
- Uniqueness changed to **(min_level, routine_type)** so each level band can have one row per routine type (e.g. 0–9 SS, 0–9 SD, 0–9 ST, 0–9 C).  
- `tgt_hits` and `darts_allowed` apply per (min_level, routine_type) for single-dart; checkout (C) uses **allowed_throws_per_attempt** (darts per attempt, e.g. 9) and **attempt_count** (attempts per step, e.g. 3).  
- **Darts per step** is configurable by routine_type: SS, SD, ST use `darts_allowed`; C uses `allowed_throws_per_attempt` (with `attempt_count` for how many attempts). GE loads level requirements for all four routine types and uses the current step’s type to determine N (darts per visit) and checkout attempt count. Configure in Admin → Level requirements (one row per min_level + routine_type).  
- Implemented in the same migration as above.

---

## Implemented (single-dart scoring update)

Implementation is tracked in **[OPP_SCORING_UPDATE_IMPLEMENTATION_TASKS.md](./OPP_SCORING_UPDATE_IMPLEMENTATION_TASKS.md)**. Summary:

- **§1–2** Data model and types: `routine_type` on `routine_steps` and `level_requirements`; migration backfill from target (D→SD, T→ST, else SS); unique (min_level, routine_type); `getLevelRequirementByMinLevelAndRoutineType`, `getExpectedHitsForSingleDartRoutine` from `level_averages`.
- **§3** Scoring: round score still (hits / expectedHits) × 100; expected hits come from `getExpectedHitsForSingleDartRoutine` (level_averages + routine_type) for SS/SD/ST.
- **§4** GE UI: routine-level “Expected (this step): X hits from Y darts”; session-level “Expected: tgt_hits/darts_allowed” removed.
- **§5** Admin UI: routine steps and level requirements forms include `routine_type` (SS, SD, ST, C); steps suggest routine_type from target.
- **§7** Unit tests: `level-averages.test.ts` (expected-hit from level_averages + routine_type + darts_allowed), level_requirements and routines CRUD with routine_type and uniqueness.

Deviations / notes:

- Bull segment: no separate routine_type (e.g. SB); bull accuracy is in `level_averages.bull_acc_pct` for future checkout or bull-specific routines.
- Existing steps without `routine_type` were backfilled from target in migration; default for new steps in UI is SS.














