# P5 — Training Rating: Domain Document

**Document Type:** Domain specification (Phase 5)  
**Project:** OPP Darts Training Platform  
**Audience:** Delivery team, Cursor  
**Status:** v1.0  
**Authority:** Defines all required behaviour for Phase 5 (Training Rating end-to-end). Implementation must conform to this document.

---

## 1. Purpose and scope

### 1.1 Purpose

This document describes **every behaviour required for Phase 5 — Training Rating (TR)** so that:

- Implementers can build without ambiguity.
- Acceptance criteria are testable.
- Scope is limited to: Baseline Rating (BR), Initial Training Assessment (ITA), Current Rating (CR) progression after each training session, use of level requirements, and display of TR in GE and dashboard. Match Rating (MR), Player Rating (PR), and competition sessions are P7; dashboard UI polish and Performance Analyzer are P6.

### 1.2 Phase 5 objectives (from PRD)

- **BR:** Default (e.g. 0) or from ITA. ITA = weighted combination of Singles, Doubles, Checkout ratings per **OPP_TRAINING_RATING_ENGINE_SPEC_v2.md**.
- **ITA:** Special session type (Singles + Doubles + Checkout routines); ITA score calculated; BR (and initial CR) set once per player (or on re-assessment).
- **CR progression:** After each training session: session score % → level change (−1 / 0 / +1 / +2 / +3); CR updated and clamped 1–99. TR = CR (displayed as Training Rating).
- **Level requirements:** Per-decade target and hits/darts (already in `level_requirements`); used for pass/fail display and for progression (round score uses target hits).
- **Display:** TR (CR) on dashboard and in GE; used for cohort grouping and (future) handicap.

### 1.3 In scope for P5

- **Players table:** Use existing `baseline_rating` and `training_rating`. Optionally add columns for ITA audit (e.g. `ita_score`, `ita_completed_at`) if product requires storing ITA result for display or re-assessment.
- **Progression logic:** After session end (when `completeSessionRun` and `updatePlayerCalendarStatus` are called), compute level change from session score %, update `players.training_rating` (CR), clamp 1–99.
- **ITA:** Define or identify ITA session type (session containing Singles, Doubles, Checkout routines in order). On ITA completion: compute ITA score per spec (§4.2–4.5); set `baseline_rating` (and `training_rating` if not yet set) from ITA result (option: 100% of ITA or 50% for headroom). Mark player as “ITA completed” (e.g. `ita_completed_at` or infer from `baseline_rating` set).
- **Data layer:** Function(s) to apply CR progression (session score % → level change → update `players.training_rating`); ITA calculation and BR/CR set; read level requirements (already in P2/P4).
- **GE integration:** At session end, after persisting session run and scores, call CR progression for the current player and session score. Do not update CR for ITA session using normal progression (ITA sets BR/initial CR only).
- **Dashboard / GE:** Display current TR (from `players.training_rating`); no new routes required if P4 GE and home already show TR—ensure they read updated value after session end.

### 1.4 Out of scope for P5

- **Match Rating (MR), OMR, competition sessions** — P7.
- **Player Rating (PR)** — Combined TR+MR; P7 or when MR exists.
- **Dashboard UI beyond TR display** — Full dashboard layout, trends, next competition: P6.
- **Performance Analyzer** — P6.
- **Voice input** — P8.
- **Re-assessment / reset ITA** — Can be deferred; document may allow “ITA completed once” and optional admin reset for re-assessment.

---

## 2. References

- **PRODUCT_REQUIREMENTS.md** — FR-5.4 (session end, TR progression), FR-5.5 (ITA), FR-6.1–FR-6.4 (BR, level requirements, CR update, TR display).
- **OPP_TRAINING_RATING_ENGINE_SPEC_v2.md** — BR (§3), ITA (§4: Singles, Doubles, Checkout; §4.5 ITA calculation), CR (§5), Round/Session scoring (§6), Level requirements (§7), Progression logic (§8).
- **OPP Platform.md** — Players (BR, TR); level requirements; Game Engine updates player ratings.
- **P1_FOUNDATION_DOMAIN.md** — Players table (`baseline_rating`, `training_rating`).
- **P2_TRAINING_CONTENT_DOMAIN.md** — Sessions, routines, routine_steps; `level_requirements` (min_level, tgt_hits, darts_allowed).
- **P4_GAME_ENGINE_DOMAIN.md** — Session run, session score, completeSessionRun, level check; where to trigger CR update (session end).
- **P3_COHORTS_CALENDAR_DOMAIN.md** — player_calendar, updatePlayerCalendarStatus.
- **RSD_DATA_MODELLING_GUIDE.md** — Naming, snake_case, migrations.

