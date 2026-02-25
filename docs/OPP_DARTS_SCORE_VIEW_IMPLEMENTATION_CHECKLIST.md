# Darts Score View (Target vs Actual) — Implementation Checklist

Implementation checklist for the behaviour described in **OPP_DARTS_SCORE_VIEW_DOMAIN.md**: (1) **Atomic breakdown** — a view of the player’s individual darts performance; (2) **Target vs Actual** — per-segment success % (target = aimed segment, actual = hit segment); (3) **UI** — surface this data on AnalyzerPage; (4) **Permissions** — platinum members only; non-platinum see title and a message that this is a platinum feature.

**Prerequisites:** Existing `dart_scores` table (target, actual, result, player_id, training_id, …). Existing AnalyzerPage (session history, trends, match history). Tier/platinum: `getEffectiveTier(player) === 'platinum'`. Existing `listDartScoresByTrainingId`, `getDartScoresForSessionRun` for per-run darts.

---

## 1. Scope and existing data model

- [ ] **Requirement (domain)** — “Every single player throw is stored in the darts_scores table … We need a view that gives the player an atomic breakdown of their performance.” Table in codebase is `dart_scores` (not darts_scores); confirm domain doc naming vs schema.
- [ ] **Existing schema** — `dart_scores` has: `id`, `player_id`, `training_id`, `routine_id`, `routine_no`, `step_no`, `dart_no`, `attempt_index`, `target`, `actual`, `result` ('H'|'M'), `created_at`. No schema change required for “view” of raw darts; optional summary table in §2.
- [ ] **Existing data layer** — `listDartScoresByTrainingId(client, trainingId)`, `getDartScoresForSessionRun(client, trainingId)` return `DartScore[]`. Session history gives run ids; per-run darts already viewable (e.g. AnalyzerDartsPage). Confirm whether “atomic breakdown” is satisfied by existing per-session darts view or requires an additional cross-session “all my darts by segment” view (covered in §2–3).

---

## 2. Target vs Actual — definition and aggregation

- [ ] **Requirement (domain)** — “Every throw … is aimed at a specific segment (Target), every throw will hit an absolute segment (Actual). For each segment, it is possible to calculate a success %. We need a view that allows players to see this data.”
- [ ] **Segment definition** — Segments are canonical codes: S1–S20, D1–D20, T1–T20, 25, Bull, M (see `ALL_SEGMENT_CODES` / `normaliseSegment` in app). Use normalised `target` and `actual` for grouping.
- [ ] **Success % per segment** — For a given **target segment** (e.g. S20): success % = (count where result = 'H' or actual = target) / (count where target = that segment). Optionally also show “when aiming at X, hit Y” distribution (target → actual breakdown). Decide product definition: “per target segment” success rate vs “per (target, actual)” heatmap; document in this checklist.
- [ ] **Scope of data** — Decide: (a) all-time for the player, (b) filterable by time window (e.g. last 30/90 days, all time) to align with existing Analyzer trends, (c) filterable by run type (scheduled only vs include free training). Document decision.
- [ ] **Summary table vs on-the-fly** — Domain: “consider whether it makes sense to create summary tables, or calculate summarised information on-the-fly.”
  - **Option A (on-the-fly):** Query `dart_scores` for the player (and optional date range / run_type), aggregate in application or via a single SQL query (GROUP BY normalised target, optionally actual). No new tables; may be slower for very large datasets.
  - **Option B (summary table):** New table e.g. `player_segment_stats` (player_id, segment_target, throws_count, hits_count, window_days or period_type, updated_at) maintained by trigger or periodic job. Faster reads; more complexity and staleness. Recommend **Option A** for initial implementation unless analytics load justifies Option B; document in checklist.

---

## 3. Data layer — segment-level stats (target vs actual)

