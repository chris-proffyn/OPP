# P5 — Training Rating: Implementation Tasks

**Document Type:** Implementation plan (Phase 5)  
**Project:** OPP Darts Training Platform  
**Spec reference:** `docs/P5_TRAINING_RATING_DOMAIN.md`  
**Status:** Not started

---

## 0. GE scoring input — segment grid and visit entry (P4 enhancement)

Per P4 domain §7.4 (updated). Record actual segment per dart; players enter entire visit in one go via a segment grid.

- [x] **0.1** **Segment codes:** Define canonical segment codes: Singles S1–S20, Doubles D1–D20, Trebles T1–T20, 25, Bull, Miss (M). Use for `dart_scores.actual`; result remains H/M (hit when actual matches step target).
- [x] **0.2** **Segment grid UI:** Create a grid component showing all segments (grouped: Singles, Doubles, Trebles, 25, Bull, Miss). Player taps one segment per dart until N darts (visit) are chosen; show “Dart 1: S20”, “Dart 2: —”, etc. Provide “Clear” to reset current visit. “Submit visit” when N darts selected.
- [x] **0.3** **Visit-at-a-time:** In PlaySessionPage, replace per-dart Hit/Miss with: collect N segment selections for the current step, then submit visit — insert N rows into dart_scores (actual = segment code, result = actual matches target ? 'H' : 'M'). Derive hits for round score from result. Support target normalisation (e.g. “Single 20” vs “S20”) for hit detection.
- [x] **0.4** **Documentation:** P4 domain §7.4 updated to describe segment grid and visit entry; this checklist section added.

---

## 1. Migrations and schema (optional)

Per domain §4.1 and §11. No new tables for P5 core. Optional columns for ITA audit.

- [x] **1.1** Decide product choice: add **`players.ita_score`** (numeric NULL) and **`players.ita_completed_at`** (timestamptz NULL) for ITA audit and “has completed ITA”, or infer from `baseline_rating` only. If adding: create migration `supabase/migrations/YYYYMMDDHHMMSS_add_players_ita_columns.sql` with ALTER TABLE adding the two columns; no RLS change (players_update_own already allows own row update). **Done:** migration `20260219120000_add_players_ita_columns.sql` adds both columns with COMMENTs.
- [x] **1.2** If migration created, apply to Supabase project and verify columns exist (e.g. `supabase db push` or `supabase migration up`; then `SELECT ita_score, ita_completed_at FROM players LIMIT 1`). **Done:** applied via Supabase MCP; columns verified.

---

## 2. Data layer — progression logic

Per domain §6. All functions accept Supabase client.

- [x] **2.1** **levelChangeFromSessionScore(sessionScorePercent: number): number** — Pure function. Returns −1 for &lt;50%, 0 for 50–99%, +1 for 100–199%, +2 for 200–299%, +3 for ≥300%. Unit-test.
- [x] **2.2** **applyTrainingRatingProgression(client, playerId, sessionScorePercent)** — Read current `players.training_rating` for playerId (or 0 if null); add levelChangeFromSessionScore(sessionScorePercent); clamp result to 1–99; UPDATE players SET training_rating = newValue WHERE id = playerId. Enforce caller is that player (or admin) via RLS. Return new value or void. Throw NOT_FOUND if player missing.
- [x] **2.3** Export from `packages/data`; use DataError for NOT_FOUND. Ensure only own row can be updated (RLS already allows players_update_own).

---

## 3. Data layer — BR and initial CR

Per domain §5 and §10.

- [x] **3.1** **setBaselineAndTrainingRating(client, playerId, baselineRating)** — UPDATE players SET baseline_rating = baselineRating, training_rating = baselineRating WHERE id = playerId. Only if current user is that player or admin (RLS). Optional: guard so BR is set only once (e.g. allow only when baseline_rating IS NULL) unless re-assessment is supported. Return updated player or void.
- [x] **3.2** Ensure **updatePlayer** (P1) or equivalent does not overwrite baseline_rating/training_rating from profile edit; or add a dedicated function so only progression and ITA flow update these fields. Document in code.
- [x] **3.3** **Default BR (Option A):** On onboarding (createPlayer or after profile complete), set baseline_rating = 0 and training_rating = 0 if product choice is “all start at level 0”. Implement in onboarding flow or document “set on first session” if BR stays null until ITA.

---

## 4. Data layer — ITA calculation (pure functions)

Per domain §5.2 and §10. OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §4.

