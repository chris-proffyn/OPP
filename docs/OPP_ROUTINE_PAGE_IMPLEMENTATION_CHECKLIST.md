# OPP Routine Page — Implementation Checklist

Implementation checklist for the behaviour described in **docs/OPP_ROUTINE_PAGE_DOMAIN.md**. The goal is to split gameplay into a **session-level screen** (player, session, current routine) and a **routine-step screen** (step-focused, visit-by-visit, score input) for a more immersive, mobile-friendly experience.

**Prerequisites:** Existing `PlaySessionPage` flow: calendar/session load, start/resume, routine loop, visit collection, `SegmentGrid`, voice/manual input, session end. Data and mutations via `@opp/data` (session runs, step runs, dart_scores, routine/session scoring). No new backend schema required for the split; same data model.

**Scope:** UI and routing only in `apps/web`. PlaySessionPage is refactored to show session-level info; a new RoutineStepPage holds step-level UI. Navigation between “session” and “current step” is in-app (same session run).

---

## 1. Definition of “session view” vs “step view”

- [x] **Session view (PlaySessionPage)** — Shows: player nickname, training rating, session name, session score, current routine index (e.g. “1 of 3”), current routine name. No step-level detail (no target segment, no visit breakdown, no score grid). From here the player enters the current step (navigate to step view).
- [x] **Step view (RoutineStepPage)** — Shows: routine name, game instructions, score input mode (Voice/Manual), target segment, current step scores by visit (e.g. Visit 1: S20, S1, T5; Visit 2: …), “Correct visit” button, and the main score input grid. On step completion, return to session view (or auto-advance to next step and stay in step view).
- [x] **Single source of truth** — Game state (calendarId, session run, routineIndex, stepIndex, visitSelections, scores) remains in one place. Decide whether state lives in PlaySessionPage and RoutineStepPage receives it via route state/context, or a shared parent/layout holds state and both pages read from it. Document the chosen approach in this checklist.

**Decision (single source of truth):** State is held in a **shared layout/context** for the session flow. A layout component wraps `/play/session/:calendarId` (and the nested step route). That layout owns the game state (same shape as today’s `GameState` in PlaySessionPage: loading | ready | running | ended) and provides it via React context. PlaySessionPage and RoutineStepPage both consume that context and call updater functions (e.g. to advance step, set visitSelections, complete session). This keeps one source of truth, avoids passing state through route state on every navigation, and lets the step view read/write the same run and visit data. Implemented in §2 (§8) when adding the layout and step route.

---

## 2. Routing and navigation

- [x] **Route for step view** — Add a route for the routine-step screen. Options:
  - **Option A:** Nested route under session, e.g. `/play/session/:calendarId/step` (or `/play/session/:calendarId/routine/:routineIndex/step/:stepIndex`). Session page and step page both mount under the same session context; state can be lifted to a layout or passed via location state.
  - **Option B:** Same URL `/play/session/:calendarId` with two “modes” (session summary vs step detail) toggled by state; no new route.
- [x] **Recommendation:** Option A (dedicated step route) so the step view is bookmarkable and back button behaves predictably. Document choice.
- [x] **Navigate to step** — From PlaySessionPage (session view), when the player chooses “Start” or “Continue” for the current routine/step, navigate to the step route with calendarId and (if needed) routineIndex/stepIndex in params or state.
- [x] **Return from step** — When a step is completed, either: (i) navigate back to session view and show updated routine/session summary, or (ii) auto-advance to next step (same step view, new step data). When session ends (last step of last routine completed), navigate to session view in “ended” phase or to a session-end screen.
- [x] **Deep link / refresh** — Define behaviour when user opens `/play/session/:calendarId/step` directly or refreshes: load same context as PlaySessionPage (calendar, session, run) and restore routineIndex/stepIndex from URL or from run progress.

**Implemented:** Option A chosen. `PlaySessionLayout` wraps `/play/session/:calendarId` and renders `<Outlet />`. Nested routes: index = `PlaySessionPage`, `step` = `RoutineStepPage` (stub with "Back to session" link). PlaySessionPage shows a "Step view →" link when phase is running, navigating to `/play/session/:calendarId/step`. Return from step: RoutineStepPage has "← Back to session" linking to `/play/session/:calendarId`. Step completion and session-end navigation will be wired when step UI and shared state are in place (§4–§8). Deep link/refresh: opening or refreshing `/play/session/:calendarId/step` shows the stub; when §8 adds layout context, the layout will load run and the step page will restore routineIndex/stepIndex from run progress.

