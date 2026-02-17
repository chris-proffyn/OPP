# P7 — Match Rating and Competition: Domain Document

**Document Type:** Domain specification (Phase 7)  
**Project:** OPP Darts Training Platform  
**Audience:** Delivery team, Cursor  
**Status:** v1.0  
**Authority:** Defines all required behaviour for Phase 7 (Match Rating, OMR, competition sessions, PR). Implementation must conform to this document.

---

## 1. Purpose and scope

### 1.1 Purpose

This document describes **every behaviour required for Phase 7 — Match Rating and competitions** so that:

- Implementers can build without ambiguity.
- Acceptance criteria are testable.
- Scope covers: **match result capture** (legs, 3DA, doubles, opponent, format); **per-match MR** calculation and storage; **OMR** (trimmed weighted rolling average of eligible matches); **competition day and finals-style events** (data model and flows); **PR** combining TR and MR; dashboard “next competition” and MR/PR display; admin competition CRUD. Voice input, full bracket UI, and advanced competition UX are P8 or later.

### 1.2 Phase 7 objectives (from PRD)

- **Match result capture:** Record match metadata and performance metrics (legs won/lost, 3DA, doubles attempted/hit, opponent, format). Stored for MR/OMR calculation.
- **MR (Match Rating):** Per-match performance score (0–100) from opponent strength, result, leg share, 3DA vs baseline, doubles %. Stored with each match.
- **OMR (Overall Match Rating):** Player’s official match-proven level. Trimmed weighted rolling average of last up to 10 eligible matches (trim when n ≥ 6). Format weights and opponent-band rules per **OPP_MATCH_RATING_ENGINE_SPEC.md**.
- **Competition sessions:** “Competition day” (e.g. 5 legs of 501) and “Finals night” style events. Data model and eligibility; match capture and rating updates. Finals-style: groups, round-robin, handicap (e.g. lower-rated starts 451), progression to semis/final—detailed flow can be phased; data model and rating integration in scope.
- **PR (Player Rating):** Hybrid of TR and MR (e.g. weighted average or formula TBD). Stored and displayed; used for grouping and handicap.
- **Dashboard:** Next competition date; PR, TR, MR with trends (MR/PR trend from match history where applicable).
- **Admin:** CRUD for competitions; view competition and match data.

### 1.3 In scope for P7

- **Data model:** Tables for competitions (or competition events), matches (player, opponent, competition/calendar link, format, legs, 3DA, doubles, MR, weight, etc.). Link to calendar/cohort where appropriate.
- **Match capture:** UI or flow to record match result (opponent, format, legs won/lost, 3DA, doubles attempted/hit). Optionally link match to a calendar entry (e.g. “competition day” session).
- **MR calculation:** Compute per-match MR from: opponent strength (PR/OMR at time of match), result (win/loss), leg share, 3DA vs player baseline, doubles %. Store MR and required metrics on match record. Exact formula per **OPP_MATCH_RATING_ENGINE_SPEC.md** or derived spec; if formula is not fully specified, document inputs and a defined placeholder (e.g. simple win/loss + leg share) until finalised.
- **OMR calculation:** After each new eligible match: fetch last up to 10 eligible matches; if n ≥ 6, trim highest and lowest MR; compute weighted mean (format weight × opponent-band weight); write `players.match_rating` (OMR).
- **Eligibility rules:** Best-of-5 or longer; opponent within ±1 PR decade (or reduced weight 0.8); required metrics present; match completed. Configurable parameters (window size, trim threshold, weights).
- **PR calculation:** Combine TR and MR into PR (e.g. weighted average; formula to be confirmed). Write `players.player_rating`. Used for display, grouping, handicap.
- **Competition types:** Competition day (e.g. one calendar session “Competition day - 5 Legs of 501”; players play matches and results are recorded). Finals night: event with groups, round-robin, handicap; match results recorded; data model supports it; full bracket UI can be simplified in P7.
- **Dashboard:** Next competition date (from calendar or competition events); PR, TR, MR with trend (MR/PR trend from recent matches or OMR history).
- **GE / Play:** For a “competition” session type: show match capture flow (opponent selection, format, enter result) instead of routine-based training. Or dedicated “Record match” entry point.
- **Admin:** Create/edit/delete competitions (name, type, cohort, date/calendar link, format); view matches and competition results; no raw DB access.

