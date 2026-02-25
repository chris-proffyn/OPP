# Extra Player Training — Implementation Checklist

Implementation checklist for the behaviour described in **OPP_EXTRA_TRAINING_DOMAIN.md**: (1) **Replay session** — allow players to repeat a completed session with combined session score (average of attempts) and display attempt count; (2) **Free Training** — platinum-only flow to select and play a single routine, with scores stored in `dart_scores` but not counting toward schedule/session.

**Prerequisites:** Existing Play flow: `getAllSessionsForPlayer`, `createSessionRun`, `getSessionRunByPlayerAndCalendar`, session completion and scoring. `session_runs` has `UNIQUE (player_id, calendar_id)`. `dart_scores` and `player_routine_scores` reference `training_id` → `session_runs(id)`. Tier/platinum: `getEffectiveTier(player) === 'platinum'`.

---

## 1. Replay session — data model (multiple runs per calendar)

- [x] **Requirement (domain)** — “Review the data model. It will need to be updated to allow multiple sessions to be executed against the same cohort/schedule.” Today one run per (player_id, calendar_id).
- [x] **Remove single-run constraint** — Allow multiple `session_runs` rows per (player_id, calendar_id). Options:
  - **Option A:** Drop `UNIQUE (player_id, calendar_id)` on `session_runs`. Each “replay” creates a new row. “Resume” uses the latest run (e.g. most recent by `started_at`) for that calendar that is not completed, or latest if all completed when entering from “View”).
  - **Option B:** Keep unique and add a separate `session_run_attempts` or `replay_runs` table linking to a “parent” calendar. Option A is simpler and keeps one table.
- [x] **Migration** — New migration: `ALTER TABLE session_runs DROP CONSTRAINT session_runs_player_id_calendar_id_key` (or equivalent unique constraint name). Add comment that multiple runs per (player, calendar) support replay; “display” session score is derived (e.g. average of completed runs).
- [x] **Index** — Ensure `(player_id, calendar_id)` remains indexed for “list runs for this calendar” (e.g. existing `idx_session_runs_calendar_id` and `idx_session_runs_player_id` may suffice; add composite if needed for `WHERE player_id = ? AND calendar_id = ? ORDER BY started_at DESC`).

---

## 2. Replay session — data layer (create run, list runs, aggregated score)

- [x] **Create run (replay)** — When player chooses “Replay”, create a **new** session run for the same calendar (do not return existing). Ensure `createSessionRun` no longer short-circuits on “existing run”: either always insert and handle unique violation by fetching latest, or introduce `createSessionRunForReplay(client, playerId, calendarId)` that always inserts (no uniqueness check). Document: “First time” and “Replay” both create a new row; “Resume” (incomplete run) continues the same run.
- [x] **Resume vs start vs replay** — Define clearly:
  - **Resume** — There is an incomplete run (completed_at IS NULL) for (player, calendar): use that run (e.g. `getLatestSessionRunByPlayerAndCalendar` that returns latest by started_at, or “incomplete” if any).
  - **Start (first time)** — No run exists: create new run.
  - **Replay** — Player completed at least one run and explicitly chooses “Replay”: create new run, then navigate to session with that run.
- [x] **List runs for calendar** — New (or extended) function: `listSessionRunsByPlayerAndCalendar(client, playerId, calendarId)` → `SessionRun[]` ordered by `started_at DESC`. Used for attempt count and for computing display session score.
- [x] **Attempt count** — Derive attempt count per calendar as `listSessionRunsByPlayerAndCalendar(...).length` (or count of completed runs, depending on product: “times executed” usually means all runs). Expose where session info is needed (§3).
- [x] **Display session score (aggregated)** — For a given (player, calendar), “session score” shown = average of `session_score` over all completed runs (completed_at IS NOT NULL, session_score IS NOT NULL). Implement:
  - Either in `getAllSessionsForPlayer` (or the query that builds session list) by aggregating over `session_runs` per calendar and joining to session list;
  - Or a helper `getAggregatedSessionScoreForPlayerAndCalendar(client, playerId, calendarId): number | null` and call it when building session list / summary.
