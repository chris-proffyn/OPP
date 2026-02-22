# OPP ITA — Implementation Checklist

Detailed implementation checklist for the behaviour described in **OPP_ITA_DOMAIN.md**: Initial Training Assessment (ITA) as the first required session, directing players without ITA to the ITA game, profile “Complete ITA” button, and storing ITA score in `baseline_rating`.

**ITA behaviour (OPP_ITA_DOMAIN):** ITA has no expected level of performance; the player follows the session plan (routines/steps). At completion, OPP evaluates performance from raw dart data only and assigns BR and initial TR. Level requirements and expected hits are not used for ITA evaluation.

**Prerequisites:** P5 Training Rating (BR, TR, progression) and existing ITA score logic per **P5_TRAINING_RATING_DOMAIN.md** and **ita-session.ts** / **ita-scoring.ts**. Players table has `baseline_rating`, `ita_score`, `ita_completed_at` (migration `20260219120000_add_players_ita_columns.sql`). `completeITAAndSetBR`, `setBaselineAndTrainingRating`, `setPlayerITACompleted`, and `isITASession` already exist.

---

## 1. Definition of “ITA completed”

- [x] **Single source of truth** — Define when a player “has completed ITA” for UI and routing:
  - **Option A:** `players.ita_completed_at != null` (set by `setPlayerITACompleted` after ITA session). ✓ **Chosen**
  - **Option B:** `players.baseline_rating != null && players.baseline_rating !== 0` (BR set by ITA).
  - **Option C:** Either: `ita_completed_at != null || (baseline_rating != null && baseline_rating !== 0)`.
- [x] **Recommendation:** Use **Option A** (`ita_completed_at != null`) so “Complete ITA” button and “direct to ITA” checks are consistent. Ensure `completeITAAndSetBR` always calls `setPlayerITACompleted` (already does). Document in this checklist.
- [x] **Helper (optional):** Add `hasCompletedITA(player: { ita_completed_at?: string | null; baseline_rating?: number | null })` in app utils or `@opp/data` and use everywhere. Or inline `player.ita_completed_at != null` (and treat `baseline_rating === 0` as “not completed” if product rule is “0 = not set”).
- **Implemented:** “ITA completed” is implemented via `hasCompletedITA(player)` in `@opp/data` (`packages/data/src/ita-session.ts`). App re-exports from `apps/web/src/utils/ita.ts`. Use this helper everywhere for UI and routing.

---

## 2. Profile: “Complete ITA” button

- [x] **Location** — Add a button/link on the **Profile** page (`ProfilePage.tsx`): e.g. “Complete ITA” or “Start Initial Training Assessment”.
- [x] **Visibility / enable rule** — Show the button only when the player **has not** completed ITA: i.e. when `player.ita_completed_at == null` (or when `baseline_rating == null || baseline_rating === 0` if that is the chosen definition). Disabled or hidden once ITA is completed.
- [x] **Action** — On click, navigate the player to the ITA game. Options:
  - **Option A:** Navigate to a dedicated route (e.g. `/play/ita`) that resolves the ITA session and calendar entry (see §4) and then redirects to `/play/session/:calendarId`, or renders the game for that session. ✓ **Implemented:** Profile links to `/play/ita`; `PlayITAPage` loads sessions, finds ITA via `isITASession(session_name)`, redirects to `/play/session/:calendarId`; if no ITA entry, shows “Your coach needs to assign the Initial Training Assessment…”
  - **Option B:** Navigate directly to `/play/session/:calendarId` where `calendarId` is the player’s ITA calendar entry (requires resolving that entry, e.g. from a “get or create ITA calendar entry for player” API).
- [x] **Copy** — Use label “Complete ITA” per domain. Optional short line: “Required before other sessions” or “First-time assessment”.

---

## 3. Direct to ITA when starting a session without ITA

- [x] **When to redirect** — If a player attempts to **begin a session** (or open the Play list) and they **have not** completed ITA, the system must **direct them to the ITA game** instead of the chosen session (or instead of showing the normal play list).
- [x] **Place of check** — Implement in one or both of:
  - **Play landing (`PlayLandingPage`):** When loading `/play`, if `!hasCompletedITA(player)`, redirect to ITA flow (e.g. `/play/ita`) or show a single call-to-action “Complete your Initial Training Assessment” that starts the ITA (no table of other sessions until ITA done). **Implemented:** redirect to `/play/ita`; session list is not loaded for non-ITA-complete players (admins bypass).
  - **Session start (`PlaySessionPage`):** When loading `/play/session/:calendarId`, if `!hasCompletedITA(player)` and the session for `calendarId` is **not** the ITA session, redirect to ITA (e.g. `/play/ita` or the ITA session’s calendar URL) instead of showing the chosen session. **Implemented:** after resolving session name, redirect to `/play/ita` with state message when session is not ITA (admins bypass).
