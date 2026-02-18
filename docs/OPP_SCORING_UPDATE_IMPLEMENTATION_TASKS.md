# OPP Scoring Update — Implementation Checklist

Implementation tasks for **OPP_SCORING_UPDATE.md**: routine types (single-dart vs checkout), **routine_type** (SS, SD, ST, C), and expected-value calculation from level accuracy data.

**Checkout (C) routines** are scoped in a separate document: **[OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md](./OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md)**. That checklist covers migrations (player_step_runs, dart_scores, config), expectation formula, step/routine/session scoring, and GE flow. This document covers the shared data model (routine_type) and single-dart behaviour only.

---

## 1. Data model and migrations

### 1.1 routine_steps — add routine_type

- [x] Create migration to add column `routine_type` to `public.routine_steps`.
- [x] Type: `text`. Allowed values: `'SS'`, `'SD'`, `'ST'`, `'C'`.
  - **SS** = Single segment (single-dart routine, target is a single).
  - **SD** = Double segment (single-dart routine, target is a double).
  - **ST** = Treble segment (single-dart routine, target is a treble).
  - **C** = Checkout routine (see **OPP_CHECKOUT_TRAINING_DOMAIN.md** and **OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md**).
- [x] CHECK constraint and backfill from target (D→SD, T→ST, else SS). See migration `20260230120000_add_routine_type_to_steps_and_level_requirements.sql`.

### 1.2 level_requirements — add routine_type

- [x] Create migration to add column `routine_type` to `public.level_requirements`.
- [x] Allowed values: `'SS'`, `'SD'`, `'ST'`, `'C'`. Uniqueness: `UNIQUE (min_level, routine_type)`.
- [x] Backfill existing rows with `routine_type = 'SS'`. Same migration as above.
- [ ] Checkout (C): use of `tgt_hits`/`darts_allowed` or extra config (e.g. attempt_count, allowed_throws_per_attempt) is defined in **OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md** §1.2.

---

## 2. Types and data layer

### 2.1 Types (@opp/data)

- [x] Add `routine_type` to `RoutineStep` and `RoutineStepInput` in `packages/data/src/types.ts` (`'SS' | 'SD' | 'ST' | 'C'`).
- [x] Add `routine_type` to `LevelRequirement` and create/update payloads.
- [x] Export `RoutineType`, `ROUTINE_TYPES`, and `isRoutineType()` for validation.

### 2.2 Level requirements API

- [x] `getLevelRequirementByMinLevelAndRoutineType(client, minLevel, routineType)`; `getLevelRequirementByMinLevel(client, minLevel)` defaults to `'SS'`.
- [x] `listLevelRequirements`, `createLevelRequirement`, `updateLevelRequirement` include `routine_type`; unique (min_level, routine_type) enforced in DB with CONFLICT handling.

### 2.3 Routines and routine_steps API

- [x] `listRoutineSteps`, `getRoutineWithSteps`, and step insert/update read and write `routine_type`.
- [x] `setRoutineSteps` (and payloads) include `routine_type`; default from target (S→SS, D→SD, T→ST).

### 2.4 Expected value from level_averages

- [x] `getLevelAverageForLevel(client, level)` returns level_averages row for level band; columns include `single_acc_pct`, `double_acc_pct`, `treble_acc_pct`, `bull_acc_pct`.
- [x] **Expected hits** for single-dart: `getExpectedHitsForSingleDartRoutine(client, playerLevel, routineType, dartsAllowed)` using accuracy by routine_type (SS/SD/ST); returns null for C.
- [ ] Bull: document choice (routine_type e.g. SB or derive from target) if/when bull routines are added.

---

## 3. Scoring behaviour

### 3.1 Single-dart scoring (unchanged formula)

- [ ] Confirm: round score (%) = (hits / expectedHits) × 100; scores may exceed 100%.
- [ ] Use **expected hits** from §2.4 (derived from routine_type and level_averages) instead of a single `tgt_hits` from level_requirements when routine_type is SS, SD, or ST.
- [ ] No change to `roundScore`, `routineScore`, or `sessionScore` in `packages/data/src/scoring.ts`; only the source of “target/expected hits” changes (per routine, per type).

---

## 4. Game Engine (GE) UI

