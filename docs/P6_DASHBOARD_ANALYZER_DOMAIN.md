# P6 — Dashboard and Analyzer: Domain Document

**Document Type:** Domain specification (Phase 6)  
**Project:** OPP Darts Training Platform  
**Audience:** Delivery team, Cursor  
**Status:** v1.0  
**Authority:** Defines all required behaviour for Phase 6 (Player dashboard and Performance Analyzer, basic). Implementation must conform to this document.

---

## 1. Purpose and scope

### 1.1 Purpose

This document describes **every behaviour required for Phase 6 — Dashboard and analyzer (basic)** so that:

- Implementers can build without ambiguity.
- Acceptance criteria are testable.
- Scope is limited to: a **Player Dashboard** (profile summary, cohort, next session, PR/TR/MR with trends, link to analyzer); **Performance Analyzer** (Free tier: session history and basic trends); and **tier gating**. Match Rating (MR), Player Rating (PR) calculation, competition sessions, and full analyzer tiers (Gold/Platinum) are P7 or later; P6 delivers the dashboard layout, TR (and placeholders for PR/MR), and Free-tier analyzer only.

### 1.2 Phase 6 objectives (from PRD)

- **Dashboard:** Name/nickname, avatar (optional), current cohort (name, dates), next training session date, next competition date (placeholder acceptable); current PR, TR, MR with trend indicators; link to Performance Analyzer; optional cohort ranking (feature flag).
- **Performance Analyzer (Free tier):** TR; basic session history (session and routine scores only; no per-dart data in Free); basic trends (e.g. Singles performance last 30 days). Tier gating so higher tiers can be prepared for P7+.
- **Tier gating:** Ability to gate features by tier (e.g. Free vs Gold/Platinum). Exact tier definitions and billing out of scope; a tier field or flag per player is in scope.

### 1.3 In scope for P6

- **Dashboard UI:** Replace or expand the current Home placeholder into a structured dashboard with: profile (name, optional avatar), cohort block (name, start/end date), next training session (date and link to Play), next competition (date or “—” until P7), ratings block (PR, TR, MR with trend), and link to Performance Analyzer. Optional: cohort ranking (feature flag).
- **Trends:** A “trend” for TR is a simple indicator (e.g. up/down/stable) derived from recent session performance or a stored snapshot. For P6 basic: TR trend can be “session score last N sessions” (e.g. average of last 5 session scores) or a simple “improving/declining” from last two sessions; no PR/MR trend until P7.
- **Performance Analyzer:** New route/section (e.g. `/analyzer` or `/performance`). Free tier: (1) Current TR; (2) Session history — list of completed sessions with date, session name, session score %, and per-routine scores (no dart-level data); (3) Basic trends — e.g. “Singles average last 30 days”, “Session score trend last 30 days” (average session score over completed runs in window). All time trends can be gated as “premium” (show only last 30 days for Free).
- **Tier storage:** Store player tier (e.g. `free`, `gold`, `platinum`) on `players` or equivalent; default `free`. UI shows/hides or gates analyzer and dashboard features by tier.
- **Data layer:** Queries for dashboard (current player, cohort, next session, next competition placeholder); for analyzer (list completed session runs with session + routine scores; aggregate for “last 30 days” trends by routine name or session score).

### 1.4 Out of scope for P6

- **MR, PR calculation** — P7. Dashboard may display PR/MR as “—” or “N/A” or from existing nullable columns if product wants placeholders.
- **Competition sessions and next competition date** — P7. Dashboard can show “Next competition: —” or “Coming in P7”.
- **Gold/Platinum analyzer features** — Full session/dart history, match history, AI analysis: P7 or P8. P6 only implements Free tier and the gating mechanism.
- **Cohort ranking** — Optional feature flag; if implemented, “current cohort ranking” requires a definition (e.g. by TR or by session completion); can be simple (e.g. rank by TR within cohort) or deferred.
- **Avatar upload/storage** — Optional: link to URL or placeholder; full avatar pipeline can be P8.
- **Payments and subscriptions** — Tier unlocking (e.g. Stripe) is a separate workstream; PRD assumes tier can be set (e.g. by admin or seed) for feature gating.

---

## 2. References