- [x] **Message** — Show a short message when redirecting: e.g. “You need to complete your Initial Training Assessment before other sessions.” **Implemented:** passed via `navigate('/play/ita', { state: { message } })` and displayed on `PlayITAPage` when present.
- [x] **Admin / bypass** — Decide whether admins can skip the ITA requirement (e.g. allow admins to start any session). If yes, guard redirect with “if not admin and !hasCompletedITA”. **Implemented:** both checks use `player.role !== 'admin'` so admins see the play list and can open any session.

---

## 4. ITA session availability (how the player reaches the ITA game)

- [x] **Requirement** — The ITA is a specific session (name “ITA” or “Initial Training Assessment” per `isITASession`). The player needs a **calendar entry** (and thus a session run) for that session to play it via the existing game flow (`/play/session/:calendarId`).
- [x] **Option A — Cohort/schedule includes ITA** — Admin creates a schedule that includes one session named “ITA” (or “Initial Training Assessment”) and assigns players to a cohort that uses that schedule. When the calendar is generated, the player gets a calendar entry for the ITA session. “Complete ITA” and “direct to ITA” then navigate to `/play/session/:calendarId` for that entry. **Implemented:** `getITACalendarEntryForPlayer(client, playerId)` in `@opp/data` (`ita-session.ts`) returns the first `SessionWithStatus` whose session name is ITA (via `isITASession`). `/play/ita` (PlayITAPage) uses it; if null, shows “Your coach needs to assign the Initial Training Assessment. Contact them or try again later.”
- [ ] **Option B — Dedicated ITA route** — Add route `/play/ita`. Page loads, checks ITA not completed, then either: (i) calls an API to “get or create” an ITA calendar entry for the player (e.g. a global ITA session + create calendar entry for player’s cohort or a default cohort), or (ii) looks up existing ITA calendar entry. Then redirect to `/play/session/:calendarId` or render the same game UI for that session. **Not chosen:** we use Option A; route `/play/ita` only looks up existing entry (no get-or-create).
- [x] **Document** — Document the chosen option in this checklist and in OPP_ITA_DOMAIN.md so future work (e.g. “create ITA calendar for new players”) is consistent.

---

## 5. Block schedules until ITA completed

- [x] **Domain rule** — “Players cannot compete in schedules until they have completed their ITA.”
- [x] **Interpretation** — “Schedules” here means the list of sessions (play list) or the ability to start non-ITA sessions. So: do not allow starting (or even showing) **non-ITA** sessions until ITA is done. Allow only the ITA session (and its entry point) until completed.
- [x] **Implementation** — Align with §3:
  - On **Play landing:** If !hasCompletedITA, do not show the full session table; show instead the “Complete ITA” CTA and link/button to the ITA game (or redirect to `/play/ita`). **Done in §3:** non-ITA-complete players are redirected to `/play/ita`, so the session table is never shown.
  - When **resolving ITA calendar entry** (§4), if the player has no ITA calendar entry, show a clear message (e.g. “Your coach needs to assign the Initial Training Assessment. Contact them or try again later.”) and do not show other sessions. **Done in §4:** `PlayITAPage` shows that message when `getITACalendarEntryForPlayer` returns null; other sessions are not shown there.
- [x] **Competitions / matches** — If “compete in schedules” includes competitions or record-match, add a check there: if !hasCompletedITA, block or message “Complete your ITA first” (optional follow-up task). **Implemented:** On `RecordMatchPage`, if !hasCompletedITA(player) and not admin, show “Complete your Initial Training Assessment before recording matches.” with links to Complete ITA, Profile, and Play; form is not shown.

---

## 6. Storing ITA score in baseline_rating

- [x] **Already implemented** — When the ITA session is completed, `completeITAAndSetBR` is called (from `PlaySessionPage` when `isITASession(gameState.sessionName)` and session just finished). It:
  - Derives ITA ratings from the session run (`deriveITARatingsFromSessionRun` → `computeITARatingsFromDartScores`).
  - Computes ITA score (Singles, Doubles, Checkout → `computeITAScore`).
  - Sets `baseline_rating` and `training_rating` via `setBaselineAndTrainingRating(client, playerId, ratings.itaScore)`.
  - Sets `ita_score` and `ita_completed_at` via `setPlayerITACompleted(client, playerId, ratings.itaScore)`.