---

## 3. Definitions

| Term | Definition |
|------|-------------|
| **TR (Training Rating)** | Player’s current training-proven skill level. Range 1–99. Displayed as “TR” in UI. Stored in `players.training_rating`. |
| **CR (Current Rating)** | Same as TR. “CR” is used in the TR spec for the live value that is updated after each session; in the data model it is `players.training_rating`. |
| **BR (Baseline Rating)** | Initial rating: either default (e.g. 0) or derived from ITA. Stored in `players.baseline_rating`. Becomes the initial CR when set. |
| **ITA (Initial Training Assessment)** | One-time assessment session: Singles + Doubles + Checkout routines. Produces ITA score; BR (and initial TR) set from it. |
| **Level change** | Integer delta (−1, 0, +1, +2, +3) derived from session score % per progression table. Applied to CR after each (non-ITA) training session. |
| **Decade** | Level range 0–9, 10–19, …, 90–99. Used for level_requirements lookup (min_level = 0, 10, 20, …). |

---

## 4. Data model

### 4.1 Players (existing)

- **`players.baseline_rating`** (numeric, nullable): Set on onboarding (default 0) or after ITA completion. Never updated by normal session progression.
- **`players.training_rating`** (numeric, nullable): Current Rating (CR). Updated after each training session by progression logic. Clamped 1–99. For new players, set to BR when BR is set (e.g. after ITA or default 0).

Optional (product choice):

- **`players.ita_score`** (numeric, nullable): Store ITA score for display/audit.
- **`players.ita_completed_at`** (timestamptz, nullable): When ITA was completed; allows “has done ITA” and optional re-assessment flow.

If not added, “ITA completed” can be inferred from `baseline_rating` being non-null and optionally from a dedicated session_run or calendar entry type.

### 4.2 Level requirements (existing, P2)

- **`level_requirements`**: `min_level` (decade start), `tgt_hits`, `darts_allowed`. Used for: (1) round score target (hits vs tgt_hits); (2) display “Expected: tgt_hits/darts_allowed”; (3) progression uses same round/session scoring already implemented in P4.

No new tables required for P5 core. Session score is already stored on `session_runs.session_score`; CR update reads it and writes back to `players.training_rating`.

---

## 5. Baseline Rating (BR) and initial CR

### 5.1 Default entry (Option A)

- New player completes profile; BR can be set to **0** (or left null until ITA).
- If BR = 0: set **training_rating = 0** (or 1 if clamp is applied at display time). Progression after first session will apply level change to this value; clamp 1–99 ensures CR never below 1 after first update if product rule is “CR minimum 1 once playing”.

Product decision: whether “BR = 0” means “no rating yet” (TR null or 0) or “level 0” (TR = 0, then progression applies). Spec says “All players start at Level 0” for Option A.

### 5.2 Initial Training Assessment (ITA, Option B)

- **ITA session:** A special session type that contains exactly three routines in order: **Singles**, **Doubles**, **Checkout** (per TR spec §4.1). Identification: by session name or by a dedicated session type/flag (e.g. admin creates a session “ITA” with those three routines). Implementation may use a fixed session name or a configurable “ITA session” marker.
- **Singles routine (§4.2):** Segments (e.g. 20, 16, 12, 19, 1); 9 darts per segment. Segment score = (hits / 9) × 100. Singles score = average of segment scores. Singles rating = that % (e.g. 26.4% → L26.4).
- **Doubles routine (§4.3):** Segments 20, 10, 16, 8, 4. Measure: average darts to hit the double. Sliding scale: 1 dart → 100, 2 → 90, 3 → 70, 4 → 50, 5 → 30, >5 → 0; linear interpolation between.
- **Checkout routine (§4.4):** Checkouts 56, 39, 29, 23, 15. Measure: darts above minimum. Scale: min → 100, min+1 → 80, min+2 → 60, min+3 → 40, min+4 → 20, min+10+ → 0.
- **ITA score (§4.5):**  
  **ITA = (3 × Singles_rating + 2 × Doubles_rating + 1 × Checkout_rating) / 6**  
  Rounded (e.g. down to integer) → e.g. L29.
