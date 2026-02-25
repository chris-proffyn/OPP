# Cohort Management — Implementation Checklist

Implementation checklist for the behaviour described in **OPP_COHORT_MANAGEMENT_DOMAIN.md**: (1) **Cohort status** — DRAFT, PROPOSED, CONFIRMED, LIVE, OVERDUE, COMPLETE with rules for editing and transitions; (2) **Players awaiting assignment** — list of players without a cohort, with player rating; (3) **Bulk assignment** — admin configures naming, size, dates, level proximity, then OPP assigns players and presents for approval; (4) **Cohort fine tuning** — remove players (revert to unassigned), move players between cohorts (draft/proposed only).

**Prerequisites:** Existing `cohorts` (name, level, start_date, end_date, schedule_id, competitions_enabled), `cohort_members`, `calendar`, `player_calendar`. Admin cohort pages: list, new, edit, players, calendar, report. `listCohorts`, `listCohortMembers`, `listPlayers`, cohort CRUD. Player has `training_rating` and/or `player_rating` for “current player rating”.

---

## 1. Cohort status — data model

- [ ] **Requirement (domain)** — “Cohorts can be at different status - indicating their level of maturity. The following status are available: DRAFT, PROPOSED, CONFIRMED, LIVE, OVERDUE, COMPLETE. The current data model will need extending to accommodate cohort_status.”
- [ ] **New column** — Add `cohort_status` (or `status`) to `cohorts`: `text NOT NULL DEFAULT 'draft' CHECK (cohort_status IN ('draft', 'proposed', 'confirmed', 'live', 'overdue', 'complete'))`. Use snake_case in DB; map to UPPERCASE in domain doc as needed. Migration: `ALTER TABLE cohorts ADD COLUMN cohort_status text NOT NULL DEFAULT 'draft' CHECK (...);` with comment.
- [ ] **Backfill** — Existing cohorts: set status from current state (e.g. if member_count > 0 then 'proposed', else 'draft'); or set all to 'draft' / 'proposed' and allow admin to confirm. Document backfill rule in migration.
- [ ] **Types** — Add `CohortStatus` type and `cohort_status` to `Cohort` and `CreateCohortPayload` (optional, default 'draft'), `UpdateCohortPayload` (optional; confirm whether status is admin-only or derived).

---

## 2. Cohort status — semantics and transitions

- [x] **Requirement (domain)** — Draft = just created, no players; Proposed = has players, can edit; Confirmed = approved, no further modifications; Live = start date reached, until all sessions complete; Overdue = end date passed without all sessions complete; Complete = all training sessions completed.
- [x] **DRAFT** — Cohort has no members. Fully editable (name, level, start_date, end_date, schedule_id, competitions_enabled). When first player is assigned → move to PROPOSED (trigger or application logic).
- [x] **PROPOSED** — Cohort has at least one member. Still editable. Admin can “Approve” → move to CONFIRMED. Auto-assignment produces PROPOSED cohorts.
- [x] **CONFIRMED** — Admin has approved. “Prevent any further modifications to the cohort details (e.g. Start date, schedule, etc.).” Edits to name/level/dates/schedule disabled in UI and/or blocked in API. When start_date arrives → move to LIVE (job or on-read).
- [x] **LIVE** — Start date has passed. “Remain at live until all players have completed all the training sessions.” When all player_calendar entries for this cohort’s calendar are status = 'completed' → move to COMPLETE (job or on-read).
- [x] **OVERDUE** — “If the planned Cohort end date (start date + Duration) passes without all the training sessions completing.” So: end_date < today and not all sessions complete → OVERDUE. Requires admin action (document what action: e.g. extend end_date, or mark complete manually; may be follow-up).
- [x] **COMPLETE** — All sessions completed (all player_calendar for cohort’s calendar entries completed). No further transitions.
- [x] **Where to enforce transitions** — **Chosen approach:** (B) DB trigger for DRAFT → PROPOSED on `cohort_members` INSERT (`20260331130000_cohort_status_draft_to_proposed_trigger.sql`). (A) Application layer for PROPOSED → CONFIRMED via `transitionCohortToConfirmed` and for blocking edits when status is confirmed/live/overdue/complete (`updateCohort` validates and rejects name/level/dates/schedule changes). (A+C hybrid) CONFIRMED → LIVE/OVERDUE/COMPLETE: synced **on read** in `getCohortById` via `syncCohortStatus` (dates + player_calendar completion); optional cron can call `syncCohortStatus` per cohort later if list view must stay current without opening each cohort.

