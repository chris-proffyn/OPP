# P8 — Polish and Scale: Implementation Tasks

**Document Type:** Implementation plan (Phase 8)  
**Project:** OPP Darts Training Platform  
**Spec reference:** `docs/P8_POLISH_SCALE_DOMAIN.md`  
**Status:** Not started

---

## 1. Voice score input (GE)

Per domain §4.

- [ ] **1.1** **Voice recognition integration:** In GE routine execution (e.g. PlaySessionPage or segment/routine step component), integrate browser Web Speech API (SpeechRecognition) for score input. Require HTTPS; request microphone permission when user opts in. Document supported browsers (e.g. Chrome, Edge, Safari) and fallback message: “Voice not supported in this browser; use manual input.”
- [ ] **1.2** **Utterance mapping:** Map recognised text to outcome: e.g. “hit” / “hit it” → hit; “miss” → miss; optionally segment codes (“S20”, “T5”) if product supports. Normalise and pass same payload to existing dart-record logic (same dart_scores insert as manual). One outcome per dart; voice and manual mutually exclusive for that throw.
- [ ] **1.3** **Discovery and fallback:** Always show manual controls (tap hit/miss or segment). Add visible hint: e.g. “Say ‘hit’ or ‘miss’, or tap below.” Manual remains primary; voice failure or unavailability must not block completion.
- [ ] **1.4** **Feedback:** On voice recognition result: show visual and/or brief auditory confirmation (e.g. “Hit recorded”). On timeout or “no match”: show “I didn’t catch that” with option to retry or use manual. No silent failure.
- [ ] **1.5** **Accessibility (NFR-6):** Ensure voice is additive; users who cannot or prefer not to use voice can complete sessions with manual only. Tap targets and contrast unchanged. Document in implementation or README.
- [ ] **1.6** **Optional — input_method:** If product wants analytics on input method, add `dart_scores.input_method` (text, nullable, e.g. 'manual' | 'voice') in a migration and set on insert. Otherwise omit.

---

## 2. GO notifications (upcoming session)

Per domain §5.

- [ ] **2.1** **Choose option:** **Option A (recommended):** No new table; “Up next” derived from getNextSessionForPlayer (or get next N from calendar/player_calendar). **Option B:** Add `player_notifications` table and a job that populates it; UI reads from table. Document choice in implementation doc and code comments.
- [ ] **2.2** **In-app “Up next” content:** Display at least: session name (or day/session no), date/time. Optional: cohort name, schedule name. Source: existing getNextSessionForPlayer or list next planned calendar entries for player. Format example: “Up next: Day 2 - Singles on 1 Mar 2026, 20:00”.
- [ ] **2.3** **Placement:** Show “Up next” on Dashboard (e.g. above or beside “Next training session”) and/or add a “Notifications” or “Due” nav item that lists next session(s). Link to start session (e.g. to Play with that calendarId).
- [ ] **2.4** **Refresh:** On load of Dashboard (or Notifications page), fetch next session(s) and render. No real-time push required for P8 unless Option B and push are in scope.
- [ ] **2.5** **GO realisation:** Document in implementation doc: “GO = app-side derivation from getNextSessionForPlayer” (Option A) or “GO = scheduled job that writes player_notifications” (Option B). If Option B: add migration for player_notifications; implement job (e.g. Edge Function cron) and in-app list that reads from table.
- [ ] **2.6** **Optional — email/push:** If product wants email or push, add placeholder (e.g. “Notification delivery TBD”) and document; or implement one channel (e.g. in-app only) and document that email/push are future.

---

## 3. dart_scores indexing and archiving

Per domain §7.

- [ ] **3.1** **Indexes migration:** Create migration `supabase/migrations/YYYYMMDDHHMMSS_add_dart_scores_indexes.sql`: (1) `CREATE INDEX idx_dart_scores_training_id ON dart_scores(training_id);` (2) `CREATE INDEX idx_dart_scores_player_id ON dart_scores(player_id);` (3) If time-bounded queries by player are needed: `CREATE INDEX idx_dart_scores_player_id_created_at ON dart_scores(player_id, created_at);`. Apply and verify; check insert performance (no significant regression).
- [ ] **3.2** **Document index strategy:** In migration file or docs/P8_POLISH_SCALE_DOMAIN.md (or implementation doc), document query patterns supported (by training_id for analyzer; by player_id for “my darts”; by player_id + created_at for time range). Note that RLS may use these indexes.
- [ ] **3.3** **Archiving/partitioning decision:** Document product decision: **Index only** (defer archiving) or **implement archiving** (e.g. dart_scores_archive table + job to move rows older than N months) or **partitioning** (e.g. dart_scores partitioned by month). If “index only”, add a short note: “Archiving can be added when row count or query SLAs justify it.”
- [ ] **3.4** **Optional — archiving implementation:** If implementing: add migration for dart_scores_archive (same schema); document job or script that moves rows; document policy (e.g. move rows older than 12 months). Hot path (GE, analyzer recent) only hits dart_scores. Defer if product chooses index only.

