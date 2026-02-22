# BACKLOG — Implementation Checklist

Implementation checklist for the behaviour described in **docs/BACKLOG.md**: updated checkout routine logic, unified game screen layout (common UI, SS/SD/ST, C), score input grid changes, **Undo Last** button, and **per-throw** writes to `dart_scores` for checkout.

**Prerequisites:** Checkout training and update flows are in place per **OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md** and **OPP_CHECKOUT_UPDATE_IMPLEMENTATION_CHECKLIST.md**. Level requirements (darts per step, attempt_count, allowed_throws_per_attempt) and checkout expectation/route display are already implemented.

---

## 1. Common UI attributes (all routine types)

Ensure the following appear on the game screen in a consistent order for both **ready** and **running** phases, for all routine types (SS, SD, ST, C).

- [x] **Session name** — Shown as main heading (`<h1>{sessionName}</h1>`). Ready: "Session: {sessionName}" removed prefix so heading is session name only; running: unchanged.
- [x] **Player Name — TR value** — One line: "{nickname} — TR {training_rating}" in context block (ready and running).
- [x] **Cohort Name — Day No — Session No** — One line: "{cohort_name} — Day {day_no} — Session {session_no}" (ready and running).
- [x] **Current session score** — Running phase only: "Current session score: {score}%" in context block. Ready: no score yet so not shown.
- [x] **Routine X of Y** — "Routine {routineIndex + 1} of {routinesWithSteps.length}" in context block (running).
- [x] **Step No** — "Step: {step.step_no}" in context block (running).
- [x] **Routine Name — Routine Type** — "Routine: {routine.name} — {step.routine_type}" in context block (running). Step type defaults to 'SS' if missing.
- [x] **Layout** — All of the above grouped in a single "Context" section in BACKLOG order. "Visit: x of N darts" kept as secondary line; "Routine complete" kept when applicable.

---

## 2. UI fields for routine_type = SS, SD, ST

- [ ] **Target** — Display the step target (e.g. "T20", "S5"). Already shown in step description; confirm it is prominent.
- [ ] **Darts to be thrown: n** — Where `n` is `darts_allowed` from `level_requirements` for the player's TR (level). e.g. "Darts to be thrown: 3". Currently derived via `getDartsPerStep`; ensure the label "Darts to be thrown: {N}" is explicit.
- [ ] **Expected success** — e.g. "Expected: 2 hits from 3 darts" or equivalent from level_averages/level_requirements. Already present as "Expected (this step)"; confirm wording matches BACKLOG.
- [ ] **Dart 1: —, Dart 2: —, … Dart n: —** — Placeholders for each dart in the visit. If not currently shown, add a line like "Dart 1: —  Dart 2: —  Dart 3: —" that updates as the user selects (e.g. "Dart 1: S17  Dart 2: —  Dart 3: —").
- [ ] **Score input grid** — See §5 below (Single/Double/Treble + 4×5 + 25/Bull).
- [ ] **Clear Visit** — Button to clear current visit selections. Implement if missing; confirm label "Clear Visit".
- [ ] **Undo Last** — **New button** to remove only the last dart from the current visit (e.g. pop last from `visitSelections`). Do not submit; just update local state.
- [ ] **Submit Visit** — Button to submit the current visit. Already present as "Score darts" or "Submit"; confirm label "Submit Visit" if required.

---

## 3. UI fields for routine_type = C (checkout)

- [x] **Attempt number: x of y** — "Attempt number: {attemptIndex} of {attemptCount}" at top of checkout block. `attemptIndex` (1-based) and `attemptCount` from `level_requirements` (C). Running state includes `attemptIndex`; multi-attempt flow: submit updates step run cumulatively and either advances to next attempt (clear visit, increment attemptIndex) or completes step and advances to next step.
- [x] **Expected success rate** — Label "Expected success rate:" with value "X out of Y attempts"; moved directly under Attempt number.
- [x] **Checkout Target** — Relabeled from "Start:" to "Checkout Target:" (value = step.target).
- [x] **Remaining Total** — Relabeled from "Remaining:" to "Remaining Total:" (value = current remaining).
- [x] **Recommended** — Kept "Recommended:" (and "Your route:") in the route line; placement unchanged.
- [x] **Voice / Manual mode button** — Button text "Voice / Manual" (when idle), aria-label "Voice / Manual mode"; "Stop voice" when listening.

