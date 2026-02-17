# P8 — Polish and Scale: Domain Document

**Document Type:** Domain specification (Phase 8)  
**Project:** OPP Darts Training Platform  
**Audience:** Delivery team, Cursor  
**Status:** v1.0  
**Authority:** Defines all required behaviour for Phase 8 (Polish and scale). Implementation must conform to this document.

---

## 1. Purpose and scope

### 1.1 Purpose

This document describes **every behaviour required for Phase 8 — Polish and scale** so that:

- Implementers can build without ambiguity.
- Acceptance criteria are testable.
- Scope covers: **voice score input** in the Game Engine; **GO (Game Orchestrator) notifications** for upcoming sessions; **admin cohort and competition reports**; **indexing and archiving strategy for dart_scores**; **remaining tier features** (Gold and Platinum Performance Analyzer content); and **performance and UX polish** consistent with NFRs. P8 is incremental on top of P7; it does not introduce new rating engines or competition data models.

### 1.2 Phase 8 objectives (from PRD and tracker)

- **Voice score input:** GE supports voice as well as manual input for dart outcome (hit/miss or target/actual). Manual remains primary for reliability; voice is an enhancement. Platform: “Task outcome input: Via Voice input by user or manually via UI.”
- **GO notifications:** Players can be notified of upcoming sessions (e.g. “Day 2 - Singles practice due on 2026-03-01 20:00”). Mechanism (email, in-app, push) to be decided; placeholder for “notification content” and “due session” in scope. GO “manages player notifications” per Platform.
- **Admin cohort/competition reports:** View cohort performance data, cohort session data, competition data—aggregated or report-style views, not raw DB access. Per FR-12.3.
- **Indexing/archiving for dart_scores:** dart_scores will grow large (NFR-10); implement indexing and, where appropriate, partitioning or archiving strategy so analytics and reads remain viable at scale. MVP may have started with single table; P8 formalises index strategy and optional archiving.
- **Remaining tier features:** Gold and Platinum Performance Analyzer content as defined in Platform and FR-10.2–FR-10.3: full session history with darts, session trends (90 days, all-time), match history; Platinum adds AI analysis (deferred implementation or placeholder).
- **Performance and polish:** Dashboard and session list load in &lt; 3s (NFR-9); dart submission feels immediate; mobile-first and accessibility (NFR-6); any final UX polish across GE, Dashboard, Admin.

### 1.3 In scope for P8

- **Voice input:** In GE routine execution, allow the player to speak the outcome (e.g. “hit”, “miss”, or segment code) in addition to tapping/clicking. Fallback to manual always available. Implementation options: browser Web Speech API, or external service; document choice and constraints (e.g. HTTPS, permissions).
- **Notifications:** Data model or derived source for “upcoming session due” (e.g. next calendar entry for player from player_calendar + calendar). Delivery: at least **in-app** (e.g. list or banner “Next: Day 2 - Singles on 2026-03-01 20:00”); email and/or push optional and mechanism TBD. Content: session name, date/time, cohort/schedule context. No requirement for a full “GO” backend service if in-app derivation suffices; document how “GO” is realised (e.g. app-side derivation, or server job that writes to a notifications table).
- **Admin reports:** Cohort report (e.g. completion rates, session scores, TR deltas per player); competition report (e.g. matches played, results, standings per competition or cohort). Data layer functions that aggregate over cohort_members, session_runs, player_routine_scores, matches; admin UI pages that consume them. No direct SQL in UI; all via `packages/data` or equivalent.
- **dart_scores indexing:** Indexes to support common query patterns (e.g. by player_id, training_id, created_at or session_run date). Document recommended indexes and migration.
- **dart_scores archiving/partitioning:** Strategy and, if implemented, mechanism: e.g. partition by month/year; or move rows older than N months to an archive table; or materialised/summary tables for analytics so hot queries avoid scanning full dart_scores. Product may choose “index only” for P8 and defer archiving; document the decision.
- **Gold tier analyzer:** Full session history including per-dart data (expand existing session history to include dart-level rows for Gold+); session trends for 90 days and all-time (extend getTrendForPlayer or equivalent); match history (list matches for player). No AI.
- **Platinum tier analyzer:** Same as Gold; add PR, TR, MR in display if not already; AI analysis deferred (placeholder or “Coming soon”) unless product commits to an AI workstream.
- **Performance:** Review and tune slow queries (dashboard, play list, analyzer); ensure indexes support them; target NFR-9 (dashboard and session list &lt; 3s; dart submission immediate).
- **UX polish:** Accessibility (tap targets, contrast, labels); consistent error handling and loading states; any remaining GE/Dashboard/Admin refinements.
- **Dark mode:** App supports light and dark theme. User can choose from **profile** (e.g. on profile or profile edit page): **Light**, **Dark**, or **System** (follow OS preference). Preference persisted (e.g. localStorage); applied app-wide via CSS variables or data-theme on root. No backend field required for MVP.