---

## 4. Data layer — cohort and competition reports

Per domain §6.

- [ ] **4.1** **getCohortPerformanceReport(client, cohortId, options?):** Return structured data: list of players in cohort (from cohort_members) with per-player: display_name, player_id, sessions_planned (count of player_calendar for that cohort), sessions_completed (count where status = completed), completion_pct (completed/planned), average_session_score (from session_runs.session_score for completed runs), current training_rating. Options: date range filter if needed. No raw SQL in UI; all via packages/data. Export.
- [ ] **4.2** **getCompetitionReport(client, competitionId):** Return competition details plus list of matches (player, opponent, played_at, result e.g. legs_won–legs_lost, match_rating, eligible). Optional: summary (match count per player, wins/losses). Use existing listMatchesForCompetition and competition fetch; aggregate in data layer. Export.
- [ ] **4.3** **Types:** Add CohortPerformanceReportRow, CohortPerformanceReport, CompetitionReport (or equivalent) to types.ts; export.

---

## 5. Data layer — dart-level data for analyzer (Gold/Platinum)

Per domain §8.1.

- [ ] **5.1** **getDartScoresForSessionRun(client, trainingId):** Return dart_scores for given training_id (session_run), ordered by routine_no/dart_no or equivalent. RLS must restrict to own data (player_id = auth player). Used by Analyzer “View darts” for Gold/Platinum. Export from packages/data. Consider tier: either enforce in RLS only, or check tier in service and return 403/empty for Free (document choice).
- [ ] **5.2** **Tier gating:** Ensure dart-level data is not exposed to Free tier in UI. Data layer can return data and UI gates (getEffectiveTier / isPremiumTier), or data layer checks tier and returns empty/error for Free. Document; recommend UI gate + RLS so API is consistent.

---

## 6. Analyzer — Gold tier (full session history with darts, 90/all-time trends)

Per domain §8.1, §8.3.

- [ ] **6.1** **Session history — “View darts” (Gold/Platinum):** On AnalyzerPage, for each session history row, add “View darts” or expandable section (only when tier is Gold or Platinum). On expand or click: call getDartScoresForSessionRun(client, sessionRunId). Display list of darts (e.g. target, actual, hit/miss) grouped by routine if helpful. Free tier: do not show “View darts” (hide or disable with tooltip “Available in Gold/Platinum”).
- [ ] **6.2** **Session trends — 90 days and all-time:** Extend getTrendForPlayer (or add options) to support windowDays: 90 and “all time” (e.g. windowDays: null or very large number). In Analyzer UI, add trend selectors or sections: “Session score — last 90 days”, “Session score — all time”; “Singles — last 90 days”, “Singles — all time”. Gate 90-day and all-time to Gold and Platinum; Free keeps last-30 only.
- [ ] **6.3** **Match history (Gold/Platinum):** If not already implemented in P7 (§12.1), ensure Analyzer shows match history (listMatchesForPlayer) for Gold and Platinum. Free: hide or show “Available in Gold/Platinum”. If P7 already added it, verify tier gating and styling.

---

## 7. Analyzer — Platinum tier (AI placeholder)

Per domain §8.2.

- [ ] **7.1** **PR, TR, MR display:** Ensure Platinum (and Gold) see PR, TR, MR in Analyzer if not already on Dashboard. Add or confirm in Analyzer header/summary for premium tiers.
- [ ] **7.2** **AI insights placeholder:** For Platinum only, add section “AI insights” with content “Coming soon” or “AI-powered analysis will appear here.” No integration with real AI model unless product explicitly scopes it. Use getEffectiveTier(player) === 'platinum' to show.

---

## 8. Admin — cohort and competition reports UI

Per domain §6, FR-12.3.

- [ ] **8.1** **Cohort report page:** New admin page e.g. `/admin/cohorts/:id/report` or “Cohort performance” from cohort detail. Fetch getCohortPerformanceReport(client, cohortId). Render table: player, sessions completed, completion %, average session score, current TR. Optional: filter by date range, export CSV. No raw DB; all via data layer.
- [ ] **8.2** **Competition report page:** New admin page e.g. `/admin/competitions/:id/report` or “Matches” tab on competition detail. Fetch getCompetitionReport(client, competitionId). Render table of matches (player, opponent, date, result, MR). Optional: summary by player, export CSV. No raw DB.
- [ ] **8.3** **Nav and routes:** Add “Cohort report” / “Performance” link from cohort list or cohort detail; add “Competition report” / “Matches” from competition detail if not already present. Ensure admin layout and breadcrumbs are consistent.

---

## 9. Performance review and tuning

Per domain §9.1, NFR-9.

