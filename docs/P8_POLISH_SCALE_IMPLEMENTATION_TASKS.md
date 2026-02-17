# P8 — Polish and Scale: Implementation Tasks

**Document Type:** Implementation plan (Phase 8)  
**Project:** OPP Darts Training Platform  
**Spec reference:** `docs/P8_POLISH_SCALE_DOMAIN.md`  
**Status:** Complete

---

## 1. Voice score input (GE)

Per domain §4.

- [x] **1.1** **Voice recognition integration:** In GE routine execution (e.g. PlaySessionPage or segment/routine step component), integrate browser Web Speech API (SpeechRecognition) for score input. Require HTTPS; request microphone permission when user opts in. Document supported browsers (e.g. Chrome, Edge, Safari) and fallback message: “Voice not supported in this browser; use manual input.”
- [x] **1.2** **Utterance mapping:** Map recognised text to outcome: e.g. “hit” / “hit it” → hit; “miss” → miss; optionally segment codes (“S20”, “T5”) if product supports. Normalise and pass same payload to existing dart-record logic (same dart_scores insert as manual). One outcome per dart; voice and manual mutually exclusive for that throw.
- [x] **1.3** **Discovery and fallback:** Always show manual controls (tap hit/miss or segment). Add visible hint: e.g. “Say ‘hit’ or ‘miss’, or tap below.” Manual remains primary; voice failure or unavailability must not block completion.
- [x] **1.4** **Feedback:** On voice recognition result: show visual and/or brief auditory confirmation (e.g. “Hit recorded”). On timeout or “no match”: show “I didn’t catch that” with option to retry or use manual. No silent failure.
- [x] **1.5** **Accessibility (NFR-6):** Ensure voice is additive; users who cannot or prefer not to use voice can complete sessions with manual only. Tap targets and contrast unchanged. Document in implementation or README.
- [ ] **1.6** **Optional — input_method:** If product wants analytics on input method, add `dart_scores.input_method` (text, nullable, e.g. 'manual' | 'voice') in a migration and set on insert. Otherwise omit.

---

## 2. GO notifications (upcoming session)

Per domain §5.

- [x] **2.1** **Choose option:** **Option A (recommended):** No new table; “Up next” derived from getNextSessionForPlayer (or get next N from calendar/player_calendar). **Option B:** Add `player_notifications` table and a job that populates it; UI reads from table. Document choice in implementation doc and code comments.
- [x] **2.2** **In-app “Up next” content:** Display at least: session name (or day/session no), date/time. Optional: cohort name, schedule name. Source: existing getNextSessionForPlayer or list next planned calendar entries for player. Format example: “Up next: Day 2 - Singles on 1 Mar 2026, 20:00”.
- [x] **2.3** **Placement:** Show “Up next” on Dashboard (e.g. above or beside “Next training session”) and/or add a “Notifications” or “Due” nav item that lists next session(s). Link to start session (e.g. to Play with that calendarId).
- [x] **2.4** **Refresh:** On load of Dashboard (or Notifications page), fetch next session(s) and render. No real-time push required for P8 unless Option B and push are in scope.
- [x] **2.5** **GO realisation:** Document in implementation doc: “GO = app-side derivation from getNextSessionForPlayer” (Option A) or “GO = scheduled job that writes player_notifications” (Option B). If Option B: add migration for player_notifications; implement job (e.g. Edge Function cron) and in-app list that reads from table.
- [x] **2.6** **Optional — email/push:** If product wants email or push, add placeholder (e.g. “Notification delivery TBD”) and document; or implement one channel (e.g. in-app only) and document that email/push are future.

---

## 3. dart_scores indexing and archiving

Per domain §7.

