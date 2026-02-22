# OPP ITA Update — Implementation Checklist

Implementation checklist for the behaviour described in **OPP_ITA_UPDATE_DOMAIN.md**: ITA moves **outside** the normal cohort–schedule–routine domain; schedules no longer contain an ITA session; ITA is the first activity players complete on the platform, with a “Complete ITA” button on the home screen and a clear message when opening Play without ITA.

**Prerequisites:** Existing ITA implementation per **OPP_ITA_IMPLEMENTATION_CHECKLIST.md** (definition of “ITA completed”, `hasCompletedITA`, Profile “Complete ITA” button, `/play/ita`, redirect from Play when !hasCompletedITA, storage in `baseline_rating`). Players table has `baseline_rating`, `ita_score`, `ita_completed_at`. ITA score logic in `ita-session.ts` / `ita-scoring.ts` is unchanged.

**Key change:** ITA is no longer part of cohort schedules. The system must provide a way for any player to start and complete the ITA **without** requiring an ITA calendar entry from a schedule. ITA remains an initial assessment: no expected level; evaluation from raw dart data at completion; BR and initial TR assigned then (see OPP_ITA_DOMAIN.md).

---

## 1. Home dashboard: “Complete ITA” when ITA not completed

- [x] **Requirement (OPP_ITA_UPDATE_DOMAIN)** — Upon login, players are taken to their home dashboard. If a player has not completed an ITA, display a button on the home screen “Complete ITA”.
- [x] **Location** — Add a prominent “Complete ITA” button or call-to-action on **HomePage** (e.g. top of dashboard content, or a banner above “Up next” / ratings). **Implemented:** Section at top of dashboard (below h1), bordered, with “Complete ITA” link and short line.
- [x] **Visibility** — Show only when `!hasCompletedITA(player)` (and optionally hide or downplay for admins if desired; document). **Implemented:** Shown for all players who have not completed ITA (admins see it too).
- [x] **Action** — On click, navigate to the ITA flow (e.g. `/play/ita` or the new standalone ITA entry point from §3). Reuse existing route or new flow as decided in §3. **Implemented:** Links to `/play/ita`.
- [x] **Copy** — Use label “Complete ITA” per domain. Optional short line: “First activity on the platform” or “Required before training”. **Implemented:** “Complete ITA” + “Required before training”.

---

## 2. Play navigation: message and route to ITA when not completed

- [x] **Requirement (OPP_ITA_UPDATE_DOMAIN)** — If a player clicks the Play top navigation button and they haven’t completed an ITA, display a message that informs them they must complete their ITA before they can start training, then route them to the ITA session.
- [x] **Current behaviour** — Already: non-ITA-complete players who open `/play` are redirected to `/play/ita`; from `/play/session/:id` (non-ITA) they are redirected to `/play/ita` with a state message. **Confirmed:** both redirects now pass the domain message in state; PlayITAPage shows it (or the same message by default).
- [x] **Message** — Ensure the message is clear and matches the domain: e.g. “You must complete your Initial Training Assessment before you can start training.” **Implemented:** `PLAY_MUST_COMPLETE_ITA_MESSAGE` in `apps/web/src/utils/ita.ts`; `PlayLandingPage` and `PlaySessionPage` pass it in `navigate(…, { state: { message } })`; `PlayITAPage` displays it (uses as default when no state so the message always appears on the ITA page).
- [x] **No change to admin bypass** — Admins continue to skip the redirect and can use Play as today (optional; document). **No change:** existing `player.role !== 'admin'` guards in PlayLandingPage and PlaySessionPage unchanged.

---

## 3. ITA session availability (ITA outside cohort/schedule)

- [x] **Requirement** — Schedules will **no longer** contain an ITA session. ITA will be the first activity players complete on the platform, **outside** the normal cohort–session–routine domain. The app must allow a player to start and complete the ITA **without** needing an ITA calendar entry from a cohort schedule.
- [x] **Options** — Choose and implement one:
  - **Option A — Global ITA session + get-or-create entry:** ✓ **Implemented.** Migration `20260315120000_ita_global_calendar.sql` creates: session “ITA” (if missing), schedule “ITA Schedule”, cohort “ITA”, one calendar row. RLS allows players to read that calendar and to INSERT into `player_calendar` for it (self-assign). `getOrCreateITACalendarEntryForPlayer(client, playerId)` in `@opp/data` (ita-session.ts): tries existing cohort-based ITA first, then gets global ITA calendar id, upserts `player_calendar`, returns `SessionWithStatus`. PlayITAPage uses it and redirects to `/play/session/:calendarId`.
  - **Option B — Dedicated ITA route and run:** Not chosen.