---

## 3. Cohort status — data layer and UI display

- [x] **Data layer** — `listCohorts` and `getCohortById` return `cohort_status`. `updateCohort` either: (a) allows status update only for explicit transitions (e.g. proposed → confirmed), or (b) status is read-only and only derived/trigger-updated. Add `transitionCohortToConfirmed(client, cohortId)` if approval is an explicit action. Ensure create cohort sets status = 'draft'.
- [x] **When adding first member** — On insert into `cohort_members`, if cohort was draft, set cohort to proposed (trigger or in `addCohortMember` / bulk-assign flow). Migration or application logic.
- [x] **Admin cohorts list** — Show status column (e.g. “Status: Draft | Proposed | Confirmed | Live | Overdue | Complete”). Filter or sort by status if useful.
- [x] **Admin cohort edit** — When status is CONFIRMED, LIVE, OVERDUE, or COMPLETE: disable editing of name, level, start_date, end_date, schedule_id (read-only or hide form). Show message e.g. “This cohort is confirmed; details cannot be changed.”
- [x] **Approve action** — On cohort detail or list: “Approve” button when status = proposed; on click call transition to confirmed (and persist). Only then lock edits.

---

## 4. Players awaiting cohort assignment — data layer

- [x] **Requirement (domain)** — “We should see a list of players who do not yet have a cohort assigned to them. This list should show the players current player rating to assist in finding them an appropriate cohort.”
- [x] **Definition of “no cohort”** — Players with no row in `cohort_members` (or not in any cohort that is in a “current” state; domain does not say to exclude e.g. complete cohorts, so “no cohort” = no cohort_members row). Confirm: one cohort per player at a time, or can a player be in multiple cohorts? Domain implies one active assignment; existing app may enforce “at most one cohort” in business logic.
- [x] **New function** — `listPlayersWithoutCohort(client): Promise<Player[]>` or `listPlayersAwaitingAssignment(client): Promise<Player[]>` (or return minimal type with id, nickname, player_rating / training_rating). Query: from players where id NOT IN (select player_id from cohort_members). Include player_rating and/or training_rating for display. Order by rating or name. Admin only (requireAdmin).
- [x] **Export** — Export from data package; use in Admin Cohorts page or dedicated “Assign players” view.

---

## 5. Players awaiting cohort assignment — UI

- [x] **Requirement (domain)** — “We should see a list of players who do not yet have a cohort assigned to them … show the players current player rating.”
- [x] **Placement** — Extend AdminCohortsPage (or Admin Cohort section) with a section “Players awaiting cohort assignment”. Domain: “extend this page” (AdminCohortPage = cohorts list).
- [x] **Table/list** — Columns e.g. Player (nickname), Rating (player_rating or training_rating; domain says “current player rating”). Empty state: “All players have been assigned to a cohort.”
- [x] **Link to bulk assignment** — From this section, link or button to “Bulk assign” flow (§6–7).

---

## 6. Bulk assignment — parameters and algorithm

- [x] **Requirement (domain)** — “It should be possible to populate cohorts in bulk. The admin will choose: Cohort naming convention, number of players per cohort, Required full cohort Y/N, Start Date, Duration, Match Level Y/N, Level proximity (numeric). Then click ‘Assign players’. OPP will assign the players to cohorts and present them to the admin for approval.”
- [x] **Parameters** — Define types and validation:
  - **Cohort naming convention** — e.g. prefix + sequence (“Cohort 1”, “Cohort 2”) or template with date (“Mar2026-A”, “Mar2026-B”). Store as string pattern or (prefix, startIndex).
  - **Number of players per cohort** — integer (e.g. 8, 10, 12). Used to split unassigned players into N cohorts of up to that size.
  - **Required full cohort Y/N** — If Y, only create cohorts that are full (last cohort may be smaller if “remainder” allowed; if N, allow partially filled cohorts).
  - **Start date** — date. Applied to all generated cohorts.
  - **Duration** — number of days (or end_date derived: start_date + duration). Cohorts get end_date = start_date + duration.
  - **Match level Y/N** — If Y, group players by skill (training_rating or player_rating) so that each cohort has similar level spread; if N, assign in arbitrary order (e.g. by id or name).
  - **Level proximity** — Numeric: “how close players should be in skill” (e.g. max range within a cohort, or target band width). Used when Match level = Y to cluster players into bands of similar rating.