- [x] **4.1** **computeSinglesRating(segmentScores: number[]): number** — Segment score = (hits/9)×100; Singles rating = average of segment scores. Pure; unit-test with spec example (e.g. 22%, 33%, 11%, 33%, 44% → 26.4%).
- [x] **4.2** **computeDoublesRating(avgDartsToHit: number): number** — Sliding scale: 1→100, 2→90, 3→70, 4→50, 5→30, &gt;5→0; linear interpolation between integer values. Pure; unit-test (e.g. 5.7 darts → ~9).
- [x] **4.3** **computeCheckoutRating(avgDartsAboveMin: number): number** — Scale: min→100, min+1→80, min+2→60, min+3→40, min+4→20, min+10+→0. Pure; unit-test with spec example.
- [x] **4.4** **computeITAScore(singlesRating: number, doublesRating: number, checkoutRating: number): number** — (3×Singles + 2×Doubles + 1×Checkout) / 6. Pure; unit-test (e.g. 26.4, 9, 80 → 29.53 → round down 29).
- [x] **4.5** Export all four from `packages/data` (e.g. from `scoring.ts` or new `ita-scoring.ts`). No Supabase dependency for these.

---

## 5. Data layer — ITA session result and BR set

Per domain §5.3 and §9.2. Derive Singles/Doubles/Checkout from session run data; then call setBaselineAndTrainingRating.

- [x] **5.1** **deriveITARatingsFromSessionRun(client, sessionRunId)** (or equivalent) — For the given session run, load dart_scores and routine/session structure. If session is not ITA (three routines: Singles, Doubles, Checkout), return null or throw. Compute segment scores per routine (Singles: 9 darts per step/segment; Doubles: darts to hit double per segment; Checkout: darts above min per checkout). Return { singlesRating, doublesRating, checkoutRating } or raw data for caller to compute. May require routine names or order to identify Singles/Doubles/Checkout.
- [x] **5.2** Alternatively: **computeITARatingsFromDartScores(sessionRunId, dartScores, sessionRoutines, routineSteps)** — Pure (given data), returns { singlesRating, doublesRating, checkoutRating }. Data layer then has a thin wrapper that loads run + darts + routines and calls this, then computeITAScore and setBaselineAndTrainingRating. Prefer testable pure core.
- [x] **5.3** Document how Singles/Doubles/Checkout routines are identified (e.g. by routine name containing “Singles”/“Doubles”/“Checkout”, or by position 1/2/3 in ITA session). Per domain §9.1 Option A (name-based).

---

## 6. GE integration — apply CR progression at session end

Per domain §6.2 and §6.3.

- [x] **6.1** In **PlaySessionPage** (or shared completion handler): after **completeSessionRun** and **updatePlayerCalendarStatus**, call **applyTrainingRatingProgression(client, playerId, sessionScorePercent)** using the same session score just saved. Use session_score from the completed run (already in state). Ensure refetch of player (e.g. refetchPlayer from context) after progression so UI shows updated TR on next navigation.
- [x] **6.2** **Skip progression for ITA sessions:** Before calling applyTrainingRatingProgression, determine if the completed session is an ITA session (e.g. session name “ITA” or “Initial Training Assessment”, or session id in config). If ITA, do not call applyTrainingRatingProgression; instead run ITA completion flow (derive ITA ratings → computeITAScore → setBaselineAndTrainingRating). See §7.
- [x] **6.3** Handle null training_rating: progression function treats null as 0; after update, TR will be 1–99. Ensure Home/Play display TR as 0 or “—” when null as needed.

---

## 7. GE — ITA session identification and completion flow

Per domain §9.

- [x] **7.1** **ITA session identification:** In GE, when loading session, treat session as ITA if session name equals “ITA” or “Initial Training Assessment” (case-insensitive or exact match per product choice). Alternatively store a list of ITA session ids in config/env. Document in code. **Done:** shared `isITASession(sessionName)` in `apps/web/src/utils/ita.ts`; PlaySessionPage uses it; name-based (no config).
- [x] **7.2** **On ITA session end:** When the completed session is ITA: (1) Load session run and dart_scores for this run; (2) Compute Singles, Doubles, Checkout ratings from darts/routines (using routine order 1=Singles, 2=Doubles, 3=Checkout, or name match); (3) Compute ITA score = computeITAScore(S, D, C); (4) Set BR = ITA score (or 50% if product choice); (5) Call setBaselineAndTrainingRating(client, playerId, BR); (6) Optionally set players.ita_score and ita_completed_at if migration was added. Do not call applyTrainingRatingProgression. **Done:** `completeITAAndSetBR` calls `setPlayerITACompleted(client, playerId, ratings.itaScore)` after `setBaselineAndTrainingRating`; `setPlayerITACompleted` in `packages/data/src/players.ts` updates ita_score and ita_completed_at.
- [x] **7.3** **ITA in available sessions:** Ensure ITA session can appear in getAvailableSessionsForPlayer like any other session (e.g. admin adds ITA to schedule and generates calendar). No special route; same /play and /play/session/:calendarId flow. **Done:** play list uses getAllSessionsForPlayer; ITA is a normal session; no code change; same /play flow.
- [x] **7.4** **First-time player:** If product choice is “default BR 0”, set baseline_rating and training_rating to 0 on onboarding (createPlayer or after profile). If “BR only from ITA”, leave null until ITA completion; then set both from ITA. **Done:** createPlayer in packages/data/src/players.ts sets baseline_rating: 0 and training_rating: 0.