- **PRODUCT_REQUIREMENTS.md** — FR-9.1–FR-9.3 (Player Dashboard), FR-10.1–FR-10.4 (Performance Analyzer, tiers), FR-2.4 (cohort on dashboard).
- **OPP Platform.md** — Player Dashboard (§ Player Dashboard), Performance Analyzer (Free/Gold/Platinum tiers).
- **P1_FOUNDATION_DOMAIN.md** — Players table; optional avatar; PR/TR/MR columns.
- **P3_COHORTS_CALENDAR_DOMAIN.md** — Cohorts, cohort_members, calendar, player_calendar; getNextSessionForPlayer, getCurrentCohortForPlayer.
- **P4_GAME_ENGINE_DOMAIN.md** — session_runs, session_score, player_routine_scores; completion flow.
- **P5_TRAINING_RATING_DOMAIN.md** — TR display; BR/ITA; no PR/MR yet.

---

## 3. Definitions

| Term | Definition |
|------|-------------|
| **Dashboard** | Player-facing home view showing profile summary, cohort, next session, ratings (PR/TR/MR) with trend, and link to Performance Analyzer. Replaces or expands current Home. |
| **Performance Analyzer** | Section of the app (or dedicated route) showing session history and trends. Tier-dependent: Free = TR, session/routine scores history, basic trends (e.g. last 30 days). |
| **Session history** | List of completed session runs for the player: session name, date (scheduled_at or completed_at), session score %, and per-routine scores. No dart-level detail in Free tier. |
| **Basic trend** | Aggregate metric over a time window (e.g. last 30 days): e.g. average session score, or average score for a named routine (e.g. “Singles”). Used for “Singles last 30 days” style display. |
| **TR trend** | Indicator of whether TR (or session performance) is improving, stable, or declining. P6: can be derived from last N session scores (e.g. compare last 2 averages) or a simple “last 5 session average” vs previous 5. |
| **Tier** | Membership level: `free`, `gold`, `platinum`. Stored per player; used to gate analyzer and dashboard features. Default `free`. |
| **Tier gating** | UI and data layer restrict certain features (e.g. full session history with darts, all-time trends) to higher tiers; Free tier sees only what is allowed for Free. |

---

## 4. Data model

### 4.1 Existing tables used

- **players** — display_name, baseline_rating, training_rating, match_rating, player_rating; optional avatar URL if added. P6 may add `tier` (see below).
- **cohorts** — name, level, start_date, end_date, schedule_id.
- **cohort_members** — player_id, cohort_id.
- **calendar** — scheduled_at, cohort_id, session_id, day_no, session_no.
- **player_calendar** — player_id, calendar_id, status (planned | completed).
- **session_runs** — player_id, calendar_id, started_at, completed_at, session_score.
- **player_routine_scores** — player_id, training_id (session_run.id), routine_id, routine_score.
- **sessions** — name (session name).
- **routines** — name (routine name, e.g. “Singles”, “Doubles”).

No new tables required for P6 core. Session history is derived from session_runs + player_routine_scores + calendar/sessions/routines.

### 4.2 Tier (product choice)

- **Option A:** Add column **`players.tier`** (text, NOT NULL, DEFAULT 'free'). Allowed values: `'free'`, `'gold'`, `'platinum'`. Migration in P6.
- **Option B:** No DB change; tier inferred from role or a feature flag (e.g. all players “free” until a separate membership service exists). UI still gates by a constant or env for P6.

Recommendation: **Option A** so admin can set tier per player and UI/data layer can gate consistently. If product defers, use Option B and document “all users Free for P6”.

### 4.3 Avatar (optional)

- **Option A:** Add **`players.avatar_url`** (text, nullable). URL to hosted image; upload/storage pipeline out of scope for P6 (can use external URL or placeholder).
- **Option B:** No avatar in P6; dashboard shows name only. Platform mentions “Image/Avatar”; implement in P6 if minimal (e.g. URL field only) or defer to P8.

---

## 5. Dashboard behaviour

### 5.1 Layout and sections

The Player Dashboard (e.g. route `/home` or `/dashboard`) must include:

