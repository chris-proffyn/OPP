# Single Player Training — Implementation Checklist

Implementation checklist for the behaviour described in **OPP_SINGLE_PLAYER_TRAINING_DOMAIN.md**: a solo player (no cohort) can generate their own training schedule from Play by selecting a schedule and start date; OPP creates a dedicated cohort and calendar so they can follow that schedule.

**Prerequisites:** Play landing shows scheduled/completed sessions (existing: `getAllSessionsForPlayer`). Player has completed ITA so they have a level (e.g. `training_rating`). Existing data: `cohorts`, `cohort_members`, `schedules`, `calendar`, `player_calendar`; admin-only `createCohort`, `addCohortMember`, `generateCalendarForCohort`, `listSchedules`.

**Key flow:** Play → "Generate Solo Training Schedule" → choose schedule → confirm + start date → OPP creates cohort (name = player nickname + " solo cohort", level from profile, start date from input, schedule from selection), adds player to cohort, generates calendar and player_calendar so sessions appear on Play.

---

## 1. Play landing: button "Generate Solo Training Schedule"

- [x] **Requirement (domain)** — When user clicks Play, system shows their scheduled/completed sessions. Once ITA is completed, this will mainly show the ITA entry. Add a button **"Generate Solo Training Schedule"**.
- [x] **Location** — **PlayLandingPage** (or equivalent Play entry that lists sessions). Place the button so it is visible to players who have completed ITA (solo flow is for players who want to train without a cohort).
- [x] **Visibility** — Show when the player has completed ITA (`hasCompletedITA(player)`). Optionally show only when the player has no current cohort (`getCurrentCohortForPlayer` returns null) so we don’t offer "solo" if they’re already in a cohort; Implemented: shown whenever ITA complete (no cohort check yet).
- [x] **Action** — On click, open the solo schedule flow (§2): Link to `/play/solo/new`.
- [x] **Copy** — Use label **"Generate Solo Training Schedule"** per domain.

---

## 2. Schedule selection and start date

- [x] **Requirement (domain)** — When the user clicks "Generate Solo Training Schedule", OPP displays a **list of schedules** for the player to select from. When the player selects a schedule, OPP asks for **confirmation and a start date**.
- [x] **List schedules** — `listSchedulesForSolo(client)` in `@opp/data` (no admin); RLS `schedules_select_authenticated` already allows read. Added `schedule_entries_select_authenticated` in migration for calendar generation.
- [x] **UI** — PlaySoloNewPage: (1) List of schedules (name); (2) On select → start date picker + confirmation; (3) "Generate schedule" button calls `createSoloTrainingCohort`.
- [x] **Start date** — Required. `input type="date"` with `min={today}`; validated before submit; sent as ISO date string.
- [x] **Confirmation** — Summary: cohort name, schedule name, start date; button "Generate schedule".

---

## 3. Data layer: create solo cohort and calendar

- [x] **Requirement (domain)** — OPP creates a **cohort** for that player with: **Cohort name** = composite of player nickname + " solo cohort"; **Level** = from user profile; **Start date** = from user input; **Schedule** = from user selection. OPP then creates the other elements so the player can follow that schedule (calendar rows, player_calendar entries).
- [x] **Cohort name** — `"${player.nickname ?? 'Player'} solo cohort"` (or agreed format; avoid empty nickname).
- [x] **Level** — From player profile: e.g. `player.training_rating` (or level decade for level_requirements). Use same source as used elsewhere for "player level" (document in checklist).
- [x] **Start date** — From user input (ISO date string); passed in payload.startDate and normalized to YYYY-MM-DD in createSoloTrainingCohort.
- [x] **End date** — start_date + 1 year in createSoloTrainingCohort.
- [x] **Schedule** — From user selection (schedule_id).
- [x] **Create cohort** — Option A implemented: createSoloTrainingCohort in solo-training.ts; RLS in 20260323120000. Either:
  - **Option A** — New function `createSoloTrainingCohort(client, playerId, { scheduleId, startDate })` in `@opp/data` that: (1) gets current player (nickname, level); (2) computes name, level, start_date, end_date; (3) inserts into `cohorts` (requires RLS allowing player to INSERT a cohort for solo use, or use Edge Function / service role); (4) inserts into `cohort_members` for that cohort and playerId; (5) calls same logic as `generateCalendarForCohort` (calendar rows + player_calendar for that cohort). Implement in a way that respects RLS (e.g. new policies for "player can create one cohort with name like '% solo cohort' and add only themselves").
  - **Option B** — Backend/Edge Function (service role): client calls the function with scheduleId + startDate; function creates cohort, adds player, generates calendar. Data layer exposes only a "invoke create solo" client call; no direct cohort insert from client.