### 1.4 Out of scope for P7

- **Voice input** for match capture — P8.
- **Full bracket/tournament UI** (drag-and-drop brackets, live draw)—simplified flows acceptable; data model must support future bracket.
- **AI analysis, advanced analyzer features** — P8.
- **Payments / tier unlocking** — Separate workstream; tier gating already in P6.
- **Re-calculation of historical MR/OMR** from changed formulas—document as future admin tool if needed.

---

## 2. References

- **PRODUCT_REQUIREMENTS.md** — FR-7.1–FR-7.4 (MR, OMR, eligibility, Form/Consistency), FR-8.1–FR-8.2 (PR), FR-9.1–FR-9.2 (dashboard, next competition, PR/TR/MR), FR-11.1–FR-11.3 (competitions, match results, finals style), FR-12.2–FR-12.3 (Admin CRUD, view competition data), FR-13.2 (GO triggers MR/PR updates).
- **OPP_MATCH_RATING_ENGINE_SPEC.md** — OMR calculation, eligibility, format weighting, trimmed average, stored metrics, parameters.
- **OPP Platform.md** — Players (MR, PR); Match Rating; Game Engine / Match Engine; Dashboard (next competition, PR/TR/MR).
- **OPP Cohort example.md** — Competition days (D14, D21, D28, D35: “Competition day - 5 Legs of 501”); Finals night (D42: groups of 4, round robin, first to 6 legs, handicap; semis/final).
- **P1_FOUNDATION_DOMAIN.md** — Players table (`match_rating`, `player_rating` columns).
- **P3_COHORTS_CALENDAR_DOMAIN.md** — Calendar, player_calendar; getNextSessionForPlayer; “next competition” can use calendar entries for competition-type sessions or a competition_events table.
- **P4_GAME_ENGINE_DOMAIN.md** — Session run, calendar; distinction between training session (routines) and competition session (match capture).
- **P5_TRAINING_RATING_DOMAIN.md** — TR, level/decade; PR uses TR and MR.
- **P6_DASHBOARD_ANALYZER_DOMAIN.md** — Dashboard layout, PR/TR/MR display (placeholders become real in P7); next competition date.
- **RSD_DATA_MODELLING_GUIDE.md** — Naming, snake_case, migrations, RLS.

---

## 3. Definitions

| Term | Definition |
|------|-------------|
| **Match** | A single head-to-head competitive game between two players (e.g. best-of-5 legs of 501). Produces one MR per player; stored with full metrics. |
| **MR (Match Rating)** | Per-match performance score (0–100). Incorporates opponent strength, result, leg share, 3DA vs baseline, doubles %. Computed and stored with the match. |
| **OMR (Overall Match Rating)** | Player’s official “match-proven” level. Trimmed weighted rolling average of the most recent eligible matches (up to 10). Stored in `players.match_rating`. |
| **PR (Player Rating)** | Hybrid of TR and MR. Used for grouping, handicap, and display. Stored in `players.player_rating`. Exact formula TBD (e.g. weighted average of TR and OMR). |
| **Eligible match** | A match that counts toward OMR: best-of-5 or longer; opponent within ±1 PR decade (or reduced weight); required metrics recorded; completed (no abandonment). |
| **Competition day** | A scheduled session (e.g. “Competition day - 5 Legs of 501”) where players play one or more matches; results recorded for MR/OMR. |
| **Finals night** | A competition event (e.g. round-robin groups, semis, final) with optional handicap; match results recorded; data model supports format and progression. |
| **3DA** | Three-dart average (match level). Required for MR and OMR eligibility. |
| **Decade** | PR/TR level band: 0–9, 10–19, …, 90–99. Used for opponent eligibility (±1 decade) and out-of-band weight (0.8). |
| **Format weight** | Multiplier for match reliability: best-of-5 = 1.0, best-of-7 = 1.1, best-of-9 = 1.2, best-of-11 = 1.3. |
| **Trimmed calculation** | When n ≥ 6 eligible matches: sort by MR, remove highest and lowest, then compute weighted mean of the remainder. |