- [ ] **Requirement (domain)** — “For each segment, it is possible to calculate a success %. We need a view that allows players to see this data.”
- [ ] **New function: getSegmentStatsForPlayer** — `getSegmentStatsForPlayer(client, playerId, options?: { windowDays?: number | null }): Promise<SegmentStat[]>`.
  - **SegmentStat** type: e.g. `{ segment: string; segmentLabel: string; throws: number; hits: number; successPct: number }` where segment is normalised target (S20, D16, …), throws = count of rows with that target, hits = count where result = 'H' (or actual = target after normalisation).
  - Query: from `dart_scores` WHERE player_id = ? AND (optional: created_at >= ? for window). Normalise target in DB if possible (e.g. trim, uppercase) or in app from raw target. GROUP BY normalised target; compute throws, hits, successPct. Order by segment (e.g. S1…S20, D1…D20, T1…T20, 25, Bull, M) or by throws DESC.
- [ ] **Normalisation in DB** — If DB stores canonical codes (S20, D16), no normalisation needed. If free text might exist, either normalise in application after fetch or add a DB expression/function. Document choice.
- [ ] **Filter by run_type** — If excluding free training from stats: join `session_runs` on training_id and filter `run_type = 'scheduled'` (or calendar_id IS NOT NULL). Include in getSegmentStatsForPlayer options (e.g. includeFreeTraining?: boolean; default false for “session only” stats).
- [ ] **Export types** — Export `SegmentStat` (and optional `TargetActualBreakdown` if showing target→actual matrix) from data package. Add to packages/data index.

---

## 4. Data layer — optional target→actual breakdown

- [ ] **Requirement (domain)** — “Consider how players might want to view.” Optional: show “when aiming at X, I hit Y” (e.g. S20 → S20 80%, S20 → M 15%, S20 → S5 5%).
- [ ] **Optional function: getTargetActualBreakdownForPlayer** — `getTargetActualBreakdownForPlayer(client, playerId, options?: { windowDays?: number | null }): Promise<TargetActualRow[]>`.
  - **TargetActualRow**: e.g. `{ targetSegment: string; actualSegment: string; count: number; pctOfTarget?: number }`. Group by (normalised target, normalised actual); count; pctOfTarget = count / total for that target. Used for heatmap or table “Target → Actual”.
- [ ] **Scope** — Implement if product wants “where did my darts go when I aimed at X”; otherwise defer and only implement per-segment success % (§3).

---

## 5. AnalyzerPage UI — placement and structure

- [ ] **Requirement (domain)** — “This data should be added to the AnalyzerPage.”
- [ ] **Section title** — Add a section e.g. “Target vs Actual” or “Segment accuracy” (or “Darts score view”) to AnalyzerPage. Place after Session history and before or after Trends (product preference).
- [ ] **Platinum gate** — If `getEffectiveTier(player) !== 'platinum'`, render section with title and message: “This is a platinum member feature.” Do not fetch segment stats for non-platinum users (§6).
- [ ] **When platinum** — Fetch segment stats (and optional target–actual breakdown) on load. Show time-window selector if scope includes window (e.g. 30 / 90 days / All time) to align with existing trend duration.

---

## 6. AnalyzerPage UI — segment success % display

- [ ] **Requirement (domain)** — “A view that allows players to see this data … consider how players might want to view.”
- [ ] **Table or list** — Display segment stats in a table: columns e.g. Segment (label, e.g. “Single 20”), Throws, Hits, Success %. Sort by segment order or by Throws (most thrown first). Use existing table styles from AnalyzerPage for consistency.
- [ ] **Empty state** — If no darts in range, show “No dart data in this period” or similar.
- [ ] **Loading and errors** — Show loading state while fetching; on error show error message and retry if appropriate (reuse ErrorMessage pattern used elsewhere on AnalyzerPage).
- [ ] **Segment label** — Use `segmentCodeToSpoken(segment)` from app constants so segments display as “Single 20”, “Double 16”, “Treble 19”, “25”, “Bull”, “Miss”.

---

## 7. AnalyzerPage UI — optional target→actual view