1. **Profile** — Display name (from players.display_name). Optional: avatar (if avatar_url or placeholder).
2. **Cohort** — If player has a current cohort: cohort name, start date, end date. If none: “No cohort” or “—”. Data: getCurrentCohortForPlayer (P3).
3. **Next training session** — Date (and time if available) of next planned session; link to Play (e.g. “Start” → `/play` or direct to session if known). Data: getNextSessionForPlayer (P3). If no next session: “No upcoming session” or “—”.
4. **Next competition** — Placeholder: “—” or “Coming soon” until P7. No data required.
5. **Ratings** — PR, TR, MR. TR from players.training_rating (P5). PR and MR from players.player_rating and players.match_rating; if null, show “—” or “N/A”. **Trend:** For TR, show a simple trend indicator (e.g. ↑ / → / ↓) derived from recent session performance (see §7). For PR/MR, trend can be “—” until P7.
6. **Link to Performance Analyzer** — Button or link to `/analyzer` (or chosen route).

Optional (feature flag):

7. **Cohort ranking** — “Your rank in [cohort]: X of Y” (e.g. by TR). Requires definition of ranking (e.g. order by training_rating DESC within cohort). Can be deferred.

### 5.2 Data flow

- On load: fetch current player (existing context), getCurrentCohortForPlayer(client, playerId), getNextSessionForPlayer(client, playerId). Ratings from player object (already in context). Trend: optional fetch of recent session runs or a small aggregate (see §7).
- No new tables; only orchestration of existing APIs and optional new “trend” helper.

### 5.3 Access control

- Dashboard is player-facing; only the authenticated player sees their own data. RLS and existing getCurrentPlayer / getCurrentCohortForPlayer enforce this.

---

## 6. Performance Analyzer (Free tier)

### 6.1 Route and entry

- **Route:** e.g. `/analyzer` or `/performance`. Linked from Dashboard. Only accessible when authenticated and player exists (same guards as Dashboard).
- **Tier gating:** Free tier sees only the features listed in §6.2. If tier is `gold` or `platinum`, UI can show the same Free content for P6 (Gold/Platinum features implemented in P7+); or show “More in Gold/Platinum” placeholder.

### 6.2 Free tier content

1. **Current TR** — Display players.training_rating (same as Dashboard).
2. **Session history** — List of completed sessions (session runs where completed_at IS NOT NULL), ordered by completed_at DESC (or scheduled_at). For each row:
   - Session name (from calendar → sessions.name).
   - Date (scheduled_at or completed_at).
   - Session score % (from session_runs.session_score).
   - Per-routine scores: routine name and routine_score (from player_routine_scores joined to routines). No dart-level data in Free tier.
3. **Basic trends** — At least one of:
   - **Session score — last 30 days:** Average of session_score over completed runs in the last 30 days. If none, show “No data” or “—”.
   - **Routine trend — e.g. Singles last 30 days:** Average of player_routine_scores.routine_score for routines named “Singles” (or containing “Singles”) over session runs completed in the last 30 days. If no Singles routine in that window, show “—”.

All-time trends (e.g. “All time average”) are premium in Platform; for P6 Free tier, limit to “last 30 days” only.

### 6.3 Data layer for analyzer

- **listCompletedSessionRunsForPlayer(client, playerId, options?)** — Returns list of completed session runs with: session_run id, calendar_id, completed_at, session_score; session name (via calendar → sessions); list of { routine_id, routine_name, routine_score } for that run. Optional: limit, offset, or “since” date (e.g. last 30 days) for trends.
- **getSessionHistoryForPlayer(client, playerId, limit?)** — Convenience wrapper: listCompletedSessionRunsForPlayer ordered by completed_at DESC, with limit (e.g. 50).
- **getTrendForPlayer(client, playerId, options)** — Options: { type: 'session_score' | 'routine', routineName?: string, windowDays: number }. Returns aggregate (e.g. average session score, or average routine score for that routine name) over completed runs in the window. Returns null or 0 if no data.

Implementation may combine these into one or two functions; the behaviour above is the contract.

### 6.4 Pagination and limits

- Session history can be limited to last N entries (e.g. 50) for performance. “Load more” or pagination optional for P6.

---

## 7. TR trend indicator (Dashboard)

### 7.1 Definition

- **Trend** = up (↑), stable (→), or down (↓) for TR. P6 does not store historical TR values; trend is derived from recent session performance.
- **Option A:** Compare average session score of “last 2 completed sessions” vs “previous 2”. If recent > previous → up; recent < previous → down; else stable.
- **Option B:** Compare “last 5 session average” vs “previous 5”; if fewer than 5, use available data or show “—”.
- **Option C:** No trend in P6; show TR only. Add trend in a later iteration when rating_history or session aggregates are available.