- [x] **3.1** **Indexes migration:** Create migration `supabase/migrations/YYYYMMDDHHMMSS_add_dart_scores_indexes.sql`: (1) `CREATE INDEX idx_dart_scores_training_id ON dart_scores(training_id);` (2) `CREATE INDEX idx_dart_scores_player_id ON dart_scores(player_id);` (3) If time-bounded queries by player are needed: `CREATE INDEX idx_dart_scores_player_id_created_at ON dart_scores(player_id, created_at);`. Apply and verify; check insert performance (no significant regression).
- [x] **3.2** **Document index strategy:** In migration file or docs/P8_POLISH_SCALE_DOMAIN.md (or implementation doc), document query patterns supported (by training_id for analyzer; by player_id for “my darts”; by player_id + created_at for time range). Note that RLS may use these indexes.
- [x] **3.3** **Archiving/partitioning decision:** Document product decision: **Index only** (defer archiving) or **implement archiving** (e.g. dart_scores_archive table + job to move rows older than N months) or **partitioning** (e.g. dart_scores partitioned by month). If “index only”, add a short note: “Archiving can be added when row count or query SLAs justify it.”
- [ ] **3.4** **Optional — archiving implementation:** If implementing: add migration for dart_scores_archive (same schema); document job or script that moves rows; document policy (e.g. move rows older than 12 months). Hot path (GE, analyzer recent) only hits dart_scores. Defer if product chooses index only.

---

## 4. Data layer — cohort and competition reports

Per domain §6.

- [x] **4.1** **getCohortPerformanceReport(client, cohortId, options?):** Return structured data: list of players in cohort (from cohort_members) with per-player: display_name, player_id, sessions_planned (count of player_calendar for that cohort), sessions_completed (count where status = completed), completion_pct (completed/planned), average_session_score (from session_runs.session_score for completed runs), current training_rating. Options: date range filter if needed. No raw SQL in UI; all via packages/data. Export.
- [x] **4.2** **getCompetitionReport(client, competitionId):** Return competition details plus list of matches (player, opponent, played_at, result e.g. legs_won–legs_lost, match_rating, eligible). Optional: summary (match count per player, wins/losses). Use existing listMatchesForCompetition and competition fetch; aggregate in data layer. Export.
- [x] **4.3** **Types:** Add CohortPerformanceReportRow, CohortPerformanceReport, CompetitionReport (or equivalent) to types.ts; export.

---

## 5. Data layer — dart-level data for analyzer (Gold/Platinum)

Per domain §8.1.

- [x] **5.1** **getDartScoresForSessionRun(client, trainingId):** Return dart_scores for given training_id (session_run), ordered by routine_no/dart_no or equivalent. RLS must restrict to own data (player_id = auth player). Used by Analyzer “View darts” for Gold/Platinum. Export from packages/data. Consider tier: either enforce in RLS only, or check tier in service and return 403/empty for Free (document choice).
- [x] **5.2** **Tier gating:** Ensure dart-level data is not exposed to Free tier in UI. Data layer can return data and UI gates (getEffectiveTier / isPremiumTier), or data layer checks tier and returns empty/error for Free. Document; recommend UI gate + RLS so API is consistent.

---

## 6. Analyzer — Gold tier (full session history with darts, 90/all-time trends)

Per domain §8.1, §8.3.

- [x] **6.1** **Session history — “View darts” (Gold/Platinum):** On AnalyzerPage, for each session history row, add “View darts” or expandable section (only when tier is Gold or Platinum). On expand or click: call getDartScoresForSessionRun(client, sessionRunId). Display list of darts (e.g. target, actual, hit/miss) grouped by routine if helpful. Free tier: do not show “View darts” (hide or disable with tooltip “Available in Gold/Platinum”).
- [x] **6.2** **Session trends — 90 days and all-time:** Extend getTrendForPlayer (or add options) to support windowDays: 90 and “all time” (e.g. windowDays: null or very large number). In Analyzer UI, add trend selectors or sections: “Session score — last 90 days”, “Session score — all time”; “Singles — last 90 days”, “Singles — all time”. Gate 90-day and all-time to Gold and Platinum; Free keeps last-30 only.
- [x] **6.3** **Match history (Gold/Platinum):** If not already implemented in P7 (§12.1), ensure Analyzer shows match history (listMatchesForPlayer) for Gold and Platinum. Free: hide or show “Available in Gold/Platinum”. If P7 already added it, verify tier gating and styling.

