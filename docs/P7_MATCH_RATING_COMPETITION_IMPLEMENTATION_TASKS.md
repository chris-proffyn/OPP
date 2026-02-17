# P7 — Match Rating and Competition: Implementation Tasks

**Document Type:** Implementation plan (Phase 7)  
**Project:** OPP Darts Training Platform  
**Spec reference:** `docs/P7_MATCH_RATING_COMPETITION_DOMAIN.md`  
**Status:** Complete

---

## 1. Migrations and schema

Per domain §4.

- [x] **1.1** **Players columns:** Ensure `players.match_rating` (numeric, nullable) and `players.player_rating` (numeric, nullable) exist. If not present in P1 schema, add migration `supabase/migrations/YYYYMMDDHHMMSS_add_match_and_player_rating.sql` (or confirm already present and skip).
- [x] **1.2** **Competitions table:** Create migration for `competitions`: id (uuid PK), name (text NOT NULL), cohort_id (uuid NULLABLE FK cohorts), competition_type (text NOT NULL, e.g. 'competition_day' | 'finals_night'), scheduled_at (timestamptz NULLABLE), format_legs (int NULLABLE), format_target (int NULLABLE), created_at, updated_at. Add updated_at trigger.
- [x] **1.3** **Matches table (Option A — one row per player per match):** Create migration for `matches`: id, player_id (FK players), opponent_id (FK players), competition_id (uuid NULLABLE FK competitions), calendar_id (uuid NULLABLE FK calendar), played_at (timestamptz NOT NULL), format_best_of (int NOT NULL), legs_won, legs_lost, total_legs (int NOT NULL), three_dart_avg (numeric NULLABLE), player_3da_baseline (numeric NULLABLE), doubles_attempted (int NULLABLE), doubles_hit (int NULLABLE), doubles_pct (numeric NULLABLE), opponent_rating_at_match (numeric NULLABLE), rating_difference (numeric NULLABLE), match_rating (numeric NOT NULL), weight (numeric NOT NULL), eligible (boolean NOT NULL DEFAULT true), created_at, updated_at. CHECK: format_best_of >= 5; CHECK: player_id <> opponent_id; CHECK: total_legs = legs_won + legs_lost (or enforce in app). Add updated_at trigger.
- [x] **1.4** **RLS — competitions:** Policy: admins full access (SELECT, INSERT, UPDATE, DELETE). Policy: players can SELECT competitions where cohort_id in (player's cohorts) or cohort_id IS NULL (if product allows). Use existing admin check (e.g. current_user_is_players_admin or role).
- [x] **1.5** **RLS — matches:** Policy: players can SELECT own matches (player_id = auth player) and matches where opponent_id = auth player (for display). Players can INSERT where player_id = auth player (own match row). Admins SELECT all; admins INSERT (for recording on behalf). No UPDATE/DELETE after insert (or restrict to admin with audit). Document soft-delete if needed.
- [x] **1.6** **Optional — calendar link:** If using calendar for “next competition”: add `calendar.competition_id` (uuid NULLABLE FK competitions) and/or add `sessions.session_type` ('training' | 'competition'). Otherwise derive next competition from competitions.scheduled_at + cohort only. Document choice.
- [x] **1.7** **Apply migrations** to Supabase and verify. Update `packages/data` types (Competition, Match interfaces) in types.ts; export from index.

---

## 2. Rating parameters and constants

Per domain §9.2.

- [x] **2.1** **OMR/PR constants:** Define in code (e.g. `packages/data/src/rating-params.ts` or in match-rating module): OMR_WINDOW_SIZE = 10, OMR_TRIM_THRESHOLD = 6, FORMAT_WEIGHTS = { 5: 1.0, 7: 1.1, 9: 1.2, 11: 1.3 }, OUT_OF_BAND_WEIGHT = 0.8, PR_TR_WEIGHT = 1, PR_OMR_WEIGHT = 1 (or configurable). Document that these can later move to system_settings/DB.
- [x] **2.2** **Decade helper:** Function `getDecade(rating: number | null): number | null` (e.g. 24 → 20, 35 → 30). Use for eligibility “±1 PR decade”. Export if used by data layer.

---

## 3. Data layer — competitions

Per domain §12.1.

- [x] **3.1** **listCompetitions(client, options?):** Options: cohortId?, limit?. Return competitions ordered by scheduled_at ASC (or DESC). Export from `packages/data`.
- [x] **3.2** **getCompetitionById(client, id):** Return single competition or null. Export.
- [x] **3.3** **createCompetition(client, payload):** Payload: name, cohort_id?, competition_type, scheduled_at?, format_legs?, format_target?. Return created row. Admin only (enforce in service or RLS).
- [x] **3.4** **updateCompetition(client, id, payload):** Partial update. Admin only.
- [x] **3.5** **deleteCompetition(client, id):** Delete or soft-delete. Handle existing matches (restrict delete if matches reference, or set competition_id to null). Admin only.

---

## 4. Data layer — matches and next competition

Per domain §5, §10.3.

- [x] **4.1** **listMatchesForPlayer(client, playerId, options?):** Options: limit?, competitionId?. Return matches where player_id = playerId, ordered by played_at DESC. Include opponent display_name (join players) for UI. Export.
- [x] **4.2** **getNextCompetitionForPlayer(client, playerId):** Return next competition where cohort_id is in player’s current cohort(s) and scheduled_at >= now(), ordered by scheduled_at ASC, limit 1. Use getCurrentCohortForPlayer then list competitions for that cohort, or single query joining cohort_members. Return Competition | null. Export.
- [x] **4.3** **listMatchesForCompetition(client, competitionId):** Admin/reporting. Return matches for competition_id, ordered by played_at. Export.
- [x] **4.4** **Types:** Add Match, MatchInsertPayload, Competition, CompetitionInsertPayload (and list payloads) to types.ts; export.

---

## 5. MR calculation

Per domain §6.

- [x] **5.1** **computeMatchRating(inputs):** Pure function or module. Inputs: opponentStrength (PR/OMR at match), result (win/loss or leg share), legShare (legs_won/total_legs), threeDartAvg?, player3DABaseline?, doublesPct?. Output: MR 0–100. If spec formula not final: implement **placeholder** MR = f(legShare, result, opponentStrength) e.g. base 50 + (legShare - 0.5)*scale + winBonus + opponentAdjustment, clamped 0–100. Document “P7 placeholder” in code and in implementation doc.
- [x] **5.2** **getFormatWeight(formatBestOf):** Return 1.0, 1.1, 1.2, 1.3 for 5,7,9,11; else 1.0 or reject.
- [x] **5.3** **isOpponentInBand(playerPR, opponentPR):** True if opponent in ±1 decade of player. Use for eligibility and weight (out-of-band → weight × 0.8).

---

## 6. OMR calculation

Per domain §7, OPP_MATCH_RATING_ENGINE_SPEC.

- [x] **6.1** **getEligibleMatchesForOMR(client, playerId, limit = 10):** Query matches where player_id = playerId, eligible = true, order by played_at DESC, limit. Return list with match_rating, weight. Data layer only (no side effects).
- [x] **6.2** **computeOMR(matches):** Pure function: if n ≤ 5, weighted average of all; if n ≥ 6, sort by match_rating ascending, trim first and last, then weighted mean of remainder. OMR = (Σ (w_i × MR_i)) / (Σ w_i). Return number or null if no matches.
- [x] **6.3** **updatePlayerOMR(client, playerId):** Fetch eligible matches (getEligibleMatchesForOMR), computeOMR, update players.match_rating for playerId. Call after each new match insert (for both players). Export or use internally in recordMatch.

---

## 7. PR calculation

Per domain §8.

- [x] **7.1** **computePR(tr: number | null, omr: number | null):** Formula: if both present, PR = (TR × α + OMR × β) / (α + β); if only TR, PR = TR; if only OMR, PR = OMR (or product rule). Clamp 1–99 or 0–100 per product. Use constants from §2.
- [x] **7.2** **updatePlayerPR(client, playerId):** Read player’s training_rating and match_rating (OMR), compute PR, update players.player_rating. Call after OMR update and after TR update (or centralise “after match” and “after session” to update both OMR and PR where needed). Ensure TR progression (P5) also triggers PR update when TR changes.

---

## 8. Record match (end-to-end)

Per domain §5, §5.3.

- [x] **8.1** **recordMatch(client, payload):** Payload: playerId (current player), opponentId, formatBestOf, legsWon, legsLost, threeDartAvg?, doublesAttempted?, doublesHit?, competitionId?, calendarId?, playedAt? (default now). Validate: formatBestOf >= 5, playerId <> opponentId, legsWon + legsLost = totalLegs. Fetch opponent’s current PR (or OMR) for opponent_rating_at_match; fetch player’s current PR for rating_difference; player 3DA baseline: use null or placeholder (document). Compute MR via computeMatchRating; compute weight (format weight × 0.8 if opponent out of band); set eligible = true if format ≥ 5 and required metrics present. Insert **two** rows into matches (one for player A, one for player B) with symmetric player_id/opponent_id and each side’s legs_won/legs_lost/3DA/doubles/MR/weight/eligible. Then call updatePlayerOMR(client, playerId), updatePlayerOMR(client, opponentId), updatePlayerPR(client, playerId), updatePlayerPR(client, opponentId). Return created match row(s) or summary. Export from `packages/data`.
- [x] **8.2** **Admin record match:** Same recordMatch or overload that allows admin to pass both players’ metrics (e.g. for historical entry). Ensure RLS allows admin INSERT; call same OMR/PR update logic.

---

## 9. Dashboard updates

Per domain §11.1.

- [x] **9.1** **Next competition:** Replace “—” or “Coming soon” with real date. On HomePage load, call getNextCompetitionForPlayer(client, player.id). Display “Next competition: [formatted date]” or “—” if null. Optional: link to Play or competition detail.
- [x] **9.2** **PR, TR, MR:** Ensure all three read from player (already in P6). After P7, match_rating and player_rating will be populated by recordMatch and TR progression; ensure TR progression (P5) also calls updatePlayerPR so PR stays in sync when only TR changes.
- [x] **9.3** **Optional — MR/PR trend:** Deferred. Use listMatchesForPlayer(limit: 3) when implementing Form indicator; document in backlog if needed.

---

## 10. Play / GE — Record match flow

Per domain §11.2.

- [x] **10.1** **Entry point:** Add “Record match” (or “Competition day”) entry from Play landing or Dashboard. Option A: new route e.g. `/play/record-match`. Option B: from Play landing, show competition-type sessions (if session_type exists) and link to match capture for that session. Choose one and implement.
- [x] **10.2** **Match capture UI:** Page or modal: (1) Select opponent (dropdown or list from cohort members or listPlayers; filter out self). (2) Select format (best-of-5, 7, 9, 11). (3) Enter result: legs won, legs lost, 3DA, doubles attempted, doubles hit. (4) Optional: link to competition (dropdown of upcoming competitions for cohort) and/or calendar entry. (5) Submit → call recordMatch(client, payload). Handle loading and errors; on success, show confirmation and optionally redirect to Dashboard or Play.
- [x] **10.3** **Competition session branch (optional):** Standalone “Record match” route; no session_type on calendar. Play list shows training sessions only; Record match is a separate entry (Play + Dashboard). If calendar has competition-type sessions: when user selects that session from Play list, show match capture flow instead of routine-based GE. Otherwise “Record match” is standalone. Document choice.
- [x] **10.4** **player_calendar:** Deferred. Match can link to competition_id only; calendar_id and marking player_calendar completed left for later if needed. If match is linked to a calendar_id, optionally mark that player_calendar entry as completed for the current player (and optionally opponent). Domain says “optionally”; implement or defer and document.

---

## 11. Admin — competitions and matches

Per domain §12.

- [x] **11.1** **Admin competitions list:** New page e.g. `/admin/competitions`. List all competitions (name, type, cohort, scheduled_at, format). Links: New competition, Edit, Delete (with confirm). Data: listCompetitions (admin can list all; add option to list without cohort filter).
- [x] **11.2** **Admin create/edit competition:** Form: name, competition_type (competition_day | finals_night), cohort_id (dropdown), scheduled_at, format_legs, format_target. Create: createCompetition. Edit: updateCompetition. Validate required fields.
- [x] **11.3** **Admin view matches:** Per competition: page or section “Matches” listing listMatchesForCompetition(competitionId). Columns: player, opponent, played_at, result (legs won–lost), MR, eligible. Optional: filter by player; export CSV. No raw DB; all via data layer.
- [x] **11.4** **Admin record match (optional):** Deferred. Admin can use recordMatch with any playerId/opponentId (RLS allows); dedicated admin form (both sides’ stats) not implemented. Allow admin to submit a match on behalf of two players (same form as player-facing but with player A / player B selection and both sides’ stats). Call recordMatch or admin variant. Document if deferred.
- [x] **11.5** **Nav and route:** Add “Competitions” to admin nav; register `/admin/competitions` and `/admin/competitions/new`, `/admin/competitions/:id/edit`, `/admin/competitions/:id` (detail with matches).

---

## 12. Analyzer — match history (tier gating)

Per domain §11.1, P6 tier gating.

- [x] **12.1** **Match history section (Gold/Platinum):** On AnalyzerPage, if tier is Gold or Platinum, add section “Match history”: list listMatchesForPlayer(client, player.id, { limit: 20 }). Columns: date, opponent, format, result (e.g. 3–2), MR. Reuse getEffectiveTier / isPremiumTier from P6. Free tier: do not show match history (or show “Available in Gold/Platinum”).

---

## 13. TR progression and PR sync

Per domain §8, P5.

- [x] **13.1** **PR update on TR change:** Wherever P5 updates players.training_rating (after session completion), also call updatePlayerPR(client, playerId) so PR reflects new TR. Locate in progression module or session complete flow; add single call. Verify no duplicate updates.

---

## 14. Unit tests

Per domain §14; same style as P6.

- [x] **14.1** **Competitions CRUD:** Mock client. createCompetition, getCompetitionById, listCompetitions, updateCompetition, deleteCompetition (or restrict delete when matches exist).
- [x] **14.2** **getNextCompetitionForPlayer:** Mock client. Returns next competition for player’s cohort by scheduled_at; null when none.
- [x] **14.3** **computeMatchRating (placeholder):** Pure function. Given legShare, result, opponentStrength, returns value in 0–100; test edge cases (win/loss, equal legs).
- [x] **14.4** **computeOMR:** Pure function. n ≤ 5 → weighted average; n ≥ 6 → trim highest and lowest, then weighted mean. Test with 1, 5, 6, 10 matches.
- [x] **14.5** **computePR:** Pure function. TR only, OMR only, both; correct weighting and clamp.
- [x] **14.6** **recordMatch (integration-style):** Mock client. Insert two rows; OMR and PR update called (or assert players.match_rating/player_rating in mock responses). Eligibility and weight set correctly.
- [x] **14.7** **listMatchesForPlayer:** Mock client. Returns matches for player, ordered by played_at DESC; includes opponent info if required by type.

---

## 15. Documentation and cleanup

- [x] **15.1** Update README or docs: mention P7 Match Rating, competitions, record match flow, next competition on dashboard, admin competitions CRUD. PR/OMR now populated.
- [x] **15.2** Ensure Dashboard, Play (record match), and Admin competitions use only `packages/data` and auth context (no direct Supabase in UI for data). Verified: all UI uses `useSupabase()` and passes client to `@opp/data` functions; no direct Supabase table access in apps/web.
- [x] **15.3** Update **PROJECT_STATUS_TRACKER.md**: when P7 complete, mark **P7 — Match Rating and competitions** checkbox and add “P7 delivered” note in Completed section (match capture, MR/OMR/PR, competitions, admin, dashboard next competition).
- [x] **15.4** Document MR placeholder: in code (`packages/data/src/match-rating.ts` — computeMatchRating JSDoc and "P7 PLACEHOLDER" comment) and in this doc: MR formula may be replaced when OPP_MATCH_RATING_ENGINE_SPEC is final.

---

## Progress summary

| Section | Tasks | Done |
|---------|-------|------|
| 1. Migrations and schema | 7 | 7 |
| 2. Rating parameters and constants | 2 | 2 |
| 3. Data layer — competitions | 5 | 5 |
| 4. Data layer — matches and next competition | 4 | 4 |
| 5. MR calculation | 3 | 3 |
| 6. OMR calculation | 3 | 3 |
| 7. PR calculation | 2 | 2 |
| 8. Record match (end-to-end) | 2 | 2 |
| 9. Dashboard updates | 3 | 3 |
| 10. Play / GE — Record match flow | 4 | 4 |
| 11. Admin — competitions and matches | 5 | 5 |
| 12. Analyzer — match history | 1 | 1 |
| 13. TR progression and PR sync | 1 | 1 |
| 14. Unit tests | 7 | 7 |
| 15. Documentation and cleanup | 4 | 4 |

**Execution rule:** One task (or sub-task) at a time; mark checkbox when done; run relevant tests before moving on.