- [x] **Schedule** — Bulk assignment must assign a schedule to each cohort. Option: single schedule for all bulk-created cohorts (admin selects one schedule in the form), or schedule per cohort (more complex). Document: “one schedule for all” for first version.
- [ ] **Algorithm** — (1) Take list of players without cohort. (2) If Match level Y, sort by rating and group into buckets of size ≤ level_proximity range (or form groups of “players per cohort” with similar rating). (3) If Required full cohort Y, drop any cohort that has fewer than “players per cohort” members (or allow last cohort to be smaller per product). (4) For each group, create a cohort: name from convention, start_date, end_date, schedule_id, status = 'draft' then add members (then status becomes 'proposed'). (5) Return created cohorts and members to UI for “approval” (admin can accept or fine-tune). Do not persist “confirmed” until admin accepts; so either create as proposed and show “Accept” to set confirmed, or create as draft/proposed and “Accept” = transition to confirmed.

---

## 7. Bulk assignment — data layer

- [x] **Bulk assign function** — `bulkAssignPlayersToCohorts(client, params: BulkAssignParams): Promise<BulkAssignResult>`.
  - **BulkAssignParams**: cohort_name_prefix or naming_template, players_per_cohort, required_full_cohort: boolean, start_date, duration_days, match_level: boolean, level_proximity: number, schedule_id. Optionally level_metric: 'training_rating' | 'player_rating'.
  - **BulkAssignResult**: created cohort ids and names, and per-cohort list of player ids (and optionally player details). This is “preview” or “execute”: either (a) function creates cohorts and members and returns result (admin then “Accept” = no further persist, or “Accept” = transition to confirmed), or (b) function returns a preview (cohort names + member lists) and a second function `executeBulkAssign(client, preview)` creates DB rows. Recommend (a) create in one go with status = 'proposed', then admin can fine-tune and click “Approve” to set confirmed.
- [x] **Idempotency** — Bulk assign only considers “players without cohort”; once assigned, they are no longer in the pool. So re-running bulk assign only affects newly unassigned players (or define “replace” mode in a later phase).
- [ ] **Validation** — If no unassigned players, return error. If required_full_cohort and remainder < players_per_cohort, either create one partial cohort (product decision) or skip remainder and return warning.

---

## 8. Bulk assignment — UI

- [x] **Requirement (domain)** — “The admin will then click ‘Assign players’. Based on the input parameters, OPP will assign the players to cohorts and then present them to the admin for approval. Here the admin can accept, or fine tune the cohort members.”
- [x] **Entry point** — From Admin Cohorts page (or “Players awaiting assignment” section): button “Bulk assign” or “Populate cohorts in bulk”.
- [x] **Form** — New page or modal: form fields for Cohort naming convention, Number of players per cohort, Required full cohort (Y/N), Start date, Duration, Match level (Y/N), Level proximity (number). Plus Schedule (dropdown). Submit: “Assign players” or “Generate assignment”.
- [x] **Result view** — After run, show created cohorts with their member lists (names and ratings). Buttons: “Accept” (confirm all → set cohorts to confirmed and maybe redirect to cohort list), “Fine tune” (go to cohort edit / move members §10). Optionally “Discard” to delete the just-created cohorts and revert (if product wants two-phase: preview → accept).
- [x] **Accept** — On “Accept”, call API to transition each cohort to confirmed (or cohorts are already proposed; “Accept” = transition to confirmed). Then redirect to cohorts list or stay on result view with success message.