- [x] **Session history / Analyzer** — Decide whether session history shows “one row per run” (multiple rows per calendar) or “one row per calendar” with aggregated score and attempt count. Domain: “display the number of times a player has executed a session” and “new result combined … average”. So list view likely one row per calendar with “Attempts: N” and “Session score: X% (avg)”. If session history is “per run”, then show attempt number there. Document decision in this checklist.

---

## 3. Replay session — UI: attempt count and “Replay” action

- [x] **Requirement (domain)** — “OPP should display the number of times a player has executed a session. This information should be displayed wherever session information is displayed.”
- [x] **Play landing (list and calendar)** — For each session card, show attempt count (e.g. “Attempts: 2” or “2nd attempt”). Data: extend `SessionWithStatus` (or the payload from `getAllSessionsForPlayer`) with `attempt_count: number` and optionally `aggregated_session_score: number | null`. Ensure backend/query returns these (§2).
- [x] **Session summary / completed view** — Where the player sees a completed session (e.g. `/play/session/:calendarId/summary` or post-completion screen), show attempt count and aggregated score if applicable.
- [x] **Replay entry point** — For a **completed** session, add a “Replay” action (button or link). Location: Play landing card (when status === 'Completed') and/or session summary page. Label: “Replay” (or “Repeat session”).
- [x] **Replay flow** — On “Replay”: (1) Call create new session run for that calendar (e.g. `createSessionRun` or `createSessionRunForReplay`); (2) Navigate to play session with that run. If URL is `/play/session/:calendarId`, pass the new `runId` in location state so PlaySessionPage (or layout) uses that run instead of “latest”; if URL includes runId (e.g. `/play/session/:calendarId/run/:runId`), navigate there. Ensure the game engine loads the run by id when runId is present.
- [x] **Resume behaviour** — When opening a session that has an incomplete run, “Resume” that run (existing behaviour once §2 is in place). When opening a completed session for “View”, show summary with attempt count and no “Replay” inside the summary if desired, or keep “Replay” on the card only.

---

## 4. Replay session — updated session score (average)

- [x] **Requirement (domain)** — “If a player elects to repeat a session, their new result will be combined with the previous one … the new session score will be a combination of the previous and the new one. If they elect to further repeat the session, then the session score will be an average of their session scores.”
- [x] **Storage** — Each run keeps its own `session_score`. No need to overwrite; “display” score = average of all completed runs for that (player, calendar). Implement aggregation in query or helper (§2).
- [x] **Display** — Wherever “session score” is shown for a calendar session (Play list, summary, history), show the averaged value when multiple runs exist, and show attempt count so the user understands it’s an average.

---

## 5. Free Training — data model (runs without calendar)

- [x] **Requirement (domain)** — “Create additional metadata to allow free training data to be stored in the darts table.” Free training = one routine, no schedule; scores in `dart_scores`, not tied to a calendar session.
- [x] **Option A (recommended): extend session_runs** — Add nullable `calendar_id` and a `run_type` (or `source`) column: e.g. `run_type text NOT NULL DEFAULT 'scheduled' CHECK (run_type IN ('scheduled', 'free'))`, and for free runs allow `calendar_id` NULL and add `routine_id uuid NULL REFERENCES routines(id)`. So: scheduled run → calendar_id NOT NULL, run_type = 'scheduled'; free run → calendar_id IS NULL, routine_id NOT NULL, run_type = 'free'. `dart_scores.training_id` still references `session_runs(id)`. No change to `dart_scores` schema; “metadata” is the run’s type and optional routine_id.
- [ ] **Option B:** New table `free_training_runs` with its own id; then `dart_scores` would need to reference either `session_runs` or `free_training_runs` (polymorphic or two nullable FKs). More invasive.
- [x] **Migration** — If Option A: add `run_type text NOT NULL DEFAULT 'scheduled'`, add `routine_id uuid NULL REFERENCES routines(id)`, alter `calendar_id` to allow NULL; add CHECK so (run_type = 'scheduled' AND calendar_id IS NOT NULL) OR (run_type = 'free' AND calendar_id IS NULL AND routine_id IS NOT NULL). Backfill existing rows: run_type = 'scheduled', calendar_id already set. RLS: ensure players can INSERT/SELECT own rows where run_type = 'free' (and existing for scheduled).
- [x] **RLS** — Policies for `session_runs`: existing “own” policies apply; free runs are still “own” by player_id. No new policy needed if insert_own already allows any insert for current player.

