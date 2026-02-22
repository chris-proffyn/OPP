# ITA DOMAIN

An ITA is an **Initial Training Assessment**.

The ITA is the first session each player must complete when joining the OPP platform. Players cannot start other training or schedules until they have completed their ITA.

**No expected level of performance.** The ITA is an initial assessment: there is no prior level or target. The player simply follows the session plan (routines and routine steps) and records their darts (hit/miss or segment). **At completion**, OPP evaluates the player’s performance from the recorded dart data and assigns a **Baseline Rating (BR)** and **initial Training Rating (TR)**. No comparison to level requirements or expected hits is used for the ITA evaluation.

If a player attempts to begin a training session without having completed ITA, the system directs them to the ITA game.

Add a button to the player profile screen "Complete ITA", enabled when the player has not completed ITA (e.g. `ita_completed_at` is null).

When the ITA is completed, the player’s ITA score is stored (e.g. in `players.ita_score` and `players.ita_completed_at`), and **BR** and **TR** are set from the evaluated ITA score (e.g. `baseline_rating` and `training_rating`).

---

## ITA session availability (how the player reaches the ITA game)

**Chosen approach: Option A — Cohort/schedule includes ITA.**

- The ITA is a specific session whose name is “ITA” or “Initial Training Assessment” (case-insensitive; see `isITASession` in `@opp/data`).
- The admin creates a schedule that includes a session with that name and assigns players to a cohort using that schedule. When the calendar is generated, each player gets a calendar entry for the ITA session.
- “Complete ITA” (Profile) and “direct to ITA” (e.g. from `/play`) navigate to `/play/ita`, which resolves the player’s ITA calendar entry via `getITACalendarEntryForPlayer(client, playerId)` and redirects to `/play/session/:calendarId`. If no ITA entry exists, the app shows: “Your coach needs to assign the Initial Training Assessment. Contact them or try again later.”
- There is no “get or create” ITA calendar entry; the player must be in a cohort with a schedule that includes the ITA session. Future work (e.g. auto-create ITA calendar for new players) should stay consistent with this.
- **Player has no cohort:** If the player is not in any cohort (or their cohort’s schedule has no ITA session), they will have no ITA calendar entry. The app shows: “Your coach needs to assign the Initial Training Assessment. Contact them or try again later.” Future work could detect “no cohort” and show a tailored message (e.g. “Join a cohort to get your ITA”).

---

## ITA Update (OPP_ITA_UPDATE_DOMAIN)

As of the ITA Update, ITA also lives **outside** the cohort/schedule domain: a global ITA calendar exists, and players can self-assign via `getOrCreateITACalendarEntryForPlayer`. “Complete ITA” and “direct to ITA” use get-or-create first, so players can start ITA without being in a cohort. See **OPP_ITA_UPDATE_IMPLEMENTATION_CHECKLIST.md** §3.