- [x] **Confirm** — Ensure `completeITAAndSetBR` is **only** called for ITA sessions (no normal progression). Confirmed in `PlaySessionPage`: on session end, `if (isITASession(gameState.sessionName))` → `completeITAAndSetBR`; else → `applyTrainingRatingProgression`. No overlap.
- [x] **Profile display** — Profile already shows “Baseline rating” and “Training rating”; optionally show “ITA score” and “ITA completed at” from `ita_score` / `ita_completed_at` for clarity (or leave as-is if baseline_rating is the only displayed value). **Implemented:** Profile shows “ITA score” and “ITA completed” (date) when present.

---

## 7. ITA score calculation (existing logic)

- [x] **Session shape** — ITA session has exactly three routines: Singles, Doubles, Checkout (identified by name containing “Singles”, “Doubles”, “Checkout”). Implemented in `ita-session.ts` (`getRoutineITAType`, `deriveITARatingsFromSessionRun`).
- [x] **Singles** — 9 darts per step; segment score = (hits/9)×100; Singles rating = average of segment scores. Implemented in `ita-scoring.ts` (`computeSinglesRating`) and used in `computeITARatingsFromDartScores`.
- [x] **Doubles** — Per step, darts to first H (or 6 if none); rating from average. Implemented (`computeDoublesRating`).
- [x] **Checkout** — Steps 1..5 checkouts 56, 39, 29, 23, 15; rating from darts above minimum. Implemented (`computeCheckoutRating`).
- [x] **ITA score** — Weighted combination (e.g. (3×Singles + 2×Doubles + 1×Checkout)/6). Implemented (`computeITAScore`). Result is stored as `baseline_rating` and `ita_score`.
- [x] **Tests** — Ensure `ita-scoring.test.ts` and `ita-session.test.ts` cover edge cases; add or update if domain adds new rules. **Added:** `ita-session.test.ts` — `isITASession` (ITA/Initial Training Assessment case-insensitive, reject others); `hasCompletedITA` (null/undefined, missing/null `ita_completed_at`, set `ita_completed_at`. **ita-scoring.test.ts** — `computeITAScore` edge: all zeros → 0, fractional flooring.

---

## 8. Edge cases and admin

- [x] **Re-assessment** — Domain does not require re-assessment. If product later allows “reset ITA and do again”, that would require: (a) an admin or profile action to clear `ita_completed_at` and optionally `baseline_rating` / `ita_score`, and (b) allowing the “Complete ITA” button to show again. **Left as future work;** no implementation.
- [x] **Admin override** — If admins can start any session for a player (e.g. for testing), ensure the “direct to ITA” redirect is skipped for admin when opening a specific session (optional). **Implemented in §3:** `PlayLandingPage`, `PlaySessionPage`, and `RecordMatchPage` all guard redirect/block with `player.role !== 'admin'`, so admins see the full play list and can open any session (and record matches) without completing ITA.
- [x] **Player has no cohort** — If the player is not in any cohort, they may have no calendar entries. Then “Complete ITA” cannot resolve an ITA calendar entry (Option A). **Decided:** Keep Option A; when no ITA entry is found we show the existing message (“Your coach needs to assign the Initial Training Assessment. Contact them or try again later.”). This covers both “no cohort” and “cohort has no ITA in schedule”. Future work could add a tailored “Join a cohort to get your ITA” if we detect no cohort. Documented in §4 and OPP_ITA_DOMAIN.md.

---

## 9. Summary table

| Requirement (OPP_ITA_DOMAIN) | Current state | Action |
|------------------------------|---------------|--------|
| ITA = first required session | Not enforced in UI | §3, §5: redirect / block until ITA done |
| Direct to ITA when starting without ITA | Not implemented | §3: check on Play landing and/or session start; redirect to ITA |
| “Complete ITA” button on profile | Not present | §2: add button; enable when ITA null/0 |
| Enable button only when ITA null or 0 | — | §2: use `ita_completed_at == null` or BR null/0 |
| Store ITA score in baseline_rating | Done | §6: confirm flow; no change |
| ITA score logic | Exists | §7: verify tests |
| Cannot compete in schedules until ITA | Not enforced | §5: restrict play list to ITA until completed |
| Resolve “ITA game” (calendar/session) | Unclear | §4: define and implement Option A or B |

---

## 10. Implementation order (suggested)

1. **§1** — Define “ITA completed” and optional helper.
2. **§4** — Decide and implement how the player gets an ITA session/calendar entry (Option A or B).
3. **§2** — Add “Complete ITA” on profile; link to ITA game using §4.
4. **§3** — On Play landing (and optionally session start), if !hasCompletedITA, redirect or show only ITA CTA.
5. **§5** — Restrict play list (and optionally competitions) until ITA completed.
6. **§6** — Confirm storage and no double progression; §7 confirm tests; §8 document edge cases.

---

*Reference: docs/OPP_ITA_DOMAIN.md.*
