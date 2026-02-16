# P6 — Dashboard and Analyzer: Implementation Tasks

**Document Type:** Implementation plan (Phase 6)  
**Project:** OPP Darts Training Platform  
**Spec reference:** `docs/P6_DASHBOARD_ANALYZER_DOMAIN.md`  
**Status:** Complete

---

## 1. Migrations and schema (optional)

Per domain §4.2, §4.3, §11.

- [x] **1.1** **Tier:** Decide product choice. **Option A:** Add `players.tier` (text, NOT NULL, DEFAULT 'free', CHECK (tier IN ('free','gold','platinum'))). Create migration `supabase/migrations/YYYYMMDDHHMMSS_add_players_tier.sql`. **Option B:** No column; treat all users as 'free' in code; document. If Option A: ensure getCurrentPlayer (and any select of players) includes `tier`; default existing rows to 'free' in migration. **Done:** Migration `20260220120000_add_players_tier_and_avatar.sql` adds `tier`; getCurrentPlayer/getPlayerById use select('*'); listPlayers select list updated.
- [x] **1.2** **Avatar (optional):** If product wants avatar in P6: add `players.avatar_url` (text, nullable) in same or separate migration. Otherwise defer to P8; dashboard shows name only. **Done:** Added in same migration; nullable; dashboard can show name only until used.
- [x] **1.3** Apply migrations to Supabase project and verify. Update `packages/data` types (Player interface) to include `tier` (and `avatar_url` if added). **Done:** Applied via Supabase MCP; columns verified. Player type has tier, avatar_url; listPlayers includes tier, avatar_url, ita_score, ita_completed_at.

---

## 2. Data layer — session history and trends

Per domain §6.3, §7.2, §9.

- [x] **2.1** **getRecentSessionScoresForPlayer(client, playerId, limit: number):** Query session_runs for player where completed_at IS NOT NULL, order by completed_at DESC, limit N. Return array of { session_score, completed_at } (or session_score only if date not needed for UI). Export from `packages/data`. Used for Dashboard TR trend (last 4 → compare last 2 vs previous 2). **Done:** `packages/data/src/session-history.ts`; returns RecentSessionScore[].
- [x] **2.2** **listCompletedSessionRunsForPlayer(client, playerId, options?):** Return completed session runs with: id, calendar_id, completed_at, session_score; session name (join calendar → sessions); for each run, list of { routine_id, routine_name, routine_score } (from player_routine_scores + routines). Optional: `since` (date) or `limit`. Order by completed_at DESC. Export from `packages/data`. **Done:** session-history.ts; options ListCompletedSessionRunsOptions (since, limit); returns SessionHistoryEntry[].
- [x] **2.3** **getSessionHistoryForPlayer(client, playerId, limit?):** Wrapper or alias for listCompletedSessionRunsForPlayer with limit (e.g. 50). Used by Analyzer session history list. **Done:** wrapper with default limit 50.
- [x] **2.4** **getTrendForPlayer(client, playerId, options):** Options: `{ type: 'session_score' | 'routine', routineName?: string, windowDays: number }`. For `session_score`: average of session_score over completed runs where completed_at >= (now - windowDays). For `routine`: average of player_routine_scores.routine_score where run is in window and routine name matches (e.g. contains routineName). Return number or null if no data. Export from `packages/data`. **Done:** session-history.ts; routine match via ilike on routine name.
- [x] **2.5** Export all new functions from `packages/data` index; add types for return shapes (e.g. SessionHistoryEntry, TrendResult) if needed. **Done:** types in types.ts (RecentSessionScore, SessionHistoryEntry, SessionHistoryRoutineScore, ListCompletedSessionRunsOptions, GetTrendForPlayerOptions); exported from index.

---

## 3. Data layer — tier and player shape

Per domain §8.1, §9.

- [x] **3.1** If `players.tier` added: ensure **getCurrentPlayer** and **getPlayerById** select `tier`. Player type in `packages/data` includes `tier?: 'free' | 'gold' | 'platinum'` (or string). If no column: Player type has optional `tier` for future; app treats missing as 'free'. **Done:** Both use select('*'); Player has tier and avatar_url (§1). Comments in players.ts: select * includes tier/avatar_url; app treats missing tier as 'free'.
- [x] **3.2** No RLS change; players read own row. Tier is read-only for player (admin can update via SQL or future admin UI). **Done:** No RLS change in P6; migration §1 did not alter policies. Tier is read for gating; only admin or future admin UI updates it.