---

## 7. Analyzer — Platinum tier (AI placeholder)

Per domain §8.2.

- [x] **7.1** **PR, TR, MR display:** Ensure Platinum (and Gold) see PR, TR, MR in Analyzer if not already on Dashboard. Add or confirm in Analyzer header/summary for premium tiers.
- [x] **7.2** **AI insights placeholder:** For Platinum only, add section “AI insights” with content “Coming soon” or “AI-powered analysis will appear here.” No integration with real AI model unless product explicitly scopes it. Use getEffectiveTier(player) === 'platinum' to show.

---

## 8. Admin — cohort and competition reports UI

Per domain §6, FR-12.3.

- [x] **8.1** **Cohort report page:** New admin page e.g. `/admin/cohorts/:id/report` or “Cohort performance” from cohort detail. Fetch getCohortPerformanceReport(client, cohortId). Render table: player, sessions completed, completion %, average session score, current TR. Optional: filter by date range, export CSV. No raw DB; all via data layer.
- [x] **8.2** **Competition report page:** New admin page e.g. `/admin/competitions/:id/report` or “Matches” tab on competition detail. Fetch getCompetitionReport(client, competitionId). Render table of matches (player, opponent, date, result, MR). Optional: summary by player, export CSV. No raw DB.
- [x] **8.3** **Nav and routes:** Add “Cohort report” / “Performance” link from cohort list or cohort detail; add “Competition report” / “Matches” from competition detail if not already present. Ensure admin layout and breadcrumbs are consistent.

---

## 9. Performance review and tuning

Per domain §9.1, NFR-9.

- [x] **9.1** **Dashboard load:** Ensure dashboard data (player, cohort, next session, next competition, recent scores) is fetched efficiently (single batch or minimal round-trips). Avoid N+1. Target &lt; 3s on typical connection. Add or verify indexes on calendar, player_calendar, session_runs as needed.
- [x] **9.2** **Play list (available sessions):** Ensure getAllSessionsForPlayer (or equivalent) and related queries are indexed and bounded. Target &lt; 3s.
- [x] **9.3** **Dart submission:** GE dart insert and any routine/session score update should feel immediate. Use optimistic UI if appropriate; avoid unnecessary delay. Do not batch single-dart submissions in a way that adds noticeable lag.
- [x] **9.4** **Analyzer queries:** getSessionHistoryForPlayer and getTrendForPlayer should use limits and windows; verify indexes on session_runs, player_routine_scores support them. Monitor slow queries in dev; document any known heavy queries.
- [x] **9.5** **Admin reports:** Cohort and competition report pages should load in reasonable time; paginate or limit result sets if large (e.g. cohort with many members). Use data layer aggregates only.

**§9 Implementation notes (performance):**

- **9.1 Dashboard:** HomePage uses a single `Promise.all` of four parallel calls (player, cohort, next session/competition, recent scores). Indexes in place: cohort_members(player_id), calendar(cohort_id, scheduled_at), player_calendar(player_id, status), session_runs(player_id). Target &lt;3s documented.
- **9.2 Play list:** `getAllSessionsForPlayer` uses two parallel queries (player_calendar+calendar join, session_runs). Result set is bounded by cohort calendar size (one calendar per cohort). Indexes: player_calendar(player_id), session_runs(player_id). Target &lt;3s documented.
- **9.3 Dart submission:** GE submits darts on “Submit” via sequential insertDartScore then routine/session updates. No artificial batching delay; UI waits for submit. Optional future: optimistic UI for perceived speed.
- **9.4 Analyzer:** `listCompletedSessionRunsForPlayer` uses `limit` (default 50) and optional `since`; `getTrendForPlayer` uses `windowDays` (e.g. 90) or null for all-time. Indexes on session_runs(player_id), player_routine_scores support these. No extra heavy queries added.
- **9.5 Admin reports:** `getCohortPerformanceReport` and `getCompetitionReport` use data-layer aggregates only. Optional `limit` added to `GetCohortPerformanceReportOptions` for very large cohorts (e.g. 500); UI can pass it when needed. Competition report is match-scoped and naturally bounded.