### 1.4 Out of scope for P8

- **Payments and subscriptions** — Tier unlocking (e.g. Stripe) remains a separate workstream; P8 assumes tier is already set (e.g. by admin).
- **Full AI analysis** — Platinum “AI analysis” is deferred unless explicitly in scope; placeholder or “Coming soon” is acceptable.
- **Multi-tenant or white-label** — Per PRD assumptions; not required for P8.
- **New core technologies** — Per .cursorrules; voice and notifications use approved stack (e.g. Web Speech API, Supabase, existing app backend).
- **Changes to TR/MR/OMR/PR formulas** — Rating logic unchanged; P8 is polish and scale only.

---

## 2. References

- **PRODUCT_REQUIREMENTS.md** — FR-5.2 (voice and manual score input), FR-10.2–FR-10.4 (Performance Analyzer tiers), FR-12.3 (admin view cohort/competition data), FR-13.1 (notifications), NFR-6 (UX, accessibility), NFR-9 (performance), NFR-10 (dart_scores scale).
- **OPP Platform.md** — Game Engine (score input: voice + manual); GO (manages player notifications); Performance Analyzer (Free/Gold/Platinum tiers).
- **P4_GAME_ENGINE_DOMAIN.md** — GE flow, routine execution, dart capture, session_runs, dart_scores.
- **P6_DASHBOARD_ANALYZER_DOMAIN.md** — Analyzer route, Free tier content, tier gating; Gold/Platinum placeholder.
- **P7_MATCH_RATING_COMPETITION_DOMAIN.md** — Matches, competitions; match history for analyzer.
- **RSD_DATA_MODELLING_GUIDE.md** — Indexing, migrations, naming.

---

## 3. Definitions

| Term | Definition |
|------|-------------|
| **Voice score input** | Player speaks the outcome of a dart (e.g. “hit”, “miss”, or target code) instead of or in addition to manual tap/click. GE records the same dart_scores row; input method is UX only. |
| **GO (Game Orchestrator)** | Logical component that “manages player notifications” and session lifecycle (Platform). May be realised as in-app derivation of due sessions, or a server-side job that creates notification records. |
| **Notification** | A message to the player about an upcoming session (e.g. “Day 2 - Singles practice due on 2026-03-01 20:00”). Content: session name, date/time, optional cohort/schedule context. |
| **Admin report** | Aggregated view of cohort or competition data (completion, scores, TR, matches) presented in the admin UI. Built from data layer aggregates, not raw DB access. |
| **Archiving** | Moving or copying old dart_scores rows to a separate table or storage so that the main table stays bounded and hot queries remain fast. Optional in P8; indexing is minimum. |
| **Partitioning** | Splitting dart_scores (or similar) into physical partitions by range (e.g. by month). Can support retention and archive policies. |
| **Gold tier (analyzer)** | Full session history with darts; session trends 90 days and all-time; match history; no AI. |
| **Platinum tier (analyzer)** | Same as Gold; PR/TR/MR display; AI analysis deferred or placeholder. |

---

## 4. Voice score input

### 4.1 When and where