- [ ] **9.1** **Dashboard load:** Ensure dashboard data (player, cohort, next session, next competition, recent scores) is fetched efficiently (single batch or minimal round-trips). Avoid N+1. Target &lt; 3s on typical connection. Add or verify indexes on calendar, player_calendar, session_runs as needed.
- [ ] **9.2** **Play list (available sessions):** Ensure getAllSessionsForPlayer (or equivalent) and related queries are indexed and bounded. Target &lt; 3s.
- [ ] **9.3** **Dart submission:** GE dart insert and any routine/session score update should feel immediate. Use optimistic UI if appropriate; avoid unnecessary delay. Do not batch single-dart submissions in a way that adds noticeable lag.
- [ ] **9.4** **Analyzer queries:** getSessionHistoryForPlayer and getTrendForPlayer should use limits and windows; verify indexes on session_runs, player_routine_scores support them. Monitor slow queries in dev; document any known heavy queries.
- [ ] **9.5** **Admin reports:** Cohort and competition report pages should load in reasonable time; paginate or limit result sets if large (e.g. cohort with many members). Use data layer aggregates only.

---

## 10. UX and accessibility polish

Per domain §9.2, NFR-6, NFR-8.

- [ ] **10.1** **Mobile-first and tap targets:** Audit GE, Dashboard, Analyzer, and key Admin flows for small screens and portrait. Ensure tap targets ≥ 44px; readable font sizes and contrast. Fix any regressions.
- [ ] **10.2** **Error handling:** No silent failures; user-facing errors clear and actionable (NFR-8). Review error boundaries and catch blocks; ensure messages are helpful (e.g. “Session could not be loaded. Try again.” with retry). No stack traces or secrets in UI.
- [ ] **10.3** **Loading states:** Ensure async operations (dashboard load, session list, analyzer, report pages) show skeleton or spinner. Avoid blank screen during load.
- [ ] **10.4** **Consistency:** Navigation labels, button text, and terminology consistent across Play, Dashboard, Analyzer, Admin. Align any P8-added copy (e.g. “Up next”, “View darts”, “AI insights”) with existing patterns.

---

## 11. Unit tests

- [ ] **11.1** **getCohortPerformanceReport:** Mock client. Returns list of players with completion counts, average session score, TR; empty or partial when no data.
- [ ] **11.2** **getCompetitionReport:** Mock client. Returns competition plus matches list; shape correct.
- [ ] **11.3** **getDartScoresForSessionRun:** Mock client. Returns darts for training_id; empty when none or not allowed.
- [ ] **11.4** **Voice (optional):** If utterance mapping is in a pure function (e.g. mapVoiceToOutcome(text): hit | miss | null), add unit tests for “hit”, “miss”, unknown input. If logic is inline in component, document and skip or add minimal test.
- [ ] **11.5** **getTrendForPlayer 90 / all-time:** If getTrendForPlayer is extended with larger windowDays, add or extend tests for 90-day and all-time behaviour (mock returns expected aggregate).

---

## 12. Documentation and cleanup

- [ ] **12.1** **Voice:** Document in README or docs: voice input is supported in GE (hit/miss); Web Speech API; HTTPS required; supported browsers and fallback. Document that manual is primary.
- [ ] **12.2** **Notifications:** Document “Up next” (Option A or B); where it appears (Dashboard, Notifications page); that GO is app-side derivation or job; any placeholder for email/push.
- [ ] **12.3** **dart_scores:** Document index strategy and archiving/partitioning decision (index only vs archive vs partition) in implementation doc or migration comment.
- [ ] **12.4** **Tier features:** Document Gold (darts, 90/all-time trends, match history) and Platinum (+ AI placeholder) in README or Analyzer section of docs.
- [ ] **12.5** Update **PROJECT_STATUS_TRACKER.md**: when P8 complete, mark **P8 — Polish and scale** checkbox and add “P8 delivered” note in Completed section (voice input, GO notifications, admin reports, indexing, Gold/Platinum analyzer, performance and UX polish).
- [ ] **12.6** Ensure all new UI (voice, notifications, reports, analyzer darts/trends) uses only `packages/data` and auth context; no direct Supabase in UI for data.

---

## Progress summary

| Section | Tasks | Done |
|---------|-------|------|
| 1. Voice score input (GE) | 6 | 0 |
| 2. GO notifications | 6 | 0 |
| 3. dart_scores indexing and archiving | 4 | 0 |
| 4. Data layer — cohort and competition reports | 3 | 0 |
| 5. Data layer — dart-level data | 2 | 0 |
| 6. Analyzer — Gold tier | 3 | 0 |
| 7. Analyzer — Platinum tier | 2 | 0 |
| 8. Admin — reports UI | 3 | 0 |
| 9. Performance review and tuning | 5 | 0 |
| 10. UX and accessibility polish | 4 | 0 |
| 11. Unit tests | 5 | 0 |
| 12. Documentation and cleanup | 6 | 0 |

**Execution rule:** One task (or sub-task) at a time; mark checkbox when done; run relevant tests before moving on.
