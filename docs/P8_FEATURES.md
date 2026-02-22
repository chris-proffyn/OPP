# P8 — Polish and Scale: Feature summary

**Document Type:** Feature documentation (Phase 8)  
**Project:** OPP Darts Training Platform  
**Audience:** Developers, product  
**Status:** Delivered

This document summarises P8-delivered features for voice input, notifications, admin reports, dart_scores indexing, Performance Analyzer tiers, and UX polish. Implementation details are in `docs/P8_POLISH_SCALE_IMPLEMENTATION_TASKS.md` and `docs/P8_POLISH_SCALE_DOMAIN.md`.

---

## 1. Voice score input (Game Engine)

- **What:** In the Game Engine (Play → session → routine step), players can speak the outcome of a dart in addition to tapping the segment grid. Supported utterances: “hit”, “hit it”, “yes”, “got it”, “in” → recorded as hit (current step target); “miss”, “missed”, “no”, “out” → recorded as miss. Segment codes (e.g. “S20”, “T5”, “single 20”) are also recognised and normalised.
- **How:** Browser **Web Speech API** (SpeechRecognition). The app uses the same `dart_scores` insert path as manual input; voice and manual are mutually exclusive per throw.
- **Manual is primary:** Voice is an enhancement. Manual controls (segment grid and buttons) are always shown. If voice is unavailable or fails, the user can complete the session with manual only. Fallback message: “Voice not supported in this browser; use manual input below.”
- **Requirements:** **HTTPS** is required for the Web Speech API (and microphone access). Supported browsers: Chrome, Edge, Safari (desktop and iOS where the API is available). Unsupported or insecure contexts show the fallback and manual only.
- **Feedback:** On recognition: “Hit recorded” / “Miss recorded” (or segment). On no match: “I didn’t catch that” with options to retry voice or use manual. No silent failure.

---

## 2. Notifications (“Up next”)

- **What:** Players see their **next upcoming session** (session name, day/session number, date/time, optional cohort) with a link to start it.
- **Where:** **Dashboard (Home)** in the “Up next” section. No separate Notifications page in P8; “Up next” is the in-app notification content.
- **How (GO):** **Option A — app-side derivation.** There is no `player_notifications` table. The Dashboard calls `getNextSessionForPlayer` (from `@opp/data`), which uses `player_calendar` and `calendar` to compute the next planned session. No server-side job or push in P8.
- **Placeholder:** Email and push notifications are out of scope for P8. A future “GO” service or job could write to a notifications table and/or trigger email/push; the current implementation does not depend on it.

---

## 3. dart_scores indexing and archiving

- **Index strategy:** Documented in the migration `supabase/migrations/20260224120000_add_dart_scores_indexes.sql` and in `docs/P8_POLISH_SCALE_IMPLEMENTATION_TASKS.md` §3. Indexes support:
  - (1) By `training_id`: Analyzer “View darts” and GE lookups.
  - (2) By `player_id`: RLS and “my darts” queries.
  - (3) By `player_id` + `created_at`: time-bounded analytics and future archiving scans.
- **Archiving/partitioning decision (P8):** **Index only.** No `dart_scores_archive` table and no partitioning in P8. Archiving (e.g. moving rows older than 12 months to an archive table) can be added later when row count or query SLAs justify it.

---

## 4. Performance Analyzer tiers (Gold and Platinum)

- **Free tier (unchanged):** Current TR; session history (session + routine scores); trends for **last 30 days** (session score and Singles).
- **Gold tier:** In addition to Free:
  - **View darts:** Per-session dart-level data (expand a session in history to see darts).
  - **Trends — last 90 days:** Session score and Singles over the last 90 days.
  - **Trends — all time:** Same metrics with no date window.
  - **Match history:** List of matches (opponent, format, result, MR).
- **Platinum tier:** Same as Gold, plus:
  - **PR / TR / MR** shown in the Analyzer header (Gold may show these too; both tiers have full session history and match history).
  - **AI insights:** Placeholder section “AI insights — Coming soon” (no AI implementation in P8).

Tier is determined by `players.tier` (or effective tier from membership); the UI gates “View darts”, “Trends — 90 days”, “Trends — all time”, and “Match history” for Gold/Platinum, and “AI insights” for Platinum only. All data is loaded via `@opp/data`; no direct Supabase calls in the UI.

---

## 5. Admin reports

- **Cohort performance report** (`/admin/cohorts/:id/report`): Players in the cohort with sessions planned/completed, completion %, average session score, TR. Data from `getCohortPerformanceReport` in `@opp/data`.
- **Competition report** (`/admin/competitions/:id/report`): Competition details, matches list (player/opponent, result, MR, eligible), and per-player summary (match count, wins, losses). Data from `getCompetitionReport` in `@opp/data`.

Reports use data-layer aggregates only; no raw SQL in the UI.

---

## 6. Architecture and data access

All new P8 UI (voice flow, Dashboard “Up next”, admin reports, Analyzer darts/trends/match history) uses only **`packages/data`** and the shared **auth context** (Supabase client for session). The web app does not call `supabase.from()` or `supabase.rpc()` directly for data; all reads/writes go through `@opp/data`.

---

## 7. Admin enhancements (post-P8)

These capabilities were added after P8 delivery. They align with RSD Admin Portal Guide (confirmations for destructive actions, data via `@opp/data`).

### 7.1 Tier in admin and profile

- **Admin players list** (`/admin/players`): A **Tier** column shows each player's tier (free, gold, platinum). Admins can change it via a dropdown; updates use `updatePlayerTier(client, playerId, tier)` from `@opp/data`. Errors are shown above the table; list refreshes on success.
- **Player profile** (`/profile`): The player's **tier** is shown in the profile (read-only). Tier comes from the same player object loaded in context (`getCurrentPlayer`).