---

## 4. Checkout gameplay: per-throw dart_scores and target semantics

BACKLOG specifies that for checkout, each throw is recorded in `dart_scores` as it happens, and the **target** stored per dart is the **recommended segment** for that dart (e.g. T17), not the step target (121).

### 4.1 Per-throw insert (checkout only)

- [ ] **When** — On each dart entry for a checkout step (when the user selects a segment or records a dart), call `insertDartScore` **immediately** for that dart, instead of batching until the end of the attempt/step.
- [ ] **Payload** — Use: `player_id`, `training_id`, `routine_id`, `routine_no`, `step_no`, `dart_no` (1-based within the step/attempt as per existing semantics), `attempt_index` (current attempt 1-based), `target` (see 4.2), `actual` (segment hit, e.g. S17), `result` ('H' or 'M').
- [ ] **Attempt boundary** — When an attempt ends (all darts thrown or checkout/bust), do not delete or re-insert; keep the per-throw inserts. Ensure `dart_no` and `attempt_index` are correct when spreading across multiple attempts (e.g. attempt 1: dart_no 1..9, attempt 2: dart_no 10..18).
- [ ] **Existing batch** — Remove or refactor the current "on step submit" loop that inserts all darts for a checkout step in one go, so that checkout steps only use per-throw inserts. Non-checkout (SS/SD/ST) can remain "on submit" if desired, or align to per-throw later.

### 4.2 Target per dart (checkout)

- [x] **Semantics** — For each dart in a checkout attempt, the **recommended** segment for that dart (given the remaining at the start of that dart) is stored as `target` in `dart_scores` (e.g. `target = 'T17'`, `actual = 'S17'`, `result = 'M'`).
- [x] **Source** — When inserting each dart: compute remaining before that dart from `visitSelections.slice(0, i)`; call `getRecommendedSegmentForRemaining(client, remaining, position)` with position 1, 2, or 3 (min(i+1, 3)); use player variation then checkout combination for that remaining; take dart1/dart2/dart3 for position. Fallback: `step.target` if no recommendation. Implemented in `@opp/data` as `get-recommended-checkout-segment.ts` and used in PlaySessionPage checkout insert loop.
- [x] **Schema** — `dart_scores.target` is `text NOT NULL` (migration 20260218120000); segment codes (e.g. 'T17', 'S20') are valid. For C steps the column stores the recommended segment for that dart.

### 4.3 Remaining and attempt flow

- [ ] **Remaining** — After each throw, reduce remaining by `segmentToScore(actual)`; display updated "Remaining Total" and refresh "Recommended" for the new remaining.
- [ ] **Attempt end** — When remaining hits 0 (valid double/bull finish) or bust (over, 1, or wrong finish), or when all allowed darts for the attempt are used, end the attempt. Then: advance to next attempt (same step) or complete step if no attempts left.
- [ ] **player_step_run** — Ensure `player_step_run` is created when the step starts (already done); update with `actual_successes`, `step_score`, `completed_at` when the step is completed (after all attempts), not on each throw.

---

## 5. Score input grid (SS, SD, ST, and manual checkout)

BACKLOG specifies a specific grid layout and entry pattern.

### 5.1 Layout

- [x] **Three buttons** — Single, Double, Treble (multiplier selection). Implemented in SegmentGrid; selected multiplier highlighted.
- [x] **4 × 5 grid** — Row 1: 1–5, Row 2: 6–10, Row 3: 11–15, Row 4: 16–20. Number buttons disabled until a multiplier is selected.
- [x] **1 × 2** — 25, Bull (plus Miss in same row). 25 and Bull emit without multiplier per BACKLOG.
- [x] **Entry model** — User selects multiplier (S/D/T), then number 1–20 → segment S/D/T + number. 25 and Bull clicked directly. Miss button for miss.
- [x] **Format** — Emitted as xY (S17, D20, T7), "25", "Bull", "M". Stored in visitSelections and dart_scores.actual as before.

### 5.2 Implementation options