---

## 10. UX and accessibility polish

Per domain §9.2, NFR-6, NFR-8.

- [x] **10.1** **Mobile-first and tap targets:** Audit GE, Dashboard, Analyzer, and key Admin flows for small screens and portrait. Ensure tap targets ≥ 44px; readable font sizes and contrast. Fix any regressions.
- [x] **10.2** **Error handling:** No silent failures; user-facing errors clear and actionable (NFR-8). Review error boundaries and catch blocks; ensure messages are helpful (e.g. “Session could not be loaded. Try again.” with retry). No stack traces or secrets in UI.
- [x] **10.3** **Loading states:** Ensure async operations (dashboard load, session list, analyzer, report pages) show skeleton or spinner. Avoid blank screen during load.
- [x] **10.4** **Consistency:** Navigation labels, button text, and terminology consistent across Play, Dashboard, Analyzer, Admin. Align any P8-added copy (e.g. “Up next”, “View darts”, “AI insights”) with existing patterns.

**§10 Implementation notes:** (1) Tap targets: `index.css` defines `--tap-min: 44px` and `.tap-target`; nav links and Sign out in AuthenticatedLayout and AdminLayoutPage use 44px min-height; SegmentGrid and GE/Play/Analyzer primary buttons use 44px; body font-size 1rem. (2) Error handling: `ErrorMessage` component with optional "Try again"; actionable copy and `onRetry` on HomePage, PlayLandingPage, AnalyzerPage, admin report pages; no stack traces. (3) Loading: `LoadingSpinner` used for dashboard, session list, session load, analyzer, darts, cohort/competition reports. (4) Consistency: Nav "Performance"; Dashboard "Up next", "Start session", "View performance"; Analyzer "View darts", "AI insights"; report titles aligned.

---

## 11. Unit tests

- [x] **11.1** **getCohortPerformanceReport:** Mock client. Returns list of players with completion counts, average session score, TR; empty or partial when no data.
- [x] **11.2** **getCompetitionReport:** Mock client. Returns competition plus matches list; shape correct.
- [x] **11.3** **getDartScoresForSessionRun:** Mock client. Returns darts for training_id; empty when none or not allowed.
- [x] **11.4** **Voice (optional):** If utterance mapping is in a pure function (e.g. mapVoiceToOutcome(text): hit | miss | null), add unit tests for “hit”, “miss”, unknown input. If logic is inline in component, document and skip or add minimal test.
- [x] **11.5** **getTrendForPlayer 90 / all-time:** If getTrendForPlayer is extended with larger windowDays, add or extend tests for 90-day and all-time behaviour (mock returns expected aggregate).

---

## 12. Documentation and cleanup

- [x] **12.1** **Voice:** Document in README or docs: voice input is supported in GE (hit/miss); Web Speech API; HTTPS required; supported browsers and fallback. Document that manual is primary.
- [x] **12.2** **Notifications:** Document “Up next” (Option A or B); where it appears (Dashboard, Notifications page); that GO is app-side derivation or job; any placeholder for email/push.
- [x] **12.3** **dart_scores:** Document index strategy and archiving/partitioning decision (index only vs archive vs partition) in implementation doc or migration comment.
- [x] **12.4** **Tier features:** Document Gold (darts, 90/all-time trends, match history) and Platinum (+ AI placeholder) in README or Analyzer section of docs.
- [x] **12.5** Update **PROJECT_STATUS_TRACKER.md**: when P8 complete, mark **P8 — Polish and scale** checkbox and add “P8 delivered” note in Completed section (voice input, GO notifications, admin reports, indexing, Gold/Platinum analyzer, performance and UX polish).
- [x] **12.6** Ensure all new UI (voice, notifications, reports, analyzer darts/trends) uses only `packages/data` and auth context; no direct Supabase in UI for data.