---

## 8. Dashboard and GE display of TR

Per domain §8.

- [x] **8.1** **Home (dashboard):** Ensure current TR is displayed from player.training_rating (already in context). If HomePage does not yet show TR, add it. Show “—” or “0” when null. No PR/MR yet. **Done:** HomePage shows TR (value or "—"); PR/MR as "—” / "N/A" (show “—” or “N/A”).
- [x] **8.2** **GE game screen:** Already shows TR in context; ensure after session end the context refetches player so TR is updated when user navigates to Play or Home. Use refetchPlayer() or equivalent after applyTrainingRatingProgression / ITA completion. **Done:** refetchPlayer() called after both flows in PlaySessionPage.
- [x] **8.3** **Session end summary:** Optionally show “New TR: X” on the session-complete screen (read from return value of applyTrainingRatingProgression or refetched player). **Done:** "New TR: X" on session-complete from refetched player.

---

## 9. Unit tests

Per domain §12.

- [x] **9.1** **levelChangeFromSessionScore:** &lt;50% → −1; 50–99% → 0; 100–199% → +1; 200–299% → +2; ≥300% → +3. Edge cases: 49.9, 50, 99, 100, 299, 300. **Done:** scoring.test.ts; added edge-case it.
- [x] **9.2** **applyTrainingRatingProgression:** Mock client. Current TR 24, session 75% → TR stays 24; current TR 24, session 120% → TR 25; current TR null → treat 0, session 150% → TR 1 (clamped); current TR 99, session 300% → TR 99 (clamp). NOT_FOUND when player missing. **Done:** progression.test.ts with createMockClient.
- [x] **9.3** **setBaselineAndTrainingRating:** Mock client. Sets baseline_rating and training_rating; idempotent or guarded (e.g. only when baseline_rating IS NULL) per product choice. **Done:** players.test.ts — sets BR/TR, NOT_FOUND, VALIDATION when BR already set.
- [x] **9.4** **ITA pure functions:** computeSinglesRating, computeDoublesRating, computeCheckoutRating, computeITAScore — test with OPP_TRAINING_RATING_ENGINE_SPEC_v2.md §4 examples (e.g. Singles 26.4%, Doubles 9, Checkout 80 → ITA 29.53). **Done:** ita-scoring.test.ts; spec §4 example describe block.

---

## 10. Documentation and cleanup

- [x] **10.1** Update README or docs: mention P5 Training Rating (CR progression after session; BR/ITA; TR on dashboard and in GE). No MR/PR yet (P7). **Done:** README Architecture (P1–P5) updated with P5 TR paragraph.
- [x] **10.2** Ensure no GE UI code imports Supabase directly; only `packages/data` and auth context. TR update flow uses only data layer functions. **Done:** Verified — client from useSupabase(), @opp/data only; type-only import in SupabaseContext.
- [x] **10.3** Update **PROJECT_STATUS_TRACKER.md**: when P5 complete, mark **P5 — Training Rating** checkbox and add brief “P5 delivered” note in Completed section (BR/ITA, CR progression, TR display). **Done:** P5 checkbox marked; Completed entry added.

---

## Progress summary

| Section | Tasks | Done |
|---------|-------|------|
| 0. GE scoring input — segment grid and visit | 4 | 4 |
| 1. Migrations and schema (optional) | 2 | 2 |
| 2. Data layer — progression logic | 3 | 3 |
| 3. Data layer — BR and initial CR | 3 | 3 |
| 4. Data layer — ITA calculation (pure) | 5 | 5 |
| 5. Data layer — ITA session result and BR set | 3 | 3 |
| 6. GE integration — apply CR at session end | 3 | 3 |
| 7. GE — ITA identification and completion | 4 | 4 |
| 8. Dashboard and GE display of TR | 3 | 3 |
| 9. Unit tests | 4 | 4 |
| 10. Documentation and cleanup | 3 | 3 |

**Execution rule:** One task (or sub-task) at a time; mark checkbox when done; run relevant tests before moving on.
