# ITA UPDATE DOMAIN

This document updates the behaviour described in **OPP_ITA_DOMAIN.md**.

The ITA will now live **outside** the normal cohort–schedule–routine domain. Schedules will no longer contain an ITA session. Instead, an ITA is the **first activity** players complete on the platform.

**ITA as initial assessment:** There is no expected level of performance. The player follows the session plan (routines and routine steps) and records their darts. **At completion**, OPP evaluates performance from the recorded dart data and assigns **BR** and **initial TR**. See OPP_ITA_DOMAIN.md.

Upon login, players are taken to their home dashboard. If a player has not completed an ITA, display a button on the home screen **"Complete ITA"**.

If a player clicks the Play top navigation button and they have not completed an ITA, display a message that they must complete their ITA before they can start training, then route them to the ITA session.

**Implementation (see OPP_ITA_UPDATE_IMPLEMENTATION_CHECKLIST §3):** A global ITA calendar is created by migration; players get-or-create their ITA calendar entry via `getOrCreateITACalendarEntryForPlayer` when they open "Complete ITA" or `/play/ita`, then are redirected to `/play/session/:calendarId`. No cohort or schedule assignment is required.

An ITA session may consist of routines with routine_types SS, SD, ST, and optionally C (checkout). No particular combination is required; evaluation uses whatever types are present.