---

## 4. Dashboard UI — layout and data

Per domain §5, §10.

- [x] **4.1** **Upgrade HomePage** (route `/home`): Replace or expand current placeholder into structured dashboard. Sections: (1) Profile — display name; optional avatar if avatar_url in use. (2) Cohort — if current cohort exists: name, start_date, end_date; else “No cohort” or “—”. (3) Next training session — date (and time if available), link to Play (e.g. “Start” → `/play` or direct to session via calendarId if getNextSessionForPlayer returns it). If no next session: “No upcoming session” or “—”. (4) Next competition — “—” or “Coming soon”. (5) Ratings — PR, TR, MR (from player); if null show “—” or “N/A”. (6) TR trend — indicator ↑ / → / ↓ (see §5). (7) Link to Performance Analyzer (e.g. button “View performance” → `/analyzer`).
- [x] **4.2** **Data loading:** On Dashboard load: use player from context (getCurrentPlayer already in SupabaseContext); call getCurrentCohortForPlayer(client, player.id), getNextSessionForPlayer(client, player.id), getRecentSessionScoresForPlayer(client, player.id, 4) for trend. Handle loading and error states. **Done:** useEffect Promise.all; loading/error state; Retry link.
- [x] **4.3** **Optional — cohort ranking:** If feature flag enabled: show “Your rank in [cohort]: X of Y” (e.g. rank by training_rating within cohort). Defer acceptable; document in checklist if skipped. **Done:** Deferred.

---

## 5. TR trend indicator (Dashboard)

Per domain §7.

- [x] **5.1** **Trend logic:** Using last 4 completed session scores (from getRecentSessionScoresForPlayer(client, playerId, 4)): compare average of first 2 (most recent) vs average of next 2 (previous). If recent > previous → up (↑); recent < previous → down (↓); else stable (→). If fewer than 4 runs, show “—” or stable. Implement in Dashboard or a small util (e.g. `computeTRTrend(scores: { session_score: number }[]): 'up' | 'down' | 'stable' | null`). **Done:** utils/trTrend.ts computeTRTrend; HomePage uses getRecentSessionScoresForPlayer(4) and computeTRTrend; fewer than 4 → no symbol.
- [x] **5.2** **Display:** Render trend next to TR (e.g. "TR: 24 ↑" or "TR: 24 →"). Accessible label (e.g. aria-label "Trend: improving"). **Done:** TR with ↑/→/↓; span has aria-label and title.

---

## 6. Performance Analyzer — route and Free tier content

Per domain §6, §10.

- [x] **6.1** **Route:** Add route `/analyzer` (or `/performance`). **Done:** §4; route, nav "Performance", Dashboard link. (or `/performance`). Create **AnalyzerPage** (or PerformancePage). Guard: authenticated + player exists (same as Dashboard). Add to app router and nav: link “Analyzer” or “Performance” in main nav and from Dashboard.
- [x] **6.2** **Free tier — Current TR:** Display current TR (from player.training_rating). Same as Dashboard. **Done:** AnalyzerPage shows player.training_rating.
- [x] **6.3** **Free tier — Session history:** List of completed sessions: session name, date (scheduled_at or completed_at), session score %, and per-routine rows (routine name, routine_score). Data: getSessionHistoryForPlayer(client, playerId, 50). No dart-level data. Table or card layout. **Done:** Table: date, session name, score %, routine scores (name: %); getSessionHistoryForPlayer(50).
- [x] **6.4** **Free tier — Basic trends:** At least one of: (a) “Session score — last 30 days”: call getTrendForPlayer(client, playerId, { type: 'session_score', windowDays: 30 }); display average or “No data”. (b) “Singles last 30 days” (or “Routine: Singles”): getTrendForPlayer(client, playerId, { type: 'routine', routineName: 'Singles', windowDays: 30 }). Display average or “—”. Do not show all-time trends for Free (gate or omit). **Done:** Session score last 30 days + Singles last 30 days; "No data" / "—"; no all-time.
- [x] **6.5** **Tier gating in Analyzer:** If player.tier is `free`, show only Free content. If `gold` or `platinum`, show same Free content for P6 or “More in Gold/Platinum” placeholder. No dart-level or all-time in P6. **Done:** Free sees TR, history, last-30 trends; gold/platinum get same + "More in Gold/Platinum" placeholder.