- [x] **Option B — Adapt SegmentGrid** — SegmentGrid rewritten: (1) Multiplier row: Single, Double, Treble; (2) four rows of five numbers (1–20); (3) 25, Bull, Miss. State: `selectedMultiplier` (S|D|T|null). On number click with multiplier: emit `{multiplier}{number}`, clear multiplier. 25/Bull/Miss emit directly. Miss kept in same row as 25/Bull (deviation: BACKLOG 1×2 for 25/Bull only; Miss added for scoring).

### 5.3 Clear Visit and Undo Last

- [x] **Clear Visit** — Button "Clear Visit" clears `visitSelections` for the current visit (current step/attempt). In-memory only; for checkout, darts are still written on submit so Clear only resets UI state for the current attempt.
- [x] **Undo Last** — Button "Undo Last" pops the last dart from `visitSelections` (in-memory only). No DB delete; same behaviour for SS/SD/ST and checkout.

### 5.4 Checkout and Clear/Undo

- [x] **Clear Visit** — Clears current attempt’s visit state only (visitSelections). Does not clear prior attempts or delete persisted dart_scores.
- [x] **Undo Last** — Removes last dart from UI state only; no delete of last dart_scores row. Remaining and Recommended update on next render from visitSelections.

---

## 6. Data layer (if required)

- [x] **Delete dart score** — Added `deleteDartScore(client, id)` in `packages/data/src/dart-scores.ts`; exported from `index.ts`. RLS: current policy is admin-only (`dart_scores_delete_admin`). Undo remains UI-only; if "Undo with DB delete" is needed for players later, add policy `dart_scores_delete_own USING (player_id = current_user_player_id())`.
- [x] **Target in dart_scores** — Confirmed: `dart_scores.target` is `text NOT NULL` (migration 20260218120000). Segment codes ('T17', 'S20') and step target string ('121') are valid. Checkout uses recommended segment per dart per §4.2.

---

## 7. Testing and documentation

- [x] **Unit tests** — Added: `deleteDartScore` in `dart-scores.test.ts`; `getRecommendedSegmentForRemaining` in `get-recommended-checkout-segment.test.ts` (out-of-range null, position 1/2/3, prefer variation, null when no combo). Segment format (xY, 25, Bull) in `apps/web/src/constants/segments.test.ts` via `normaliseSegment`.
- [ ] **E2E / manual** — Manual verification: (1) SS/SD/ST: Target, darts to throw, expected success, Dart 1..n, grid (Single/Double/Treble + numbers, 25, Bull, Miss), Clear Visit, Undo Last, Submit Visit. (2) Checkout: Attempt x of y, expected success rate, Checkout Target, Remaining Total, Recommended; record darts; confirm target = recommended segment in DB; complete attempt and step.
- [x] **Docs** — BACKLOG.md updated with "Implemented per BACKLOG_IMPLEMENTATION_CHECKLIST (Feb 2025)". One-line references added in OPP_CHECKOUT_UPDATE_IMPLEMENTATION_CHECKLIST and OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.

---

## 8. Summary table

| Area | BACKLOG requirement | Current state | Action |
|------|---------------------|---------------|--------|
| Common UI | Session name, Player — TR, Cohort — Day — Session, Current session score, Routine X of Y, Step No, Routine Name — Type | Most present; Routine Name — Type and labels to align | Add/relabel per §1 |
| SS/SD/ST | Target, Darts to throw: n, Expected success, Dart 1..n, grid, Clear, **Undo Last**, Submit | Target/expected present; grid is full segment list; no Undo | §2, §5 |
| C | Attempt x of y, Expected rate, Checkout Target, Remaining, Recommended, Voice/Manual | Most present; Attempt x of y explicit | §3 |
| Checkout writes | Per-throw insert into dart_scores; target = recommended segment | Batch on step submit; target step-level | §4 |
| Score grid | 3 buttons (S/D/T) + 4×5 (1–20) + 25, Bull; entry S+17→S17 | SegmentGrid by type (Singles, Doubles, Trebles, 25/Bull, Miss) | §5 |
| Undo Last | New button: remove last dart | Not present | §2, §5.3–5.4 |

---

*Reference: docs/BACKLOG.md (Modify checkout routine logic and gameplay).*