---

## 4. Data model

### 4.1 Players (existing columns used)

- **`players.match_rating`** (numeric, nullable): OMR. Updated after each new eligible match (trimmed weighted rolling average).
- **`players.player_rating`** (numeric, nullable): PR. Updated when TR or OMR (or match) changes, per PR formula.

No schema change to `players` required if columns already exist (P1); otherwise add in P7 migration.

### 4.2 Competitions (new)

Represents a competition event (e.g. a competition day or finals night) that can be linked to a cohort and optionally to calendar entries.

| Column | Type | Constraints | Description |
|--------|------|--------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Primary key. |
| `name` | `text` | NOT NULL | e.g. "Competition day - 5 Legs", "Finals Night". |
| `cohort_id` | `uuid` | NULLABLE REFERENCES cohorts(id) | Cohort this competition belongs to (if any). |
| `competition_type` | `text` | NOT NULL | e.g. `'competition_day'`, `'finals_night'`. |
| `scheduled_at` | `timestamptz` | NULLABLE | When the competition is (or start time). |
| `format_legs` | `int` | NULLABLE | e.g. 5 for best-of-5. |
| `format_target` | `int` | NULLABLE | e.g. 501. |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Immutable. |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Updated via trigger. |

- **Optional:** Link to `calendar.id` (e.g. `calendar_id`) if one competition maps to one calendar entry; or keep calendar-derived “next competition” from sessions named as competition type. Product choice: competitions table can stand alone and “next competition” is derived from `competitions.scheduled_at` + cohort membership, or from calendar entries whose session is marked as competition type.

### 4.3 Matches (new)

One row per match (one row per player perspective: two rows per match, one for each player, so each player has their own MR and metrics). Alternatively one row per match with two player slots and two MR values; domain allows either. **Recommended:** one row per (match, player) so each player has a record with their own MR, legs_won, legs_lost, 3da, etc. For a two-player match we store two rows (player A vs B, player B vs A) with symmetric opponent reference and each player’s own metrics.

**Option A — One row per player per match (recommended):**

| Column | Type | Constraints | Description |
|--------|------|--------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Primary key. |
| `player_id` | `uuid` | NOT NULL REFERENCES players(id) | Player this row is for. |
| `opponent_id` | `uuid` | NOT NULL REFERENCES players(id) | Opponent. |
| `competition_id` | `uuid` | NULLABLE REFERENCES competitions(id) | Competition event (if any). |
| `calendar_id` | `uuid` | NULLABLE REFERENCES calendar(id) | Calendar session (e.g. competition day) if linked. |
| `played_at` | `timestamptz` | NOT NULL | When the match was played. |
| `format_best_of` | `int` | NOT NULL | e.g. 5, 7, 9, 11. |
| `legs_won` | `int` | NOT NULL | Legs won by this player. |
| `legs_lost` | `int` | NOT NULL | Legs lost by this player. |
| `total_legs` | `int` | NOT NULL | legs_won + legs_lost. |
| `three_dart_avg` | `numeric` | NULLABLE | 3DA for this player in this match. |
| `player_3da_baseline` | `numeric` | NULLABLE | Player’s 3DA baseline at time of match (for MR inputs). |
| `doubles_attempted` | `int` | NULLABLE | Doubles attempted. |
| `doubles_hit` | `int` | NULLABLE | Doubles hit. |
| `doubles_pct` | `numeric` | NULLABLE | Derived: doubles_hit / doubles_attempted (or stored). |
| `opponent_rating_at_match` | `numeric` | NULLABLE | Opponent’s PR (or OMR) at time of match. |
| `rating_difference` | `numeric` | NULLABLE | player_rating - opponent_rating at match. |
| `match_rating` | `numeric` | NOT NULL | Computed MR (0–100) for this player. |
| `weight` | `numeric` | NOT NULL | Format weight × opponent-band weight. |
| `eligible` | `boolean` | NOT NULL DEFAULT true | Whether this match counts toward OMR. |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Immutable. |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Updated via trigger. |