---

## 6. Free Training — data layer (create free run, list routines)

- [x] **Create free training run** — New function: `createFreeTrainingRun(client, playerId, routineId): Promise<SessionRun>`. Inserts into `session_runs` with player_id, calendar_id NULL, run_type = 'free', routine_id = routineId, started_at = now(). Returns the new run (id = training_id for dart_scores and player_routine_scores).
- [x] **List routines for player** — Free training page must list routines (read-only). Use existing `listRoutines` if RLS allows player read, or add `listRoutinesForPlayer(client)` that selects routines (id, name, etc.) with steps count or step summary. Routines and routine_steps are already readable by authenticated users (e.g. `routine_steps_select_authenticated`). Ensure routines list is available without admin.
- [x] **Dart scores and routine score** — When player completes a free-training routine, write to `dart_scores` (training_id = free run id) and `player_routine_scores` (one row for that routine and training_id). Same as scheduled flow; no schema change. Exclude free runs from session history and from “schedule” session score aggregates (filter by run_type = 'scheduled' or calendar_id IS NOT NULL where applicable).

---

## 7. Free Training — UI: Play landing and Free Training page

- [x] **Requirement (domain)** — “Feature available for platinum members only. Accessible via the PlayLandingPage. Platinum members will see a button ‘Free Training’. Clicking this button will route to a page that allows the player to select an existing training routine.”
- [x] **Play landing** — Show “Free Training” button only when `getEffectiveTier(player) === 'platinum'`. Place near other Play actions (e.g. “Record match”, “Generate Solo Training Schedule” if present). Link to `/play/free-training` (or chosen route).
- [x] **Route** — Add route for Free Training page (e.g. `/play/free-training`).
- [x] **Free Training page** — “Create a version of the AdminRoutinePage that displays the existing routines.” Content:
  - List of routines (name and any useful summary, e.g. routine type or step count).
  - **View steps** — Option to view routine steps (read-only); can reuse or mirror AdminRoutinePage step list layout.
  - **Play routine** — Option to start the routine (navigate to play flow for that single routine).
- [x] **No admin-only actions** — Hide create/edit/delete; only list, view steps, and play.

---

## 8. Free Training — play flow (single routine)

- [x] **Start free training** — When player chooses “Play” for a routine: (1) Call `createFreeTrainingRun(client, playerId, routineId)`; (2) Navigate to a play experience for that run. Reuse existing routine/step UI (e.g. RoutineStepPage or a dedicated FreeTrainingRoutinePage) so the player sees the same step-by-step input. The run has no calendar/session context; only one routine.
- [x] **Single-routine flow** — Session context: no “session name” from calendar; show “Free Training — [Routine name]”. One routine only: after the last step, complete the run (compute routine score, write player_routine_scores; optionally set session_runs.session_score = that routine score or leave null). Then show a simple “Done” / summary and link back to Free Training list or Play.
- [x] **Score recording** — “A player’s performance in a free training routine will not count towards any schedule or session. It will still be recorded in the dart_scores table.” Implement: all darts and the single routine score are stored with training_id = free run id. Do not update player_calendar or any schedule; exclude free run_type from session history and schedule aggregates (§6).