- [x] **Generate calendar** — Same logic in createSoloTrainingCohort (calendar rows + player_calendar).
- [x] **Idempotency / limits** — Error message "You may already have a solo cohort" on conflict.

---

## 4. RLS and permissions

- [x] **Cohorts** — Migration 20260323120000: `cohorts_insert_solo` — INSERT when name LIKE '% solo cohort'.
- [x] **Cohort members** — `cohort_members_insert_solo` — INSERT when player_id = current_user_player_id() and cohort_id in solo cohorts.
- [x] **Calendar / player_calendar** — `calendar_insert_solo`, `player_calendar_insert_solo` in same migration.
- [x] **Schedules** — `schedules_select_authenticated` already existed; added `schedule_entries_select_authenticated` for calendar generation.

---

## 5. UI after creation

- [x] **Requirement (domain)** — After OPP creates the cohort and calendar, the player can follow that training schedule.
- [x] **Redirect / refresh** — On success, `navigate('/play', { replace: true })` so sessions list refreshes.
- [x] **Error handling** — submitError state; message shown on page; user stays on form to retry.
- [x] **Success message** — State passed to /play (`soloScheduleCreated`); banner on Play shows "Solo training schedule created. Your sessions are now on Play." and auto-dismisses after 6s.

---

## 6. Copy and messaging

- [x] **Button** — "Generate Solo Training Schedule" on Play (intro link when sessions exist; empty state link + copy when no sessions).
- [x] **Schedule list** — "Choose a schedule" (PlaySoloNewPage).
- [x] **Confirmation** — Summary with cohort name, schedule name, start date; button "Generate schedule".
- [x] **Errors** — submitError shows API message; start date validation: "Start date cannot be in the past."
- [x] **Empty state** — "No sessions. Generate a solo training schedule to get started, or check with your coach if you're in a cohort." with link to Generate Solo Training Schedule.

---

## 7. Summary table

| Requirement (domain)                         | Current state                    | Action |
|---------------------------------------------|----------------------------------|--------|
| Play shows scheduled/completed sessions     | Implemented (getAllSessionsForPlayer) | Confirm; after ITA shows ITA entry |
| Button "Generate Solo Training Schedule"    | Missing                          | §1: Add on PlayLandingPage when ITA done (and optionally no cohort) |
| List schedules for selection                | listSchedules exists; may be admin-only | §2: Expose to player + §4 RLS |
| Confirm + start date                        | Missing                          | §2: UI for start date + confirm |
| Create cohort (name, level, start, schedule)| createCohort admin-only          | §3: New flow (solo API or RLS + createSoloTrainingCohort) |
| Create calendar + player_calendar           | generateCalendarForCohort admin-only | §3: Reuse logic in solo flow |
| Player can follow schedule                 | Yes once calendar + player_calendar exist | §5: Redirect/refresh after create |

---

## 8. Implementation order (suggested)

1. **§3 + §4** — Data and RLS: implement creating a solo cohort and calendar (Option A or B). Ensure schedules are readable by player for §2. This unblocks the UI.
2. **§2** — UI: schedule list, start date picker, confirmation. Call the new create-solo API on confirm.
3. **§1** — Play landing: add "Generate Solo Training Schedule" button; wire to the schedule/confirm flow.
4. **§5** — After create: redirect or refresh; show new sessions on Play.
5. **§6** — Copy and error messages; finalise visibility rules (e.g. only when no current cohort).

---

## 9. Out of scope / follow-up

- **Editing or deleting a solo cohort** — Not in domain; can be a later task (e.g. "Leave solo schedule" or admin-only delete).
- **Multiple solo cohorts** — Domain implies one solo schedule per player; enforce in §3.
- **Which schedules are selectable** — Domain says "list of schedules"; product may restrict to a subset (e.g. "Solo" tag or specific schedule names). Document in §2 when decided.