---

## 3. PlaySessionPage (session-level only)

- [x] **Player information** — Display:
  - Player nickname (from player profile/context).
  - Training rating (from player profile; same source as Profile page).
- [x] **Session information** — Display:
  - Current session name.
  - Current session score (running total as routines complete; 0 at start).
- [x] **Current routine** — Display:
  - Current routine index (e.g. “Routine 1 of 3”).
  - Current routine name.
- [x] **Remove from PlaySessionPage** — Move the following to RoutineStepPage (do not duplicate):
  - Target segment, game instructions for the step.
  - Visit-by-visit breakdown (Visit 1: …, Visit 2: …).
  - Score input grid (SegmentGrid) and voice/manual controls.
  - Step-level expected hits / checkout expected (can stay in step view only).
- [x] **Entry point to step** — Provide a clear action (e.g. “Start routine”, “Continue”, “Enter step”) that navigates to the routine-step screen for the current routine/step. If the session is in “running” phase, “Continue” should take the player to the current step.

**Implemented:** Running phase now shows only session-level content: player nickname, training rating, session name (h1), current session score, current routine (e.g. “1 of 3 — Routine name”). Cohort/day/session line shown for non-ITA. All step-level UI (target, visit breakdown, SegmentGrid, voice/manual, expected hits/checkout) removed from PlaySessionPage; that UI will live on RoutineStepPage (§4–§7). Entry point: prominent “Continue to step →” link/button to `/play/session/:calendarId/step`. Ready phase already showed player nickname and TR; unchanged. SegmentGrid import removed from PlaySessionPage.

**Location:** `apps/web/src/pages/PlaySessionPage.tsx`.

---

## 4. RoutineStepPage — high-level information

- [x] **Create page** — New component `RoutineStepPage` (or equivalent name). Route as chosen in §2.
- [x] **Compact header** — Display in a compact format:
  - **Routine name** (e.g. “Singles 20”, “Checkout 56”).
  - **Game instructions** (e.g. “Hit Single 20 three times”, “Check out 56 in 9 darts”). Derive from step target and routine type (reuse existing copy or logic from current PlaySessionPage).
- [x] **Layout** — Keep this block small so the majority of the screen is available for score input and visit detail (mobile portrait).

**Implemented:** RoutineStepPage already existed (§2). Compact header added: routine name (bold, 1rem) and game instructions (muted, 0.9rem) in a small block with a bottom border. Instructions derived via `getGameInstructions(routineType, stepTarget, dartsPerStep)`: for C, “Check out X in N darts”; for SS/SD/ST, “Hit [segmentCodeToSpoken(target)] three times” (or “once” / “N times”). PlaySessionPage “Continue to step” Link now passes `state`: `{ routineName, stepTarget, routineType, dartsPerStep }` so the step page shows real data when navigated from session view. Direct open/refresh still shows defaults when state is missing. Header uses compact styles so most of the screen remains for future score input (§7).

**Location:** `apps/web/src/pages/RoutineStepPage.tsx` (or under `pages/play/` if preferred).

---

## 5. RoutineStepPage — detailed information

- [x] **Score input mode** — Show whether the player is in **Voice** or **Manual** mode (same as current PlaySessionPage). Toggle or link to switch; when voice is unsupported, show “Manual” only.
- [x] **Target segment** — Display the current step target (e.g. “S20”, “56”, “D16”) clearly.
- [x] **Current routine step scores by visit** — For the current step, show each **visit** and its segments. Example for a 3-visit step:
  - Visit 1: S20, S1, T5
  - Visit 2: M, S1, T5
  - Visit 3: T20, T5, M
- [x] **Format** — Use a space-efficient layout (e.g. grid or compact list). Visits are ordered; each visit shows the segment codes (or short labels) for that visit’s darts. Support steps with multiple visits (e.g. 3 darts per visit × N visits).
- [x] **Data source** — Visit data comes from the same state as today: either in-memory `visitSelections` for the current (incomplete) visit, plus persisted dart_scores (or equivalent) for completed visits. Ensure RoutineStepPage can read completed visits for the current step (from session run / step run) and current visit from shared state.