- **BR from ITA:** Either BR = ITA score (recommended) or BR = 50% of ITA (headroom). **Initial CR:** Set `training_rating = baseline_rating` when BR is set from ITA.
- **When to run ITA:** Once per player (e.g. before first training session, or as first “session” in cohort). Re-assessment: out of scope or optional admin action (reset BR/ITA and allow second ITA).

### 5.3 Data layer (BR / ITA)

- **setBaselineAndTrainingRating(client, playerId, baselineRating)** — Set `players.baseline_rating` and `players.training_rating` to the same value (e.g. after ITA). Only if current user is that player or admin. Idempotent or guarded so BR is set only once unless re-assessment is supported.
- **getPlayerById(client, playerId)** — Already exists; returns baseline_rating, training_rating.
- ITA calculation can live in `packages/data` or in app logic that reads dart_scores/session run for the ITA session and computes Singles/Doubles/Checkout then ITA; then calls setBaselineAndTrainingRating. Prefer pure functions for Singles/Doubles/Checkout/ITA math so they are testable.

---

## 6. Progression logic (CR update after session)

### 6.1 Rule (per TR spec §8)

After each **training** session (not ITA):

| Session score % | Level change |
|-----------------|-------------|
| &lt; 50%         | −1          |
| 50–99%          | 0           |
| 100–199%        | +1          |
| 200–299%        | +2          |
| ≥ 300%          | +3          |

**New CR = current CR + level change**, then **clamp to 1–99**.

- If current CR is null, treat as 0 (or skip update and leave null; product choice: new players without ITA may have null TR until first session, then 0 + change clamped).
- Session score is already stored on `session_runs.session_score` (percentage, 0–100+). Use that value for the table above.

### 6.2 When to run

- **Trigger:** Immediately after session end in the same flow that calls `completeSessionRun` and `updatePlayerCalendarStatus`. Same transaction or sequential: (1) complete session run (session_score saved), (2) update player_calendar to completed, (3) apply CR progression (read session_score, read player’s current training_rating, compute new CR, update players.training_rating).
- **Who:** Only the player who completed the session (or system on their behalf). RLS: only that player (or admin) can update `players.training_rating` for their row.
- **ITA sessions:** Do **not** apply progression. Set BR and initial TR from ITA result only. Identify ITA session by session type/name or by “first session and is ITA” product rule.

### 6.3 Data layer

- **applyTrainingRatingProgression(client, playerId, sessionScorePercent)** — Compute level change from session score; read current `players.training_rating`; add change; clamp 1–99; update `players.training_rating`. Returns new value or void. Throws if player not found or not allowed.
- Called from app (e.g. PlaySessionPage or a small service) after `completeSessionRun` and before or after `updatePlayerCalendarStatus`. Alternatively implemented as a single “completeSessionAndUpdateTR” orchestration that does run + calendar + CR in sequence.

---

## 7. Level requirements usage

- **Existing:** `level_requirements` has per-decade `min_level`, `tgt_hits`, `darts_allowed`. P4 already uses them for round score (roundScore(hits, tgt_hits)) and display (“Expected: tgt_hits/darts_allowed”).
- **P5:** No schema change. Progression uses the same session score % already computed in P4 (average of round scores; round = hits/tgt_hits × 100). Ensure decade is derived from **current** CR (training_rating) when looking up level requirement for display; after CR update, next session will use the new decade.

---

## 8. GE and dashboard display