- **Invariants:** `legs_won + legs_lost = total_legs`; `player_id <> opponent_id`; best-of-5 or longer so `format_best_of >= 5`.
- **Eligibility:** Set `eligible = false` if format &lt; 5, opponent out of band and weight applied, or required metrics missing; still store the row for history.

**Option B — One row per match (two players):** Single row with `player_a_id`, `player_b_id`, `legs_a`, `legs_b`, `mr_a`, `mr_b`, etc. Either approach is valid; Option A simplifies “last N matches per player” and per-player MR storage.

### 4.4 Session type (optional)

If competition days are represented as **sessions** on the calendar (e.g. session name “Competition day - 5 Legs of 501”):

- **Option A:** Add `sessions.session_type` or `sessions.kind` (e.g. `'training'`, `'competition'`) so GE/Play can branch: training → routine flow; competition → match capture flow.
- **Option B:** No change to sessions; competition is identified by a dedicated `competitions` table and optional link from calendar (e.g. `calendar.competition_id`) or by convention (session name contains “Competition” or “Finals”). Admin creates competition and optionally links to a calendar entry.

Recommendation: **Competitions table** for admin CRUD and “next competition”; **matches** reference `competition_id` and optionally `calendar_id`. “Next competition” for dashboard: next `competitions.scheduled_at` for player’s cohort, or next calendar entry whose session is competition-type (if session_type or naming convention exists).

### 4.5 RLS and access

- **competitions:** Admins full CRUD; players can read competitions for their cohort (or public read for scheduled competitions).
- **matches:** Players can read/insert their own matches (their `player_id`); opponent can read for display. Admins read all. No delete/update of match after MR is set (or soft-delete only with audit). Insert: player or admin (e.g. admin entering historical result).

---

## 5. Match result capture

### 5.1 When capture happens

- **Competition day:** Player selects “Competition day” session (or “Record match” from Play/Dashboard). Flow: choose opponent (from cohort or list), select format (best-of-5, etc.), enter result: legs won, legs lost, 3DA, doubles attempted, doubles hit. Optionally link to `competition_id` and `calendar_id` if known.
- **Finals night:** Same capture flow per match; competition_id links to finals event. Group/semi/final can be reflected in competition_type or a separate field; bracket state (who advanced) can be P7 minimal (e.g. just match rows) or a simple structure (e.g. `match.round` = 'group' | 'semi' | 'final').

### 5.2 Required inputs

- Player (current user), opponent, format (best-of-N, N ≥ 5).
- Legs won, legs lost (total_legs = legs_won + legs_lost).
- 3DA (match), doubles attempted, doubles hit.
- Played_at (default: now).
- Optional: competition_id, calendar_id.

### 5.3 Derived and stored

- Doubles % = doubles_hit / doubles_attempted (or store and derive).
- Opponent rating at match = opponent’s current PR (or OMR) at time of match.
- Rating difference = player PR − opponent PR.
- Player 3DA baseline: use player’s stored baseline (e.g. from profile or last N matches average); if not in spec, document placeholder (e.g. null or session 3DA baseline from training).
- **MR** = computed from formula (§6).
- **Weight** = format weight × 0.8 if opponent out of ±1 decade, else format weight.
- **Eligible** = true if format ≥ 5, required metrics present, match completed.

After insert: trigger or app logic to **recompute OMR** for both players (last 10 eligible, trim if n ≥ 6, weighted average), then update `players.match_rating`; **recompute PR** for both players and update `players.player_rating`.

---

## 6. Match Rating (MR) calculation

### 6.1 Inputs (per OPP_MATCH_RATING_ENGINE_SPEC and PRD FR-7.1)

- Opponent strength (opponent PR or OMR at time of match).
- Result (win/loss or leg share).
- Leg share (legs won / total legs).
- 3DA vs player baseline (match 3DA vs player’s 3DA baseline).
- Doubles % (doubles hit / doubles attempted).

### 6.2 Output

- MR on 0–100 scale. Stored in `matches.match_rating`.

### 6.3 Formula