**Implemented:** Target segment shown as a badge (e.g. “S20”, “56”). Score input mode: “Score input: Manual” when voice unsupported, “Voice / Manual” when `useVoiceRecognition().isSupported`. Visit breakdown: “Scores by visit” section with a compact list; total visits = ceil(dartsPerStep/3); each row “Visit N: seg1, seg2, seg3” or “Visit N (current): …”; current visit uses `state.visitSelections`, completed rows use `state.completedVisits[i]` (empty until §8). PlaySessionPage passes `visitSelections` and `completedVisits: []` in step state so the current (incomplete) visit displays when navigating from session. Completed visits will come from shared state/context in §8.

**Location:** `apps/web/src/pages/RoutineStepPage.tsx`.

---

## 6. Visit correction (“Correct visit” button)

- [x] **Button** — Add a “Correct visit” (or “Undo visit”) button on RoutineStepPage. Placement: near the visit breakdown or above the score grid.
- [x] **Behaviour** — On click, **remove the player’s last visit** from the system. Interpretation:
  - If the current visit has darts in it, remove the last dart of the current visit first (same as existing “undo last dart” if present).
  - If the current visit is empty, remove the **last completed visit** (last 3 darts for a 3-dart visit): revert persistence for that visit (e.g. remove or mark reverted in dart_scores/step run) and update UI so that visit’s darts become “current” again for re-entry, or are simply removed and the step is incomplete again.
- [x] **Persistence** — Ensure backend/`@opp/data` supports reverting the last visit (e.g. delete last N dart_scores for the current step run, and adjust step_run totals if applicable). If today’s model does not support undo, add a small API or mutation (e.g. `revertLastVisit(sessionRunId, routineId, stepNo)`) and call it from the button.
- [x] **Edge cases** — Disable or hide “Correct visit” when there is no visit to undo (e.g. no darts in current step yet). After reverting, stay on RoutineStepPage with updated visit list.

**Implemented:** “Correct visit” button added below the visit breakdown; disabled when nothing to undo (`visitSelections.length === 0 && completedVisits.length === 0`). **Undo last dart:** when current visit has darts, navigate with replace and state `visitSelections.slice(0, -1)`. **Undo last completed visit:** `revertLastVisit` in `@opp/data` (dart-scores.ts) deletes the last N dart_scores for the step; RLS policy `dart_scores_delete_own` (migration 20260322120000) allows players to delete own rows. For checkout (C), step run is updated: decrement `actual_successes` if the reverted visit was a success, recompute `step_score`. Then `listDartScoresForStep` refetches remaining darts; UI state is updated with new `completedVisits` and empty `visitSelections` via navigate replace. PlaySessionPage passes `trainingId`, `routineId`, `routineNo`, `stepNo` in step state for revert. Error message shown if revert fails or context is missing. Note: `completedVisits` is currently only passed as `[]` from session; “undo last completed visit” runs when state has completed visits (e.g. after refetch on step or when §8 provides them).

**Location:** `apps/web/src/pages/RoutineStepPage.tsx`; data layer in `@opp/data` if new mutation is required.

---

## 7. Score input (main portion)

- [x] **Primary focus** — The main portion of RoutineStepPage is the **score input grid** (same SegmentGrid or equivalent as today). Make it the dominant UI so the player can input scores quickly.
- [x] **Mobile portrait** — Design and size the grid so it displays efficiently on mobile in portrait mode. Reference resolution: **1170×2532** (or similar). Ensure tap targets remain ≥ 44px (P8) and the grid is readable and usable without horizontal scroll where possible.
- [x] **Voice and manual** — Support both input modes: Voice (existing hook + apply to current visit) and Manual (grid taps). Same behaviour as current PlaySessionPage: one visit at a time; when visit is complete, persist and show in “current step scores by visit”, then clear for next visit or advance step.
- [x] **Integration** — Reuse existing SegmentGrid, `addSegmentToVisit`, `submitVisit`, and any voice wiring from PlaySessionPage. Ensure submitting a visit from RoutineStepPage updates shared state and, when the step is complete, triggers routine/session progression and navigation back to session view (or to next step).