---

## 9. Cohort size and competition (informational)

- [x] **Requirement (domain)** — “A cohort can theoretically be of any size. Considerations: total number of players requiring a cohort, spread of skills (range of abilities ideally 10–15), when Competition mode is enabled competitions will be arranged within the cohort.” No immediate implementation: document that cohort size and competition format are considerations; validation rules (e.g. max cohort size, or “warn if cohort size not suitable for competition”) can be added as product rules. Level proximity and “match level” (§6) address skill spread.

- [x] **Documented** — Cohort size and competition format are product considerations only; no validation or warnings in code. Skill spread is addressed by Match level and Level proximity in bulk assign (§6). Future product rules may add: max cohort size, or a warning when cohort size is unsuitable for competition. See OPP_COHORT_MANAGEMENT_DOMAIN.md and OPP_COMPETITIONS_DOMAIN.md for context.
---

## 10. Cohort fine tuning — remove and move players

- [x] **Requirement (domain)** — “Cohorts in either draft or proposed statuses can be edited by admins. This includes removing players from the cohort - revert them back to unassigned. Admins can also direct move players from one cohort to another cohort (at an editable status of draft or proposed).”
- [x] **Editable status** — Only DRAFT and PROPOSED cohorts allow: (1) removing a member, (2) adding a member, (3) moving a member to another cohort. CONFIRMED/LIVE/OVERDUE/COMPLETE: no member changes (or document exception e.g. “admin override” for edge cases).
- [x] **Remove from cohort** — Already may exist: remove row from `cohort_members` for (cohort_id, player_id). If cohort had only that player, after remove cohort has 0 members: optionally revert cohort status to DRAFT. Expose in UI: on cohort Players page, “Remove” per member when cohort is draft/proposed. After remove, player appears again in “Players awaiting assignment.”
- [x] **Move player to another cohort** — New: “Move to cohort” action. From cohort A (draft/proposed), select member, choose “Move to cohort” and pick cohort B (draft or proposed). Implementation: delete from A’s cohort_members, insert into B’s cohort_members (same player_id). Validate: B must be draft or proposed; B must not already contain that player. Data layer: `movePlayerToCohort(client, playerId, fromCohortId, toCohortId)`.
- [x] **UI: Remove** — Cohort detail / Players tab: per row, “Remove” button (when status is draft/proposed). Confirm: “Remove [name] from this cohort? They will appear in Players awaiting assignment.”
- [x] **UI: Move** — Cohort detail / Players tab: per row, “Move to cohort” button; opens dropdown or modal listing other cohorts that are draft or proposed; on select, call movePlayerToCohort and refresh.

---

## 11. Status transitions — automatic (LIVE, OVERDUE, COMPLETE)

- [x] **LIVE** — When start_date <= today and status = confirmed, set status = 'live'. Can be: (a) nightly job, (b) on-read (when loading cohort list/detail, recompute and update status), (c) cron Edge Function. Document choice.
- [x] **COMPLETE** — When all calendar entries for the cohort’s calendar have status 'completed' (all players, all sessions), set status = 'complete'. Same options as LIVE (job vs on-read).
- [x] **OVERDUE** — When end_date < today and status = 'live' and not all sessions complete, set status = 'overdue'. “Requires the admin to take action” — document what action (e.g. extend end_date, or mark complete manually; may be a follow-up story). For now, implement status transition only; admin action can be “Edit cohort” to extend end_date (if we allow edit of end_date for overdue) or separate “Resolve overdue” flow.
- [x] **Data layer** — Either add `recomputeCohortStatus(client, cohortId)` used by job or on-read, or dedicated functions `transitionCohortToLive`, etc. Prefer single `recomputeCohortStatus` that sets status from current date and completion state.
- [x] **Documented** — **Chosen approach: on-read.** `syncCohortStatus` (exported as `recomputeCohortStatus`) is the single function: it sets status from current date and player_calendar completion. Called from `getCohortById` so opening a cohort brings status up to date. A nightly job or cron can call `recomputeCohortStatus` for all cohorts if the list view must stay current without opening each. **OVERDUE admin action:** follow-up; for now only the status transition is implemented. Product may add: allow editing end_date for overdue cohorts, or a separate “Resolve overdue” flow.