The Match Rating spec states that “MR is assumed to already be computed before OMR calculation” and that MR incorporates the inputs above. If **OPP_MATCH_RATING_ENGINE_SPEC.md** or a separate MR formula document does not define the exact equation, implement one of:

- **Placeholder:** MR = f(leg_share, result, opponent_strength) e.g. base 50 + (leg_share − 0.5) × scale + win_bonus + opponent_adjustment, clamped 0–100. Document as “P7 placeholder; to be replaced when MR formula is finalised.”
- **Reference implementation:** If product provides a spreadsheet or pseudocode for MR, implement that exactly and reference it here.

All implementation must be consistent with the spec; no undocumented variations.

---

## 7. OMR calculation

Per **OPP_MATCH_RATING_ENGINE_SPEC.md**:

1. **Eligibility:** Best-of-5 or longer; opponent within ±1 PR decade (or weight 0.8); required metrics present; completed.
2. **Last N:** Take up to 10 most recent eligible matches (by played_at).
3. **n = 1–5:** OMR = weighted average of all: `OMR = (Σ (w_i × MR_i)) / (Σ w_i)`.
4. **n ≥ 6:** Sort by MR ascending; remove one highest, one lowest; then weighted mean of remainder.
5. **Weights:** Format weight (best-of-5 = 1.0, 7 = 1.1, 9 = 1.2, 11 = 1.3); if opponent out of ±1 decade, multiply by 0.8.
6. Write result to `players.match_rating`.

Parameters (window size 10, trim when n ≥ 6, format weights, out-of-band 0.8) should be configurable (e.g. system settings or constants in code with a single source of truth).

---

## 8. Player Rating (PR) calculation

- **FR-8.1:** PR is a hybrid of TR and MR. Exact formula to be confirmed (e.g. weighted average or separate display).
- **P7 implementation:** Define a single formula and document it. Example: `PR = (TR × α + OMR × β) / (α + β)` with α, β configurable (e.g. α = β = 1 for 50/50), or PR = TR when OMR is null and weighted average when both present. Clamp or allow 0–100 (or 1–99 to align with TR).
- Update `players.player_rating` whenever TR or OMR (or a new match) changes for that player.

---

## 9. Eligibility and parameters

### 9.1 Eligibility (repeated for clarity)

A match is **eligible** for OMR if:

1. Format is best-of-5 or longer (`format_best_of >= 5`).
2. Opponent rating is within ±1 PR decade of player **or** match weight is reduced (× 0.8).
3. Required metrics: total legs, legs won, 3DA, doubles attempted, doubles hit; match completed (no abandonment).

### 9.2 Configurable parameters

| Parameter | Recommended | Description |
|-----------|-------------|-------------|
| Rolling window size | 10 | Max number of eligible matches in OMR calculation. |
| Trim threshold | 6 | When n ≥ 6, trim highest and lowest MR. |
| Format weights | 5→1.0, 7→1.1, 9→1.2, 11→1.3 | Per spec. |
| Out-of-band weight | 0.8 | When opponent outside ±1 decade. |
| PR formula weights | e.g. α=β=1 | TR vs OMR weight for PR. |

Store in DB (e.g. `system_settings` or `rating_config`) or in code with clear documentation.

---

## 10. Competition types and flows

### 10.1 Competition day

- **Model:** One competition record (e.g. “Competition day - 5 Legs of 501”) with `competition_type = 'competition_day'`, linked to cohort and scheduled_at. Calendar may have an entry pointing to the same session/concept.
- **Flow:** Players open “Competition day” (from Play or Dashboard). For each match: select opponent, confirm format (e.g. best-of-5), enter legs won/lost, 3DA, doubles. Submit → match row(s) created, MR computed, OMR and PR updated for both players.
- **Cohort example:** “All 5 legs” played; multiple matches per player possible (e.g. round-robin or ad hoc). Each match recorded separately.

### 10.2 Finals night