**Implemented:** SegmentGrid is the main content: “Score input” section with Voice button (when supported), current dart labels (Dart 1: …, Dart 2: …, Dart 3: …), SegmentGrid (reused from components), Clear visit / Undo last / Submit visit buttons. Local state (`localVisitSelections`, `localCompletedVisits`) keeps step UI responsive; synced from `location.state` when it changes. **Manual:** `handleAddSegment` adds segment; `handleClearVisit` / `handleUndoLast` clear or undo one dart. **Voice:** `useVoiceRecognition`; on `status === 'result'`, `parseVisitFromTranscript(transcript, stepTarget, 3)` and append segments to visit (capped at `dartsPerStep`). **Submit:** `handleSubmitVisit` inserts darts via `insertDartScore` (checkout uses `getRecommendedSegmentForRemaining`), updates `player_step_run` for C, refetches `listDartScoresForStep` to build `completedVisits`, then either navigates replace with next attempt (C) or navigates to session with `state: { returnFromStepComplete: true }`. PlaySessionPage passes `attemptIndex` and `attemptCount` in step state for C. Tap targets use existing `buttonTapStyle` and SegmentGrid’s 44px minimum. Session does not yet restore running state when `returnFromStepComplete` is set; user can click “Continue to step” again (or §8 will add restore).

**Location:** `apps/web/src/pages/RoutineStepPage.tsx`; reuse `apps/web/src/components/SegmentGrid.tsx` and existing visit/submit logic.

---

## 8. State and data flow

- [x] **Where state lives** — Decide:
  - **Lift state to layout:** A layout component for `/play/session/:calendarId` (and nested step route) holds game state; PlaySessionPage and RoutineStepPage both consume it (e.g. React context or props from layout). On step completion, layout updates state and either re-renders session view or keeps step view with next step.
  - **Session page owns state, step page receives via state:** PlaySessionPage holds state; navigating to step passes state via `navigate(..., { state: { ... } })`; RoutineStepPage receives it and calls back (e.g. via callback or context) to update state on submit/undo. Session page re-reads state when returning.
- [x] **Recommendation** — Lifting to a shared layout or context avoids prop drilling and keeps a single source of truth; step route can read/write the same run and visit data. Document the chosen approach.
- [x] **Persistence** — All mutations (dart_scores, step_run, routine_score, session completion) stay as today; only the UI is split. Ensure RoutineStepPage uses the same `@opp/data` calls (e.g. `insertDartScore`, `updatePlayerStepRun`, etc.) when the player completes a visit or step.

**Implemented:** Chosen approach: **lift state to layout/context**. Created `SessionGameContext` (`apps/web/src/context/SessionGameContext.tsx`) with `GameState` and `RoutineWithSteps` types, and a hook `useSessionGameState(calendarId)` that performs load, `startResume`, `addSegmentToVisit`, `setVisitFromSegments`, `clearVisit`, `undoLast`, and `submitVisit`. All persistence stays in the context (same `@opp/data` calls). `PlaySessionLayout` wraps `<Outlet />` with `SessionGameProvider` (provider reads `calendarId` from `useParams()`). `PlaySessionPage` uses `useSessionGameContext()` and renders from `context.gameState`; Start/Resume calls `context.startResume`. `RoutineStepPage` uses `useSessionGameContext()`, derives current routine/step from `context.gameState`, uses `context.addSegmentToVisit`, `context.submitVisit`, `context.clearVisit`, `context.undoLast`, and `context.setVisitFromSegments` (voice); on submit, uses return value of `submitVisit()` (`stepComplete`, `sessionComplete`, `nextAttemptIndex`) to navigate back to session or replace for next attempt. Completed visits for display are synced from `listDartScoresForStep` in a local effect. Revert (correct visit) still uses `revertLastVisit` and then updates context via `setGameState` (visitSelections cleared) and refetches completed visits.

---

## 9. Session end and edge cases

- [x] **Session ended** — When the last step of the last routine is completed, perform the same “session end” logic as today (e.g. `completeSessionRun`, ITA completion or training rating progression). Then navigate to a session-end view or back to session view in “ended” phase (showing final score and option to leave).
- [x] **Back button** — From RoutineStepPage, browser or in-app “Back” should return to session view (PlaySessionPage) without losing session run state. Do not submit or revert visits on back unless product specifies otherwise.
- [x] **Invalid or missing context** — If RoutineStepPage is opened with invalid calendarId or missing run, redirect to play landing or session view with an error message.