- **GE:** Already shows “Your level”, “Expected: tgt/darts”, and session/round scores. Ensure after session end the player’s `training_rating` is updated so that on next load (e.g. back to Play or Home) the displayed TR is the new value.
- **Dashboard (Home):** Show current TR (from `players.training_rating`). If P6 expands dashboard, TR remains the authoritative Training Rating; trends can be added in P6.
- **No PR/MR yet:** Display “—” or “N/A” for MR and PR until P7.

---

## 9. ITA session identification and flow

### 9.1 Identifying an ITA session

- **Option A:** Admin creates a session named “ITA” (or “Initial Training Assessment”) with exactly three routines: Singles, Doubles, Checkout (in that order). App treats any session with a known ITA session id or name as ITA.
- **Option B:** Configurable “session type” or flag on session (e.g. `session_type = 'ita'`). Requires migration adding a column to `sessions` or a lookup table.
- **Option C:** Fixed session id stored in config or env (e.g. first cohort schedule includes one ITA session). Least flexible.

Recommendation: **Option A** for P5 (name-based or a single known session id). If product needs multiple ITA variants, add session type in a later iteration.

### 9.2 ITA flow (player)

1. Player has no BR yet (or re-assessment allowed). GE shows “Available sessions” including the ITA session (if present in their calendar).
2. Player starts ITA session; GE runs through Singles, Doubles, Checkout routines (same dart/round capture as P4).
3. On ITA completion: compute Singles score (average of segment scores, 9 darts per segment); Doubles (avg darts to hit double → scale); Checkout (darts above min → scale). Then ITA = (3×Singles + 2×Doubles + 1×Checkout)/6. Set BR = ITA (or 50% ITA); set TR = BR. Mark ITA completed (e.g. set ita_completed_at or leave baseline_rating non-null).
4. Do **not** apply normal progression (no level change) for this session.

### 9.3 Re-assessment

- Out of scope for P5 minimum: “ITA once per player” is sufficient. Optional: admin can clear `ita_completed_at` and allow player to run ITA again; on second ITA completion, overwrite BR and TR with new ITA result.

---

## 10. Data layer summary

| Function | Purpose |
|----------|---------|
| **applyTrainingRatingProgression(client, playerId, sessionScorePercent)** | Compute level change; update players.training_rating; clamp 1–99. |
| **setBaselineAndTrainingRating(client, playerId, baselineRating)** | Set baseline_rating and training_rating (e.g. after ITA or default 0). |
| **computeITAScore(singlesRating, doublesRating, checkoutRating)** | Pure: (3×S + 2×D + 1×C)/6. |
| **computeSinglesRating(segmentScores)** | Pure: segment score = (hits/9)×100; Singles = average of segment scores. |
| **computeDoublesRating(avgDartsToHit)** | Pure: sliding scale 1→100, 2→90, …; interpolate. |
| **computeCheckoutRating(avgDartsAboveMin)** | Pure: sliding scale min→100, min+1→80, …; interpolate. |

Existing: getCurrentPlayer, getPlayerById, getLevelRequirementByMinLevel, completeSessionRun, updatePlayerCalendarStatus.

---

## 11. Migrations

- **Optional:** Add `players.ita_score` (numeric), `players.ita_completed_at` (timestamptz) if product wants to store ITA result and “has completed ITA” explicitly. Otherwise infer from baseline_rating set.
- **RLS:** Players can update own row (already have players_update_own). Ensure only own `training_rating` and `baseline_rating` are updated by progression and ITA logic (no cross-player writes except admin).
- No new tables for P5 core.

---

## 12. Testing and acceptance

- **Unit tests:** applyTrainingRatingProgression: e.g. session 75% → change 0, CR unchanged; session 120% → +1, CR increases by 1; clamp at 1 and 99. setBaselineAndTrainingRating: BR and TR set; idempotent or guarded. ITA pure functions: computeITAScore, Singles/Doubles/Checkout from spec examples.
- **Integration:** Player completes a training session; verify session_score on session_run; verify players.training_rating updated by correct level change. Player completes ITA; verify baseline_rating and training_rating set; no progression applied.
- **GE:** After session end, navigate to Home or Play; TR displayed is updated value.

---

## 13. Document history

- **v1.0** — Initial P5 Training Rating domain (BR, ITA, CR progression, level requirements usage, GE/dashboard display, data layer, no MR/PR).