- [x] **Implementation** — `getOrCreateITACalendarEntryForPlayer` in `packages/data/src/ita-session.ts`; `getGlobalITACalendarId` in `packages/data/src/calendar.ts`. PlayITAPage calls get-or-create; still uses `getITACalendarEntryForPlayer` internally (first try) for backward compatibility when player already has ITA from a cohort.
- [x] **Fallback message** — When get-or-create returns null or errors, PlayITAPage shows “Something went wrong. Try again from the dashboard.” with links to Dashboard, Play, Profile. No “coach must assign” message.
- [x] **Document** — Documented in this checklist; see OPP_ITA_DOMAIN.md / OPP_ITA_UPDATE_DOMAIN.md for product context.

---

## 4. Profile “Complete ITA” button (retain or adjust)

- [x] **Decision** — Keep the “Complete ITA” button on the **Profile** page when !hasCompletedITA, or remove it in favour of the home-screen CTA only. **Decision:** Keep Profile button for consistency (same action: navigate to ITA flow).
- [x] **Implementation** — If keeping: no change. If removing: remove the block on ProfilePage that shows “Complete ITA” when !hasCompletedITA and ensure home + Play flows are the only entry points. **No change:** ProfilePage already shows “Complete ITA” + “Required before other sessions” when !hasCompletedITA(player), linking to `/play/ita`; retained alongside the home dashboard CTA.

---

## 5. Data and backend: ITA not in schedules

- [x] **Schedules** — Schedules will no longer contain an ITA session. This is a **product/admin** rule: when creating or editing schedules, the UI or process should not add “ITA” as a session in a schedule. **Documented** here. **Admin guidance:** On `AdminScheduleEditPage` (edit schedule entries), added a short line: “ITA is no longer part of schedules; players complete ITA from the home screen.”
- [x] **Existing cohort calendars** — If some cohorts already have calendar entries for an “ITA” session from the old model, decide: (a) leave them as-is (they can still be used for existing players who haven’t completed ITA), or (b) migrate or hide them. **Decision:** Leave as-is (a). `getOrCreateITACalendarEntryForPlayer` tries cohort-based ITA first, so existing ITA calendar entries continue to work; no migration.
- [x] **getITACalendarEntryForPlayer** — Current implementation returns the first calendar entry whose session name is ITA (from the player’s cohort calendar). After §3, the primary path uses `getOrCreateITACalendarEntryForPlayer`, which calls `getITACalendarEntryForPlayer` first for backward compatibility. **Kept** for legacy/cohort-based ITA; no deprecation.

---

## 6. Copy and messaging

- [x] **Home** — “Complete ITA” button and any short line (e.g. “First activity on the platform” / “Required before training”) per §1. **Done in §1:** HomePage shows “Complete ITA” + “Required before training”.
- [x] **Play when !hasCompletedITA** — Message: “You must complete your Initial Training Assessment before you can start training.” (or equivalent) then route to ITA. **Done in §2:** `PLAY_MUST_COMPLETE_ITA_MESSAGE` in `apps/web/src/utils/ita.ts`; passed in redirect state and shown on PlayITAPage.
- [x] **No coach-assigned message** — When ITA is outside schedules, avoid implying the coach must assign ITA. **Done in §3:** PlayITAPage no-ita and error states show “Something went wrong. Try again from the dashboard.” with links to Dashboard, Play, Profile; no “coach needs to assign” copy.

---

## 7. Summary table

| Requirement (OPP_ITA_UPDATE_DOMAIN) | Current state | Action |
|--------------------------------------|---------------|--------|
| ITA lives outside cohort/schedule | ITA is currently resolved from cohort calendar (getITACalendarEntryForPlayer) | §3: Implement standalone ITA entry (get-or-create or dedicated flow) |
| Schedules do not contain ITA | Schedules may still include ITA session | §5: Document; optionally admin guidance |
| Upon login → home; show “Complete ITA” if !ITA | Home has no ITA CTA | §1: Add “Complete ITA” on HomePage when !hasCompletedITA |
| Play without ITA → message then route to ITA | Redirect to /play/ita and message via state | §2: Confirm message and routing; adjust copy if needed |
| Route to ITA session | /play/ita resolves calendar entry (cohort-based) | §3: New resolution so ITA works without cohort |

---

## 8. Implementation order (suggested)

1. **§3** — Define and implement how the player reaches the ITA game when ITA is outside schedules (get-or-create or dedicated run). This unblocks all other entry points.
2. **§1** — Add “Complete ITA” on the home dashboard when !hasCompletedITA; link to `/play/ita` (or new ITA entry).
3. **§2** — Confirm Play redirect and message; update copy so it clearly says “must complete ITA before you can start training” and route to ITA.
4. **§4** — Decide keep/remove Profile “Complete ITA”; implement.
5. **§5** — Document that schedules no longer contain ITA; optional admin guidance.
6. **§6** — Review all copy and replace “coach must assign” messaging where appropriate.