- **Context:** During GE routine execution, when the player is prompted to enter the outcome of a dart (or visit). Per FR-5.2: “supports voice and manual score input”.
- **Behaviour:** Player may either (a) use existing manual control (tap hit/miss or segment), or (b) speak the result. Recognised utterance is mapped to the same outcome as manual (e.g. “hit” → hit, “miss” → miss; or “S20”, “T5” for segment codes if product supports). One outcome per dart; voice and manual are mutually exclusive for a single throw (whichever is used first or last wins).
- **Primary input:** Manual remains primary for reliability (PRD assumption). Voice is enhancement; failure or unavailability of voice must not block completion (fallback to manual).

### 4.2 Technical options

- **Browser:** Web Speech API (SpeechRecognition) for recognition; HTTPS required; permissions and browser support vary. Document supported browsers and fallback (e.g. “Voice not supported in this browser; use manual input”).
- **Alternative:** External speech-to-text or custom grammar (e.g. “hit”, “miss”, “single 20”) if product specifies. Document choice and any API keys/env (no secrets in client).
- **Output:** Recognised text is mapped to a canonical outcome (hit/miss or target/actual) and then written to dart_scores exactly as manual input would. No separate “voice” column required unless product wants analytics on input method.

### 4.3 Accessibility and UX

- **Discovery:** Users must be able to discover voice option (e.g. “Say ‘hit’ or ‘miss’, or tap below”). Do not rely on voice-only; always show manual controls.
- **Feedback:** Visual and/or auditory confirmation when voice is recognised (e.g. “Hit recorded”). Timeout or “I didn’t catch that” with retry or switch to manual.
- **NFR-6:** Maintain mobile-first, tap targets, contrast; voice does not reduce accessibility for users who cannot or prefer not to use voice.

### 4.4 Data and schema

- No change to dart_scores schema for voice per se. Optional: add `input_method` (‘manual’ | ‘voice’) for analytics; otherwise omit and treat as implementation detail.

---

## 5. GO notifications

### 5.1 What is notified

- **Content:** Upcoming session due for the player. Example: “Day 2 - Singles practice due on 2026-03-01 20:00”. At minimum: session name (or day/session no), date/time. Optional: cohort name, schedule name, link to Play.
- **Source of truth:** “Due session” = next calendar entry for the player where status is planned (or equivalent), from getNextSessionForPlayer or analogous. Notifications may be derived on demand from calendar + player_calendar, or pre-computed and stored.

### 5.2 Data model options

- **Option A — Derived only:** No new table. “Notifications” in UI = current “next session” (and optionally next N) from existing calendar/player_calendar APIs. In-app list or dashboard widget shows “Up next: Day 2 - Singles on 2026-03-01 20:00”. Simplest; no delivery mechanism for “push” or email.
- **Option B — Notifications table:** Table e.g. `player_notifications` (id, player_id, type, title, body, due_at, read_at, created_at). A server job or Edge Function (GO) periodically computes “due session” per player and inserts rows. UI reads this table; optional email/push sender consumes same rows. Allows “past due” and “read” state; supports future channels.

Recommendation: **Option A** for P8 minimum (in-app only; derive from next session). If product wants email/push or notification history, implement Option B and a single delivery channel (e.g. in-app list); email/push mechanism TBD and can be placeholder.

### 5.3 In-app experience

- **Placement:** Notifications or “Up next” visible from Dashboard and/or a dedicated Notifications or “Due” screen/menu item. Content: session name, date/time, link to start session (e.g. to Play with that calendar entry).
- **Refresh:** When player loads Dashboard (or Notifications page), fetch next session(s) and render. No requirement for real-time push in P8 unless Option B and push are in scope.

### 5.4 GO realisation

- **If Option A:** “GO” is the existing app logic that calls getNextSessionForPlayer and displays result; no separate backend service.
- **If Option B:** “GO” is a scheduled job (e.g. Supabase Edge Function on cron, or app backend) that: (1) finds players with upcoming planned sessions in the next 24–48 hours (or configurable window), (2) inserts or updates rows in player_notifications. Optional: trigger email or push from same rows; mechanism and template TBD.