---

## 7. Tier gating (UI)

Per domain §8.

- [x] **7.1** **Default tier:** If no `players.tier` column, treat tier as `'free'` everywhere (optional field on Player or constant in UI). If column exists, read from player; default existing rows to 'free' in migration. **Done:** Column exists (§1); getEffectiveTier(player) in utils/tier.ts defaults to 'free'.
- [x] **7.2** **Gating in UI:** Free: Dashboard (all sections); Analyzer: TR, session history (session + routine scores), basic trends (last 30 days only). Do not expose “All-time” or dart-level data to Free. If a control would be premium, hide it or show disabled with tooltip “Available in Gold/Platinum” (or leave all-time out of Free UI). **Done:** Analyzer shows only last-30-day trends and session/routine scores; no all-time or dart-level controls.
- [x] **7.3** **Gold/Platinum:** For P6, no additional features; UI does not break when tier is gold/platinum (e.g. same view or placeholder). **Done:** AnalyzerPage shows same Free content for all; gold/platinum get "More in Gold/Platinum" placeholder.

---

## 8. Routes and navigation

Per domain §10.

- [x] **8.1** **Nav:** Main app nav (authenticated layout) includes: Home, Play, Analyzer (or Performance), Profile, Sign out. Analyzer links to `/analyzer`. **Done:** AuthenticatedLayout has Home, Play, Performance (/analyzer), Profile, Sign out.
- [x] **8.2** **Router:** Register `/analyzer` (or `/performance`) with AnalyzerPage. Ensure only authenticated users with player can access (AuthGuard + PlayerGuard if used). **Done:** /analyzer under PlayerGuard; AnalyzerPage guarded.

---

## 9. Unit tests

Per domain §12.

- [x] **9.1** **getRecentSessionScoresForPlayer:** Mock client. Returns last N completed runs (session_score, completed_at) ordered by completed_at DESC. Empty when no runs.
- [x] **9.2** **listCompletedSessionRunsForPlayer / getSessionHistoryForPlayer:** Mock client. Returns completed runs with session name and routine scores; optional since/limit. Order and shape correct.
- [x] **9.3** **getTrendForPlayer:** Mock client. session_score type: average over runs in window; routine type: average for matching routine name in window. Returns null or 0 when no data.
- [x] **9.4** **computeTRTrend (if extracted):** Pure function. Last 2 avg > previous 2 → 'up'; last 2 < previous 2 → 'down'; else 'stable'. Fewer than 4 scores → null or 'stable'.

---

## 10. Documentation and cleanup

- [x] **10.1** Update README or docs: mention P6 Dashboard (profile, cohort, next session, PR/TR/MR and trend, link to Analyzer) and Performance Analyzer (Free tier: session history, basic trends). Tier gating.
- [x] **10.2** Ensure Dashboard and Analyzer use only `packages/data` and auth context (no direct Supabase in UI for data).
- [x] **10.3** Update **PROJECT_STATUS_TRACKER.md**: when P6 complete, mark **P6 — Dashboard and analyzer (basic)** checkbox and add “P6 delivered” note in Completed section (dashboard layout, analyzer Free tier, tier gating).

---

## Progress summary

| Section | Tasks | Done |
|---------|-------|------|
| 1. Migrations and schema (optional) | 3 | 3 |
| 2. Data layer — session history and trends | 5 | 5 |
| 3. Data layer — tier and player shape | 2 | 2 |
| 4. Dashboard UI — layout and data | 3 | 3 |
| 5. TR trend indicator (Dashboard) | 2 | 2 |
| 6. Performance Analyzer — route and Free tier | 5 | 5 |
| 7. Tier gating (UI) | 3 | 3 |
| 8. Routes and navigation | 2 | 2 |
| 9. Unit tests | 4 | 4 |
| 10. Documentation and cleanup | 3 | 3 |

**Execution rule:** One task (or sub-task) at a time; mark checkbox when done; run relevant tests before moving on.