Recommendation: **Option A** for P6 (minimal; two vs two). Data: last 4 completed session runs (session_score), ordered by completed_at DESC; compute two averages; compare.

### 7.2 Data layer

- **getRecentSessionScoresForPlayer(client, playerId, limit)** — Returns session_score and completed_at for the last `limit` completed runs (ordered by completed_at DESC). Used by Dashboard to compute trend. If fewer than 2 runs, trend = “—” or “stable”.

---

## 8. Tier gating

### 8.1 Storing tier

- If **players.tier** is added: default `'free'`. Admin can set `gold` or `platinum` via profile edit or admin UI (out of scope for P6 minimum: can be SQL or future admin field).
- If no column: treat all users as `free`; gate logic still present so that when tier is added, behaviour is consistent.

### 8.2 Gating rules (P6)

- **Free:** Dashboard (all sections); Analyzer: current TR, session history (session + routine scores only), basic trends (last 30 days). No dart-level data; no all-time trends.
- **Gold / Platinum:** For P6, show same as Free or show “More in Gold/Platinum” message. Full Gold/Platinum behaviour (full darts, all-time, match history, AI) is P7+.

### 8.3 UI behaviour

- If a feature is gated (e.g. “All-time trends” for Free): hide the control or show it disabled with tooltip “Available in Gold/Platinum” (or leave all-time out of Free UI entirely).

---

## 9. Data layer summary

| Function | Purpose |
|----------|---------|
| **getCurrentPlayer(client)** | Existing. Dashboard ratings, name, tier. |
| **getCurrentCohortForPlayer(client, playerId)** | Existing (P3). Dashboard cohort block. |
| **getNextSessionForPlayer(client, playerId)** | Existing (P3). Dashboard “next session”. |
| **listCompletedSessionRunsForPlayer(client, playerId, options?)** | New. Returns completed runs with session name, date, session_score, and per-routine (routine_name, routine_score). Optional since date for “last 30 days”. |
| **getSessionHistoryForPlayer(client, playerId, limit?)** | New. Session history list for Analyzer. |
| **getTrendForPlayer(client, playerId, options)** | New. Aggregate for “session score last 30 days” or “routine X last 30 days”. |
| **getRecentSessionScoresForPlayer(client, playerId, limit)** | New. Last N session_score + completed_at for TR trend indicator. |

Existing: getPlayerById, getAllSessionsForPlayer (play list); no change to session_runs or player_routine_scores schema for P6 beyond optional players.tier (and optional players.avatar_url).

---

## 10. Routes and navigation

- **Dashboard:** Existing `/home` (or `/dashboard`) upgraded to full dashboard layout. Nav: Home, Play, Analyzer (or Performance), Profile, Sign out. Analyzer link from Dashboard and from nav.
- **Analyzer:** New route `/analyzer` (or `/performance`). Content: TR, session history table, basic trends (last 30 days). No new layout beyond main app layout.

---

## 11. Migrations

- **Optional:** `players.tier` (text, NOT NULL, DEFAULT 'free', CHECK (tier IN ('free','gold','platinum'))). Comment: “P6 tier for feature gating.”
- **Optional:** `players.avatar_url` (text, nullable). Comment: “URL to profile image; upload pipeline TBD.”
- **RLS:** No change; players read/update own row. Tier is read for gating; only admin or self (for display) need access.

---

## 12. Testing and acceptance

- **Dashboard:** Load as player with cohort and next session; verify cohort name and dates, next session date and link; verify TR and trend (or “—”); PR/MR show “—” or N/A. Load as player without cohort; verify “No cohort” and no next session or “—”. Link to Analyzer navigates to analyzer route.
- **Analyzer (Free):** Session history lists completed runs with session name, date, session score, routine scores; no dart data. Trend “last 30 days” shows average when data exists; “No data” or “—” when none. Tier free: only Free content visible.
- **Tier gating:** If tier = free, all-time trend (if ever shown) is hidden or disabled. Setting tier to gold/platinum (e.g. via SQL) does not break UI; same Free content or placeholder for higher tier until P7.
- **Data layer:** listCompletedSessionRunsForPlayer and getTrendForPlayer return correct aggregates; getRecentSessionScoresForPlayer returns last N runs for trend.

---

## 13. Document history

- **v1.0** — Initial P6 Dashboard and Analyzer domain (dashboard layout, cohort, next session, PR/TR/MR and trend, analyzer Free tier session history and basic trends, tier gating).