---

## 6. Admin cohort and competition reports

### 6.1 Cohort report

- **Purpose:** Give admins a view of cohort performance: who is in the cohort, completion of sessions, session scores, TR (and optionally TR delta over period).
- **Data:** Cohort members (players); for each, list calendar entries and status (planned/completed); session_runs (session_score, completed_at); players.training_rating. Aggregates: e.g. completion rate (completed / total planned), average session score per player, TR distribution.
- **UI:** Admin page (e.g. “Cohort report” or “Cohort performance” from cohort detail). Table or cards: player, sessions completed, completion %, average session score, current TR. Optional: filter by date range, export (CSV/PDF) if in scope.
- **Data layer:** Functions such as getCohortPerformanceReport(client, cohortId, options?) returning structured data (player list with aggregates). No raw SQL in UI; all via packages/data.

### 6.2 Competition report

- **Purpose:** View competition and match data: list competitions, for each competition list matches (players, result, MR), optional standings or summary.
- **Data:** competitions; matches (player_id, opponent_id, result, match_rating, etc.). Aggregates: matches per player, wins/losses, average MR, or simple table of match results.
- **UI:** Admin page for “Competition report” or per-competition “Matches / results”. Table of matches; optional summary by player. Export optional.
- **Data layer:** getCompetitionMatches(client, competitionId), getCompetitionReport(client, competitionId) or listCompetitionsWithSummary(client); all via data layer.

### 6.3 Constraints

- **FR-12.3, NFR-5:** View cohort performance and competition data via admin UI and data-access layer only; no raw DB access or ad-hoc SQL in UI.

---

## 7. Indexing and archiving for dart_scores

### 7.1 Query patterns

- **By player and session run:** Fetch darts for a given training_id (session_run) for display in analyzer or replay. Index: (training_id), and optionally (player_id, training_id).
- **By player and time:** “All darts for player in last N months” for analytics or archiving. Index: (player_id, created_at) or (player_id, training_id) with session_runs joined for date.
- **By time (global):** Archiving or partitioning by date. Index or partition key: created_at (or derived from session_run completed_at).

### 7.2 Indexing (minimum for P8)

- Add (or document) indexes to support:
  - Lookup by training_id: `CREATE INDEX idx_dart_scores_training_id ON dart_scores(training_id);`
  - Lookup by player_id (and optionally time): `CREATE INDEX idx_dart_scores_player_id ON dart_scores(player_id);` and, if needed, `(player_id, created_at)` for time-bounded queries.
- Migration in P8; verify no regression on insert performance (indexes are write-cost trade-off).

### 7.3 Archiving and partitioning (strategy)

- **NFR-10:** “consider partitioning or archiving strategy for analytics; MVP can start with single table and index strategy.”
- **P8 options:**
  - **Index only:** Rely on indexes; document that archiving can be added later when row count or query SLAs justify it. Acceptable for P8 if product agrees.
  - **Partitioning:** Partition dart_scores by month (or year) on created_at (or a date derived from session_runs). Requires migration and possibly application changes to query the correct partition(s). Document partition key and retention (e.g. keep 12 months hot).
  - **Archiving:** Periodic job that moves rows older than N months to dart_scores_archive (same schema). Hot queries only hit dart_scores; analytics or “full history” can hit archive. Document archive policy and any restore need.
- **Recommendation:** Implement indexing in P8; document archiving/partitioning decision (implement if scale is already a concern; otherwise document “index only for P8; archiving in future”).

### 7.4 Summary tables (optional)

- If analytics or reports need aggregates over darts (e.g. “player’s 3DA by month”) without scanning dart_scores, consider materialised views or summary tables updated on a schedule. Optional for P8; document if deferred.

---

## 8. Remaining tier features (Gold and Platinum analyzer)

### 8.1 Gold tier

Per Platform and FR-10.2 (“As platinum without AI”):