### 7.2 Cohort players view

- **Cohort players** (`/admin/cohorts/:id/players`): The player name (or truncated id) is the **link** to the player detail (`/admin/players/:id`). The separate "View" link was removed. The sessions link label is **"Sessions"** (previously "Sessions → routines → scores").

### 7.3 Reset session

- **What:** Admin can **reset** a calendar session so it is as if it never took place: all session runs for that calendar slot are removed (DB CASCADE removes related dart_scores and player_routine_scores), and all **player_calendar** rows for that calendar_id are set back to **status = 'planned'**.
- **Where:** **Cohort calendar** (`/admin/cohorts/:id/calendar`): each row has a "Reset session" button. **Player sessions** (`/admin/players/:id/sessions`): each completed run has a "Reset session" action (resets that calendar session for all players).
- **How:** Both call `resetSessionForCalendar(client, calendarId)` from `@opp/data`. The action is admin-only (RLS and data layer check). A confirmation dialog explains that the action cannot be undone. On success, the list or calendar is reloaded.
- **Data layer:** `resetSessionForCalendar` in `packages/data` (session-runs): verifies current user is admin; deletes from `session_runs` where `calendar_id` = id; updates `player_calendar` set `status = 'planned'` where `calendar_id` = id.

### 7.4 Admin layout and migration

- **Admin layout** (`/admin` sidebar): The OPP logo in the sidebar is **larger (80×80)** and **centrally aligned** in the column.
- **Migration:** `supabase/migrations/20260226120000_set_all_players_highest_tier.sql` sets all `players.tier` to `'platinum'`. For dev/demo or one-off promotion; run via normal migration flow (e.g. `supabase db push`).

---

## 8. Reference data and profile enhancements (post-P8)

These capabilities extend admin reference-data management and player profile with checkout preferences and level-averages CRUD.

### 8.1 Admin checkout combinations

- **Screen:** `/admin/checkout-combinations` — displays the full `checkout_combinations` table (total 2–170, dart1, dart2, dart3). Table is **editable**: each row has inline inputs for dart1/dart2/dart3 and a per-row **Save** button.
- **RLS:** Existing SELECT for authenticated users; admin UPDATE and INSERT added in `supabase/migrations/20260228140000_checkout_combinations_admin_update.sql`.
- **Data layer:** `listCheckoutCombinations(client)`, `updateCheckoutCombination(client, id, payload)` in `@opp/data` (checkout-combinations). Admin-only for update; list callable by authenticated users for reference lookup.
- **Nav:** “Checkout combinations” in the admin sidebar (under Competitions).

### 8.2 Player checkout variations (profile)

- **Table:** `player_checkout_variations` — one row per (player_id, total) with dart1, dart2, dart3 (nullable text). Used for **player-specific overrides or additions** to the default checkout combinations. Empty by default.
- **RLS:** Players have full CRUD only on their own rows (`player_id = current_user_player_id()`). No admin policies (table is player-scoped).
- **Profile entry:** On the profile screen (`/profile`), a link **“Checkout preferences”** (with “Edit profile”) goes to `/profile/checkout-variations`.
- **Screen:** `/profile/checkout-variations` — table matching checkout combinations layout plus a **Player** column (shows current user’s nickname). Empty state message when no variations. **Add variation** form (total 2–170, dart1/dart2/dart3) and **Add** button; each row has inline edit and **Save** / **Delete** (with confirmation). Full CRUD via `@opp/data`: `listPlayerCheckoutVariations`, `createPlayerCheckoutVariation`, `updatePlayerCheckoutVariation`, `deletePlayerCheckoutVariation`.
- **Migration:** `supabase/migrations/20260229140000_create_player_checkout_variations.sql` (table, indexes, RLS).

### 8.3 Admin level averages

- **Screen:** `/admin/level-averages` — list of all `level_averages` rows (level_min, level_max, description, three_dart_avg, single_acc_pct, double_acc_pct, treble_acc_pct, bull_acc_pct). **New level average** link → `/admin/level-averages/new`; **Edit** per row → `/admin/level-averages/:id`; **Delete** with confirmation.
- **RLS:** Existing SELECT for authenticated users; admin INSERT, UPDATE, DELETE added in `supabase/migrations/20260229150000_level_averages_admin_crud.sql`.
- **Data layer:** `listLevelAverages(client)`, `getLevelAverageById(client, id)`, `createLevelAverage(client, payload)`, `updateLevelAverage(client, id, payload)`, `deleteLevelAverage(client, id)` in `@opp/data` (level-averages). All write operations require admin (requireAdmin in data layer).
- **Nav:** “Level averages” in the admin sidebar (between Level requirements and Competitions).
- **Table:** `level_averages` (level_min, level_max, description, three_dart_avg, optional accuracy % columns) as created and populated by existing migrations (e.g. `20260229120000_create_opp_3_dart_average.sql`, `20260229130000_populate_opp_3_dart_average.sql`).

### 8.4 Checkout update (route display)

- **What:** In the Game Engine, on a **checkout step** (routine_type C), the UI shows a **Checkout** badge, **Start** (original target), **Remaining** (updates as darts are recorded), and for remaining 2–170: **Recommended** route (from `checkout_combinations`) and **Your route** (from `player_checkout_variations` when the player has a variation for that total).
- **APIs:** `getCheckoutCombinationByTotal(client, total)` and `getPlayerCheckoutVariationByTotal(client, total)` in `@opp/data`. See **OPP_CHECKOUT_UPDATE_DOMAIN.md** and **OPP_CHECKOUT_UPDATE_IMPLEMENTATION_CHECKLIST.md**.