**§12 Implementation notes:** Voice, notifications, dart_scores index/archiving, and tier features documented in **`docs/P8_FEATURES.md`**. README updated with P8 architecture line and P8 summary; pointer to P8_FEATURES.md in Rules and bootstrap. dart_scores index strategy and “index only” archiving decision are in the migration file comments and in P8_FEATURES.md §3. PROJECT_STATUS_TRACKER.md: P8 checkbox marked complete and “P8 delivered” bullet added to §3 Completed. Grep confirmed no `supabase.from()` or `supabase.rpc()` in apps/web for data; all P8 UI uses `@opp/data` and auth context.

---

## 13. Post-P8 admin enhancements (delivered)

Documentation and implementation alignment for capabilities added after P8.

- [x] **13.1** **Tier in admin players:** Tier column on `/admin/players`; editable dropdown (free/gold/platinum) via `updatePlayerTier`. Data layer and tests in place.
- [x] **13.2** **Tier on profile:** Player profile (`/profile`) displays tier (read-only).
- [x] **13.3** **Cohort players view:** `/admin/cohorts/:id/players` — player name is link to player detail; "Sessions" link only (no separate View; label shortened from "Sessions → routines → scores").
- [x] **13.4** **Reset session (data layer):** `resetSessionForCalendar(client, calendarId)` — admin only; deletes session_runs for calendar_id (CASCADE); updates player_calendar status to 'planned'. Exported; unit tests.
- [x] **13.5** **Reset session (UI):** "Reset session" on cohort calendar (`/admin/cohorts/:id/calendar`) and on player sessions (`/admin/players/:id/sessions`); confirmation dialog; reload on success.
- [x] **13.6** **Admin layout:** OPP logo in admin sidebar larger (80×80) and centrally aligned.
- [x] **13.7** **Migration:** `20260226120000_set_all_players_highest_tier.sql` — sets all players to platinum (dev/demo). Documented in P8_FEATURES.md §7.

**§13 Implementation notes:** See `docs/P8_FEATURES.md` §7 and PROJECT_STATUS_TRACKER.md §3 (Post-P8 admin enhancements).

---

## 14. Dark mode and profile preferences

Per domain §1.3 (Dark mode), §9.2 UX polish.

- [x] **14.1** **Theme preference:** Add theme selector to user profile (or profile edit): options **Light**, **Dark**, **System** (follow OS). Persist choice in localStorage (e.g. key `opp-theme`). No backend field for MVP.
- [x] **14.2** **Apply theme:** On app load and when preference changes, set `data-theme="light"` or `data-theme="dark"` on document root. Resolve **System** via `prefers-color-scheme` media query. Use CSS variables (e.g. in `index.css`) for background, text, muted, error colours so both themes are supported.
- [x] **14.3** **Profile placement:** Show “Appearance” or “Theme” on profile view and/or profile edit with dropdown or radio (Light / Dark / System). Changing selection updates localStorage and applies theme immediately.

---

## Progress summary

| Section | Tasks | Done |
|---------|-------|------|
| 1. Voice score input (GE) | 6 | 5 |
| 2. GO notifications | 6 | 6 |
| 3. dart_scores indexing and archiving | 4 | 3 |
| 4. Data layer — cohort and competition reports | 3 | 3 |
| 5. Data layer — dart-level data | 2 | 2 |
| 6. Analyzer — Gold tier | 3 | 3 |
| 7. Analyzer — Platinum tier | 2 | 2 |
| 8. Admin — reports UI | 3 | 3 |
| 9. Performance review and tuning | 5 | 5 |
| 10. UX and accessibility polish | 4 | 4 |
| 11. Unit tests | 5 | 5 |
| 12. Documentation and cleanup | 6 | 6 |
| 13. Post-P8 admin enhancements | 7 | 7 |
| 14. Dark mode and profile preferences | 3 | 3 |

**Execution rule:** One task (or sub-task) at a time; mark checkbox when done; run relevant tests before moving on.