- **Full session history with darts:** For each completed session in session history, allow drill-down to dart-level data: list of darts (target, actual, hit/miss) per routine/round. Data: existing dart_scores by training_id; expose via data layer (e.g. getDartScoresForSessionRun(client, trainingId)) with RLS so only own data. UI: expandable row or “View darts” for a session run.
- **Session trends — 90 days and all-time:** Extend trend options to 90-day and all-time windows (in addition to 30 days). getTrendForPlayer(client, playerId, { type, windowDays: 90 }) and windowDays large or null for “all time”. Gate 90/all-time to Gold (and Platinum); Free stays last-30 only.
- **Match history:** List of player’s matches (opponent, date, result, MR, format). Data: matches where player_id = current player; existing P7 data layer. UI: table or list on Analyzer page for Gold/Platinum.

### 8.2 Platinum tier

Per FR-10.3:

- **Same as Gold:** PR, TR, MR display (if not already on Dashboard); full session history with darts; session trends 30/90/all-time; match history.
- **AI analysis:** “AI engine powered analysis providing insight into focus areas”. Deferred implementation: show “AI insights — Coming soon” or placeholder. No requirement to integrate a real AI model in P8 unless product explicitly scopes it.

### 8.3 Tier gating

- **Data layer:** getDartScoresForSessionRun (or equivalent) must enforce RLS; only Gold/Platinum may call or only return data when player tier is Gold/Platinum. Alternatively, return data and let UI gate; document that dart-level data must not be exposed to Free in UI.
- **UI:** Use existing tier helpers (e.g. getEffectiveTier, isPremiumTier). Show “View darts”, “90 days”, “All time”, “Match history” only for Gold/Platinum; show “AI insights — Coming soon” for Platinum only.

---

## 9. Performance and UX polish

### 9.1 Performance (NFR-9)

- **Dashboard and session list:** Load in &lt; 3s on typical connection. Ensure dashboard query set (player, cohort, next session, recent scores) is minimal and indexed; avoid N+1; consider single batched or compound query where appropriate.
- **Dart submission:** Feel immediate (optimistic UI or fast round-trip). GE: insert dart_scores (and any routine/session score update) should be quick; consider debouncing or batching only if needed for scale; do not introduce noticeable delay for single-dart entry.
- **Analyzer:** Session history and trend queries (getSessionHistoryForPlayer, getTrendForPlayer) should be bounded (limit, window). Add indexes as in §7; monitor slow queries in development.

### 9.2 UX and accessibility (NFR-6)

- **Mobile-first, portrait-first:** Ensure GE, Dashboard, and Analyzer layouts work on small screens; tap targets ≥ 44px; readable font sizes and contrast.
- **Errors:** Clear, actionable messages; no silent failures (NFR-8). Loading states for async operations (skeleton or spinner).
- **Consistency:** Navigation, buttons, and terminology consistent across Play, Dashboard, Analyzer, Admin. Any P8-specific polish: align with existing patterns.

### 9.3 Admin

- **Reports:** Cohort and competition report pages load in reasonable time; use data layer aggregates; paginate or limit if result sets are large.

---

## 10. Summary checklist

- [ ] **Voice:** GE supports voice outcome input (hit/miss or target); manual primary; fallback and discovery; document browser/API and accessibility.
- [ ] **Notifications:** At least in-app “upcoming session” (derived from next session or from notifications table); content and placement defined; GO realisation documented.
- [ ] **Admin cohort report:** Data layer and UI for cohort performance (completion, session scores, TR); no raw DB.
- [ ] **Admin competition report:** Data layer and UI for competition matches/results; no raw DB.
- [ ] **dart_scores:** Indexes added and documented; archiving/partitioning decision documented (and implemented if in scope).
- [ ] **Gold analyzer:** Full session history with darts; trends 90 days and all-time; match history; tier gating.
- [ ] **Platinum analyzer:** Same as Gold; AI placeholder or “Coming soon”.
- [ ] **Performance:** Dashboard and session list &lt; 3s; dart submission immediate; indexes and queries reviewed.
- [ ] **UX polish:** Accessibility and consistency; error and loading states.

---

**End of P8 Domain Document**