### 4.1 Routine-level expected value

- [x] Compute or fetch expected hits **per routine/step** (using routine_type and player level + level_averages). Implemented in PlaySessionPage via `getExpectedHitsForSingleDartRoutine` when in running phase.
- [x] Display expected value on the **routine screen** (e.g. “Expected (this step): X hits from Y darts”). Shown in PlaySessionPage using `expectedHitsForStep` with fallback to `tgt_hits` when level_averages unavailable.

### 4.2 Session screen — remove global expected

- [x] Remove the session-level “Expected: tgt_hits/darts_allowed” display; replaced with step-specific “Expected (this step): X hits from Y darts” (PlaySessionPage).
- [x] Level-decade and darts_allowed remain in context (levelReq); expected wording is step-specific.

### 4.3 Use of routine_type in GE

- [x] When loading a routine (with steps), use each step’s `routine_type` to determine expected hits for display and for scoring (`getExpectedHitsForSingleDartRoutine(…, step.routine_type, N)` and scoring uses `expectedFromLevel` by routine_type).
- [ ] Ensure darts_allowed comes from level_requirements **per routine_type** when applicable (e.g. `getLevelRequirementByMinLevelAndRoutineType(supabase, decade, step.routine_type)` for the current step). Currently a single `levelReq` is loaded per session via `getLevelRequirementByMinLevel(decade)` (SS default).

---

## 5. Admin UI

### 5.1 Routine steps — routine_type

- [x] Admin UI for creating/editing routine steps: add field for `routine_type` (SS, SD, ST, C) with validation.
- [x] When creating steps (e.g. target S20, D16, T20), default or suggest routine_type from target (S→SS, D→SD, T→ST); allow override to C for checkout routines.

### 5.2 Level requirements — routine_type

- [x] Admin UI for level requirements: add `routine_type` (SS, SD, ST, C).
- [x] Support multiple rows per decade (one per routine type); list/create/edit by (min_level, routine_type).
- [x] Show or filter by routine_type in level requirements list and forms.

---

## 6. Checkout routines (C)

- [x] **routine_type** `'C'` is valid in schema, types, and admin UI (routine steps and level requirements).
- [ ] **Full checkout implementation** (expectation formula, player_step_runs, step/routine/session scoring, GE flow, config) is in **[OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md](./OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md)**. Use that checklist for all C-specific work; domain spec: **[OPP_CHECKOUT_TRAINING_DOMAIN.md](./OPP_CHECKOUT_TRAINING_DOMAIN.md)**.

---

## 7. Testing and docs

- [x] Unit tests: expected-hit calculation from level_averages + routine_type + darts_allowed (and for level_requirements by routine_type).
- [x] Unit tests: level_requirements and routine_steps CRUD with routine_type; uniqueness (min_level, routine_type).
- [ ] GE: manual or E2E check that routine screen shows routine-type–based expected and session screen no longer shows the old global expected. *(Manual: run a session, confirm “Expected (this step): X hits from Y darts” on routine screen; no session-level “Expected: tgt_hits/darts_allowed”.)*
- [x] Update PROJECT_STATUS_TRACKER.md when single-dart scoring update is complete; document any deviations (e.g. bull segment handling) in OPP_SCORING_UPDATE.md or here.

---

## 8. Summary

| Area               | Status / Change |
|--------------------|-----------------|
| routine_steps      | Done: `routine_type` (SS, SD, ST, C) in migration and types. |
| level_requirements | Done: `routine_type`; unique (min_level, routine_type); migration and API. |
| level_averages     | Done: getLevelAverageForLevel, getExpectedHitsForSingleDartRoutine. |
| Expected value     | Single-dart: from level_averages + routine_type. Display on routine screen; remove global expected from session screen. |
| GE UI (§4)         | Done: 4.1 routine-level expected, 4.2 step-specific expected display, 4.3 routine_type for expected/scoring. Remaining: darts_allowed per routine_type (currently SS only). |
| Scoring formula    | Unchanged; input is expected hits from routine type + level accuracy. |
| Admin UI           | Done: routine_type on steps and level requirements (with filter/list). |
| Checkout (C)       | Schema/types/UI support C; full implementation per **OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md**. |