**Implemented:** **Session ended:** Handled in `SessionGameContext.submitVisit()`: when the last routine is completed it calls `completeSessionRun`, `completeITAAndSetBR` or `applyTrainingRatingProgression`, `refetchPlayer`, then sets `gameState.phase` to `'ended'`. RoutineStepPage navigates to session when `submitVisit()` returns `sessionComplete`. PlaySessionPage renders the "Session complete" view (final score, new TR, routine scores, "Back to Play" / "Return to dashboard") when `gameState.phase === 'ended'`. **Back button:** "← Back to session" on RoutineStepPage is a Link to the session URL; no submit or revert on click. Browser back from step to session keeps the same layout/context, so run state is preserved. **Invalid context:** RoutineStepPage redirects to session view when `phase === 'invalid'` (useEffect with navigate replace) so PlaySessionPage shows the error alert and "← Back to Play". When `calendarId` is missing, the step page shows "← Back to Play" linking to `/play`.

---

## 10. Tests and documentation

- [x] **Unit/behavior** — If new helpers or state logic are extracted, add tests (e.g. “correct visit” reverts last visit, visit breakdown formatting). Optional: shallow tests for RoutineStepPage rendering with mock state.
- [x] **E2E / manual** — Manually verify: start session → enter step → input visits (manual and voice) → correct visit → complete step → return to session view → session score and routine index update; complete session and see end screen.
- [x] **Docs** — Update this checklist with “Implemented” notes and reference OPP_ROUTINE_PAGE_DOMAIN.md. Optionally add a short “Routine page flow” section to PROJECT_STATUS_TRACKER or UX docs.

**Implemented:** Unit/behavior: Pure helpers in `sessionGameState.ts`; tests in `SessionGameContext.test.ts` (21 tests). E2E/manual: Manual verification as above. Docs: Implemented notes in checklist; Routine page flow added to PROJECT_STATUS_TRACKER §3.

---

## 11. Summary table

| Requirement (OPP_ROUTINE_PAGE_DOMAIN) | Current state | Action |
|---------------------------------------|---------------|--------|
| PlaySessionPage shows player nickname | Partial / elsewhere | §3: Add to session view |
| PlaySessionPage shows training rating | Partial / elsewhere | §3: Add to session view |
| PlaySessionPage shows session name & score | Partially present | §3: Keep and ensure session score visible |
| PlaySessionPage shows current routine (e.g. 1 of 3) and name | Partially present | §3: Ensure clear; remove step detail |
| Move step-level UI to new screen | Not done | §2, §4–§7: New RoutineStepPage + route |
| RoutineStepPage: routine name, game instructions | N/A | §4: Compact header on step page |
| RoutineStepPage: score input mode (Voice/Manual) | In PlaySessionPage | §5: Move to step page |
| RoutineStepPage: target segment | In PlaySessionPage | §5: Move to step page |
| RoutineStepPage: current step scores by visit | In PlaySessionPage (implicit) | §5: Explicit visit breakdown (grid/list) |
| Correct visit button | Not present | §6: Add; revert last visit + persistence |
| Score input grid main portion, mobile-friendly | In PlaySessionPage | §7: Move to step page; size for 1170×2532 |

---

## 12. Implementation order (suggested)

1. **§1** — Define session view vs step view and where state lives (§8).
2. **§2** — Add route for RoutineStepPage and navigation rules (to step, back, deep link).
3. **§8** — Implement shared state (layout or context) so both pages read/write the same run and visits.
4. **§3** — Refactor PlaySessionPage to session-level only (player, session, current routine; remove step UI; add “Start/Continue” to step).
5. **§4–§5** — Create RoutineStepPage with header (routine name, instructions), score mode, target, and visit breakdown.
6. **§7** — Move SegmentGrid and voice/manual input to RoutineStepPage; wire submit/advance and return to session view.
7. **§6** — Add “Correct visit” button and revert-last-visit logic (UI + data layer if needed).
8. **§9** — Session end, back button, invalid context.
9. **§10** — Tests and documentation.

---

*Reference: docs/OPP_ROUTINE_PAGE_DOMAIN.md.*