---

## 9. Free Training — reporting and exclusions

- [x] **Requirement (domain)** — “Apart from a report that directly queries the dart_scores table, this free training data does not need to be reportable.”
- [x] **Session history** — Ensure `listCompletedSessionRunsForPlayer` / `getSessionHistoryForPlayer` and any “sessions list” only include runs where `run_type = 'scheduled'` (or calendar_id IS NOT NULL). So free training runs do not appear in session history.
- [x] **Trends / Analyzer** — Ensure trend and analyzer queries (e.g. `getTrendForPlayer`, session score averages) only include scheduled runs. Filter by run_type or calendar_id IS NOT NULL in session_runs.
- [x] **Direct dart_scores report** — No change required; if an admin or report later queries `dart_scores` (or joins to session_runs), they can include or exclude run_type = 'free' as needed. Document that free training is identifiable by session_runs.run_type = 'free'.

---

## 10. Copy and messaging

- [x] **Replay** — Button/link label: “Replay” (or “Repeat session” per product). Tooltip or short copy: e.g. “Repeat this session; your score will be averaged with previous attempts.”
- [x] **Attempt count** — Label: “Attempts: N” or “Nth attempt” wherever session info is shown.
- [x] **Free Training** — Button on Play: “Free Training”. Page title: “Free Training” or “Practice a routine”. Subcopy: e.g. “Platinum only. Play any routine; scores are saved but don’t count toward your schedule.”
- [x] **Errors** — Replay: handle “failed to create run” (e.g. conflict if unique is still present during transition). Free training: handle “not platinum” (hide button or show “Platinum feature” message), “routine not found”, “failed to start run”.

---

## 11. Summary table

| Requirement (domain) | Current state | Action |
|----------------------|---------------|--------|
| Replay completed session | One run per (player, calendar) | §1–2: Allow multiple runs; create new run on Replay; aggregate score = average |
| Updated session score (average of attempts) | Single session_score per run | §2, §4: Derive display score as avg(completed runs); show attempt count |
| Display attempt count | Not shown | §2–3: Expose attempt count in session list/summary; show in UI |
| Free Training (platinum only) | N/A | §5–8: Data model for free runs; create run without calendar; UI list routines, view steps, play |
| Free training scores in dart_scores | dart_scores tied to session_runs (calendar) | §5–6: session_runs with run_type 'free', calendar_id NULL; training_id still references session_runs |
| Free training not reportable in normal flows | N/A | §9: Exclude run_type = 'free' from session history and trends |

---

## 12. Implementation order (suggested)

1. **§1 + migration** — Data model: allow multiple session_runs per (player, calendar). Drop unique constraint; add comment/index as needed.
2. **§2** — Data layer: create run for replay (always create new when replaying); list runs per calendar; aggregated session score and attempt count; ensure session history/aggregates use correct filters.
3. **§3 + §4** — UI: attempt count on Play cards and summary; “Replay” button and flow (create run, navigate with run context).
4. **§5 + migration** — Free training data model: extend session_runs (run_type, optional calendar_id, optional routine_id); migration + RLS.
5. **§6** — Free training data layer: createFreeTrainingRun; list routines for player; ensure history/trends exclude free runs.
6. **§7** — Free Training page: route, list routines, view steps, “Play” entry. Platinum-only button on Play landing.
7. **§8** — Free training play flow: single-routine run, score recording, “Done” and navigation.
8. **§9** — Confirm all session history and trend queries exclude free runs.
9. **§10** — Copy and error messages.

---

## 13. Out of scope / follow-up

- **Editing or deleting replay runs** — Domain does not require deleting or editing past attempts; can be admin-only or later.
- **Free training in Analyzer** — Domain says free training “does not need to be reportable”; optional future “Free training history” for platinum could list past free runs.
- **Which routines are available for Free Training** — Domain says “existing training routine”; product may restrict to a subset (e.g. by routine_type or tag). Document when decided.