- **Model:** Competition record with `competition_type = 'finals_night'`. Optional: `round` or `stage` on match (group, semi, final) for reporting.
- **Flow:** Same match capture (opponent, format, legs, 3DA, doubles). Handicap (e.g. lower-rated starts 451) can be displayed in UI but handicap calculation is applied at match time (start scores); result is still legs/3DA/doubles. Progression (top 2 from each group to semis) can be manual or a simple admin “advance” list; full bracket UI is P8.
- **Cohort example:** Two groups of 4, round robin, first to 6 legs; semis first to 6; final first to 6, no handicap. Each match is recorded with same schema.

### 10.3 Next competition (dashboard)

- **Source:** Either (a) next `competitions.scheduled_at` where competition.cohort_id is player’s current cohort, or (b) next calendar entry whose session is competition-type (if session_type or naming convention exists). Prefer one source and document; e.g. “Next competition = next competition row for player’s cohort by scheduled_at”.
- **Display:** “Next competition: [date]” or “—” if none. Link to Play or to competition detail if implemented.

---

## 11. Dashboard and GE integration

### 11.1 Dashboard (P6 → P7)

- **Next competition:** Real date from competitions (or calendar) for current cohort; replace “—” placeholder.
- **PR, TR, MR:** All three from `players`; MR and PR now populated. **Trend:** TR trend already in P6; MR/PR trend can be “improving/declining” from last 3 OMR values or last 3 matches’ MR (Form indicator per spec §8.1 optional).
- **Performance Analyzer:** Match history (list of matches with opponent, date, result, MR) can be shown for Gold/Platinum (or Free if product allows). P6 tier gating applies.

### 11.2 Play / GE

- **Training session:** Unchanged (P4/P5): routines, darts, session score, TR update.
- **Competition session:** If session is competition-type (or user chooses “Record match”): show opponent picker, format, result form (legs, 3DA, doubles). On submit: create match row(s), compute MR, update OMR and PR for both players. Optionally mark player_calendar completed for that calendar entry if one is linked.

---

## 12. Admin

### 12.1 Competition CRUD

- **Create:** Name, type (competition_day / finals_night), cohort, scheduled_at, format (legs, target).
- **Read/Update/Delete:** List competitions; edit; delete (with care: matches may reference competition_id; soft-delete or restrict).
- **View:** List matches for a competition; export or report optional.

### 12.2 Match data

- **View:** All matches (filter by player, cohort, competition, date). No direct DB access; via admin UI and data-access layer.
- **Create (admin):** Allow admin to record a match on behalf of players (e.g. historical or corrected result). Same validations and MR/OMR/PR update.

### 12.3 Rating corrections

- If product requires manual correction of OMR/PR (e.g. after formula change): document as admin-only action (e.g. “Recalculate OMR for player” button that recomputes from matches and writes `players.match_rating`). P7 can defer full tooling; data model and recompute logic support it.

---

## 13. Optional: Form and Consistency (UI)

Per Match Rating spec §8:

- **Form:** Weighted average of last 3 matches’ MR (no trimming). For UI trend only; not stored as official rating.
- **Consistency:** 100 − (10 × std_dev of MR over last 10). Clamp 0–100. For UI only.

Implement if time; otherwise defer to P8.

---

## 14. Summary checklist

- [ ] Migrations: `competitions`, `matches` (and optional session_type or calendar link).
- [ ] RLS: competitions (admin CRUD; players read for cohort); matches (player read/insert own; admin read all).
- [ ] Match capture: UI and data layer; required fields; MR computation and storage.
- [ ] OMR: Last 10 eligible, trim when n ≥ 6, weighted mean; update `players.match_rating`.
- [ ] PR: Formula (e.g. TR/OMR weighted average); update `players.player_rating` when TR or OMR changes.
- [ ] Eligibility: Format ≥ 5, opponent band or weight 0.8, metrics present, completed.
- [ ] Dashboard: Next competition date; PR, TR, MR (and optional MR/PR trend).
- [ ] GE/Play: Competition session or “Record match” flow; opponent, format, result → match + MR/OMR/PR update.
- [ ] Admin: Competition CRUD; view matches and competition data.
- [ ] Parameters: Configurable or documented constants for OMR window, trim, weights, PR formula.

---

**End of P7 Domain Document**