---

## 12. Copy and errors

- [x] **Status labels** — Draft, Proposed, Confirmed, Live, Overdue, Complete (display in UI).
- [x] **Players awaiting assignment** — Section title: “Players awaiting cohort assignment”. Empty: “All players have been assigned to a cohort.”
- [x] **Bulk assign** — Button: “Bulk assign” or “Populate cohorts in bulk”. Form submit: “Assign players”. Success: “Cohorts created. Review and approve or fine-tune.”
- [x] **Fine tuning** — “Remove from cohort”, “Move to cohort”. Confirmations as above.
- [x] **Errors** — Validate bulk params (e.g. players_per_cohort >= 1, duration >= 1, schedule exists). Handle “no unassigned players”, “failed to create cohorts”, “cannot move: target cohort is not editable”. Do not expose raw DB errors.

---

## 13. Summary table

| Requirement (domain) | Current state | Action |
|----------------------|---------------|--------|
| Cohort status (DRAFT … COMPLETE) | No status column | §1–2: Add cohort_status; define transitions; backfill |
| Draft = no players, fully editable | N/A | §2: Draft; first member → Proposed |
| Proposed = has players, editable; Approve → Confirmed | N/A | §2–3: Proposed; Approve action → Confirmed |
| Confirmed = no further detail edits | N/A | §3: Lock edits in UI/API when status confirmed/live/overdue/complete |
| Live = start date reached until all complete | N/A | §11: Auto transition confirmed → live; live → complete when all sessions done |
| Overdue = end date passed, not all complete | N/A | §11: Auto transition live → overdue; document admin action |
| Players awaiting assignment list | Not shown | §4–5: listPlayersWithoutCohort; UI section with rating |
| Bulk assignment (params + Assign) | N/A | §6–8: Params, algorithm, bulkAssignPlayersToCohorts, form + result + Accept |
| Fine tuning: remove player | Maybe exists | §10: Remove from cohort_members; revert to unassigned; UI when draft/proposed |
| Fine tuning: move player to another cohort | N/A | §10: movePlayerToCohort; UI “Move to cohort” when both cohorts draft/proposed |

---

## 14. Implementation order (suggested)

1. **§1** — Migration: add `cohort_status` to cohorts; backfill; add to types and list/get/update.
2. **§2** — Document status semantics and transitions; implement “first member → proposed” (trigger or in add-member flow).
3. **§3** — Data layer: status in list/get; transitionCohortToConfirmed (or updateCohort status); Admin list show status; Edit page disable edits when not draft/proposed; Approve button.
4. **§4–5** — listPlayersWithoutCohort; Admin Cohorts page section “Players awaiting assignment” with table (nickname, rating).
5. **§6–7** — Bulk assign params and types; algorithm (group by rating if match level, name cohorts, create cohorts + members); bulkAssignPlayersToCohorts.
6. **§8** — Bulk assign UI: form page, result view, Accept / Fine tune.
7. **§10** — Remove member (existing or add); movePlayerToCohort; UI Remove and Move to cohort on cohort Players page when draft/proposed.
8. **§11** — recomputeCohortStatus or job for LIVE/OVERDUE/COMPLETE; run on read or cron.
9. **§12** — Copy and error handling.

---

## 15. Out of scope / follow-up

- **Overdue admin action** — Domain says “requires the admin to take action”; exact action (extend date, mark complete, etc.) can be a follow-up; implement status transition first.
- **Cohort naming convention** — First version can be simple (e.g. “Cohort 1”, “Cohort 2” with configurable prefix). Advanced templates (date-based, schedule-based) later.
- **Multiple cohorts per player** — Domain implies one assignment; if product allows “player in multiple cohorts” later, listPlayersWithoutCohort and bulk logic need review.
- **Competition format and cohort size** — Domain mentions competition format; see OPP_COMPETITIONS_DOMAIN.md; validation of cohort size for competitions can be added when that feature is implemented.