- [ ] **Requirement (domain)** — “Consider how players might want to view.”
- [ ] **Optional: heatmap or matrix** — If implementing getTargetActualBreakdownForPlayer (§4), add a sub-section or tab: “When aiming at X, you hit Y” — matrix (target rows × actual columns) or list of target with breakdown (e.g. “S20: S20 80%, M 15%, S5 5%”). Defer if out of scope for first release.

---

## 8. Permissions and access control

- [ ] **Requirement (domain)** — “This feature is for platinum members only. If a user is not a platinum member, display the title and display a message saying this is a platinum member feature.”
- [ ] **RLS** — No change required: `dart_scores` already has SELECT for own rows (`dart_scores_select_own`). Segment stats query only reads that player’s rows. Ensure new data-layer functions are called with the current player’s id (from context).
- [ ] **UI gate** — On AnalyzerPage, before fetching segment stats: if tier !== 'platinum', do not call getSegmentStatsForPlayer. Render section with heading and body text: e.g. “Target vs Actual — This is a platinum member feature.” Optionally add CTA to upgrade if product has one.

---

## 9. Copy and errors

- [ ] **Section title** — Final copy: “Target vs Actual” or “Segment accuracy” (decide with product).
- [ ] **Platinum message** — “This is a platinum member feature.” (or “This feature is for platinum members only.”)
- [ ] **Empty state** — “No dart data for this period.” when throws = 0 for selected window.
- [ ] **Errors** — Handle “failed to load segment stats” (e.g. network/RLS); show error message and retry. Do not expose raw DB errors to user.

---

## 10. Summary table

| Requirement (domain) | Current state | Action |
|----------------------|---------------|--------|
| View giving atomic breakdown of performance | Per-run darts available (AnalyzerDartsPage, PlaySessionDartsPage) | §1–2: Clarify “atomic breakdown”; add cross-session segment view on AnalyzerPage |
| Target vs Actual; success % per segment | Not exposed | §2–3: Define aggregation (per target segment); implement getSegmentStatsForPlayer; optional summary table vs on-the-fly |
| View that allows players to see this data | N/A | §5–6: New section on AnalyzerPage; table of segment, throws, hits, success % |
| Consider summary tables vs on-the-fly | N/A | §2: Document decision (recommend on-the-fly first) |
| Data added to AnalyzerPage | AnalyzerPage has history, trends, match history | §5–6: Add Target vs Actual section; platinum-only content |
| Platinum only; non-platinum see title + message | Tier used elsewhere (e.g. trends) | §6, §8: Gate section; show “platinum member feature” message when not platinum |

---

## 11. Implementation order (suggested)

1. **§1** — Confirm scope: “atomic breakdown” = existing per-run darts + new segment-level view. No schema change.
2. **§2** — Decide: success % per target segment; time window (e.g. 30/90/all); on-the-fly vs summary table (recommend on-the-fly). Document.
3. **§3** — Data layer: `SegmentStat` type; `getSegmentStatsForPlayer(client, playerId, options?)`; filter by run_type if needed; export from data package.
4. **§4** — (Optional) Data layer: `getTargetActualBreakdownForPlayer` and TargetActualRow if product wants target→actual matrix.
5. **§5** — AnalyzerPage: add “Target vs Actual” section; platinum gate (show message when not platinum).
6. **§6** — AnalyzerPage: when platinum, fetch and display segment stats table (segment label, throws, hits, success %); time-window selector if applicable; loading and empty states.
7. **§7** — (Optional) Target→actual matrix or breakdown UI if implemented in §4.
8. **§8** — Confirm RLS and UI gate; no new policies if query uses own player_id.
9. **§9** — Final copy and error handling.

---

## 12. Out of scope / follow-up

- **Admin reporting** — Domain does not require admin view of player segment stats; can be added later if needed.
- **Export / download** — No requirement for CSV/export of segment stats; can be added later.
- **Drill-down to darts** — Existing “View” per session run already shows darts; optional “show all darts for this segment” from the new section can be a follow-up.
- **Summary table (materialized)** — If on-the-fly aggregation becomes slow at scale, add a materialized view or summary table and refresh strategy in a later phase.
