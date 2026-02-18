# OPP — Product Requirements Document (PRD)

**Document Type:** Product Requirements  
**Project:** OPP Darts Training Platform  
**Audience:** Delivery team, Cursor, stakeholders  
**Status:** v1.1  
**Authority:** This document is mandatory reading before planning or feature work. It overrides generic guidance when explicitly required (see `.cursorrules`).

---

## 1. Purpose and scope of this document

This PRD defines **what the OPP project must deliver** at a level of detail sufficient to:

- Drive a **comprehensive, high-level development plan** (phases, capabilities, dependencies).
- Align all delivery (design, data, backend, frontend, admin) to a single product definition.
- Serve as the **authoritative product reference** for Cursor and the delivery team.

It **references** (and does not replace) the following OPP-specific documents, which contain detailed specs and examples:

| Document | Purpose |
|----------|--------|
| **OPP Darts Training Platform - Product Brief.md** | Vision, community, culture, tiered membership, GTM phases. |
| **OPP Platform.md** | Data model (tables, entities), Game Engine behaviour, Dashboard, Performance Analyzer, Admin Portal scope. |
| **OPP_TRAINING_RATING_ENGINE_SPEC_v2.md** | Training Rating (TR), Baseline Rating (BR), ITA, scoring, level requirements, progression logic. |
| **OPP_MATCH_RATING_ENGINE_SPEC.md** | Match Rating (MR), Overall Match Rating (OMR), eligibility, weighting, trimmed rolling average. |
| **OPP Cohort example.md** | Example cohort schedule (Beginner Daily, 42 days, sessions, competition days, finals). |

All implementation must be consistent with these references. Where this PRD summarises or interprets them, the source documents take precedence for detailed behaviour.

---

## 2. Vision and objectives

### 2.1 Vision (from Product Brief)

OPP is a **community-led darts training platform** built around:

- **Structured improvement** — clear path, not open-ended play.
- **Shared standards** — common language (Overload, Pressure, Progress) and measurable progress.
- **Earned progress** — ratings from formal assessment and training, not casual play.
- **Community as the engine** — cohorts, visibility, recognition, accountability.

It is **not** a solo training app; it is a **club you join**. Culture rewards commitment, consistency, and improvement over ego.

### 2.2 Product objectives

1. **Deliver tailored, time-sensitive, structured training** to players in cohorts.
2. **Record performance consistently** (dart, routine, session, match) and use it to drive ratings and trends.
3. **Adapt training** based on progress and assessments (level requirements, TR progression).
4. **Support fair competition** via handicap-style ratings (TR, MR, PR) and ability-based grouping.
5. **Embed community** through cohorts, shared schedules, recognition, and (future) social/channel integration.
6. **Scale via tiers** — free access to core training; paid tiers for ratings, competitions, deeper analysis, coaching.

### 2.3 Success criteria (high level)

- Players can join a cohort, see their schedule, complete sessions, and have performance and ratings updated.
- Ratings (TR, MR, PR) are calculated per published specs and are trustworthy and explainable.
- Admins can configure programmes, cohorts, schedules, sessions, routines, and level requirements.
- Platform is mobile-first, accessible, and secure (RLS, no client-side secrets).
- Foundation supports future phases: competitions, AI analysis, professional content, social integration.

---

## 3. References and authority

- **.cursorrules** — Mandatory reading order, data access rules, testing, UX, admin, stop conditions.
- **RSD_*** docs — Architecture, UX, data modelling, testing, admin, development approach.
- **PROJECT_STATUS_TRACKER.md** — Current phase, in-progress work, completed work, blockers.
- **DELIVERY_TASK_MAP.md** — (When created) Sequencing and high-level task breakdown.

---

## 4. User personas and roles

| Persona / Role | Description | Primary needs |
|----------------|-------------|----------------|
| **Player (member)** | Registered user in a cohort or programme. | Dashboard, schedule, run sessions, input scores (voice/manual), see TR/PR/MR and trends, access performance analysis (tier-dependent). |
| **Cohort member** | Player assigned to a specific cohort. | View cohort, calendar, next session; complete sessions; (future) cohort chat link. |
| **Admin** | Platform operator. | CRUD: players (view), calendars, schedules, sessions, routines, level requirements, cohorts, cohort members, competitions. View cohort and competition performance data. |
| **System / Game Orchestrator (GO)** | Backend/orchestration logic. | Notifications, session orchestration, score recording, rating updates (TR, MR, PR). |

Future: **Competition organiser**, **Coach**, **Professional face** (content and standards) — out of initial scope but architecture must not block them.

---

## 5. Scope: in and out

### 5.1 In scope (for the development plan)

- **Identity and access** — Auth (Supabase Auth), player profile (nickname as display name, email, gender, age range, date joined). No social login required for MVP unless specified.
- **Core data model** — Players, cohorts, cohort_members, schedules, sessions, routines, calendar, player_calendar, level_requirements; dart_scores, session/routine scores; match-related tables for MR/OMR (see OPP Platform + Match Rating spec).
- **Training Rating (TR)** — BR, ITA (Singles, Doubles, Checkout), CR, level requirements, progression logic, session/routine scoring. Full behaviour per **OPP_TRAINING_RATING_ENGINE_SPEC_v2.md**.
- **Match Rating (MR / OMR)** — Per-match MR, eligibility rules, format weighting, trimmed rolling average. Full behaviour per **OPP_MATCH_RATING_ENGINE_SPEC.md**.
- **Player Rating (PR)** — Combined metric from TR and MR (definition to be confirmed; referenced in Platform).
- **Game Engine (GE)** — Orchestration: show available/missed sessions, guide player through session → routines → tasks, record darts, compute routine/session scores, update TR (and MR on competition sessions). Voice + manual score input as per Platform.
- **Player Dashboard** — Name, avatar, cohort, next session, next competition, PR/TR/MR with trends, link to performance analyzer; optional cohort ranking (feature flag).
- **Performance Analyzer** — Tier-dependent: Free (TR, basic session history, basic trends); Gold (as Free + more); Platinum (full history, full trends, match history, AI analysis). Per Platform.
- **Admin Portal** — CRUD for calendars, schedules, sessions, routines, level requirements, cohorts, cohort members, competitions; view player profiles and performance (cohort, session, competition data). Per OPP Platform.
- **Cohorts and calendar** — Create cohort with schedule and dates; calendar and player_calendar; status (planned, completed).
- **Competitions (foundation)** — Data model and eligibility for competition days and match results; MR/OMR updates. Full competition UX (brackets, finals night) can be phased.
- **Tiered membership (foundation)** — Ability to gate features by tier (e.g. TR only vs PR/MR, basic vs full analyzer). Exact tier definitions and billing out of scope for this PRD; feature flags or role/tier fields in scope.

### 5.2 Out of scope (or explicitly deferred)

- **Social channels** — WhatsApp/Facebook integration, in-app cohort chat (Platform says cohort chat is outside OPP; link only).
- **Payments and subscriptions** — Tier unlocking (e.g. Stripe) is a separate workstream; PRD assumes tier can be represented (e.g. tier flag) for feature gating.
- **AI analysis** — Referenced for Platinum tier; implementation deferred; no AI behaviour specified here.
- **YouTube / professional content** — Hosting and embedding may be linked; not part of core platform build.
- **Mobile native app** — Web-first; mobile app (React Native/Expo) deferred; shared packages (data, utils, ui) prepared for future mobile.

---

## 6. Functional requirements by domain

### 6.1 Identity and players

- **FR-1.1** Users can register and sign in (Supabase Auth). Player record created/linked on first profile completion.
- **FR-1.2** Player profile: nickname (used as display name), full name (optional), email, gender, age range, date joined. Editable by player (within constraints) or admin. Players can manage their own **checkout preferences** (variations per total) via profile → Checkout preferences; stored in `player_checkout_variations`, full CRUD on own rows only.
- **FR-1.3** Player has Baseline Rating (BR), Training Rating (TR), Match Rating (MR), Player Rating (PR). Stored and updated per rating engine specs.
- **FR-1.4** RLS: players can read/update own profile; admins can view all; no PII leakage across players.

### 6.2 Cohorts and membership

- **FR-2.1** Cohorts are created with: name, level (decade), start/end date, schedule reference. Cohort is finite; can be closed.
- **FR-2.2** Players are assigned to at most one cohort at a time; assignment history can be retained for reporting.
- **FR-2.3** Cohort membership drives: which calendar/schedule the player sees, which sessions are “theirs”, and (future) cohort leaderboards and chat link.
- **FR-2.4** Admin can CRUD cohorts and cohort members. Players see their current cohort on dashboard.

### 6.3 Schedules, sessions, routines (training content)

- **FR-3.1** **Schedules** define a programme: name, (DayNo, sessionNo, sessionId) rows. E.g. “Beginner Daily”, “Advanced Daily”.
- **FR-3.2** **Sessions** define a named session and its routines: (sessionId, sessionName, routineNo, routineId). E.g. “Singles (1..10)”, “2D Checkouts”.
- **FR-3.3** **Routines** define tasks: (routineId, routineName, routineDesc, routineNo, target). Task = one target per step (e.g. S20, D16). Smallest unit = one throw (dart).
- **FR-3.4** **Level requirements** define per-decade (e.g. 0–9, 10–19, …) expected hits and darts allowed (e.g. 2/9 for level 20–29). Used for pass/fail and TR progression. Stored and configurable (Admin).
- **FR-3.5** Admin can CRUD schedules, sessions, routines, level requirements. No application code hard-coding routine logic; data-driven from DB.

### 6.4 Calendar and player session assignment

- **FR-4.1** **Calendar** entries: datetime, cohortId, scheduleId, dayNo, sessionNo, sessionId. Defines “what session is scheduled when” for a cohort.
- **FR-4.2** **Player calendar** (or equivalent): links player to calendar entries; status (e.g. planned, completed). Used to show “next session” and “available/missed” sessions.
- **FR-4.3** GE lists available sessions = next scheduled + missed (design choice: whether missed expire after e.g. 1 day to be confirmed).
- **FR-4.4** Completing a session updates player_calendar (or equivalent) to completed and triggers score persistence and rating updates.

### 6.5 Game Engine (GE) and score capture

- **FR-5.1** **Session start** — Player selects session from available list. GE displays session context: player name, PR/TR/MR, cohort, schedule, day/session no, session name, progress (routines done / total).
- **FR-5.2** **Routine execution** — GE shows routine name, step no, target segment; supports voice and manual score input. For each dart: target, actual, hit/miss recorded (dart_scores).
- **FR-5.3** **Round/visit** — Round score = (hits / target hits) × 100. Session score = average of round scores. Stored at routine and session level (player_session_scores, player_routine_scores per Platform).
- **FR-5.4** **Session end** — All darts and derived scores saved; TR progression applied per Training Rating spec (session score % → level change, CR clamp 1–99).
- **FR-5.5** **ITA (Initial Training Assessment)** — Special session type: Singles + Doubles + Checkout routines; ITA score and BR set once per player (or on re-assessment). Logic per Training Rating spec.
- **FR-5.6** **Competition session** — e.g. “Competition day - 5 Legs of 501”. Match results recorded; MR/OMR updated per Match Rating spec. Match metrics: legs, 3DA, doubles attempted/hit, etc.

### 6.6 Training Rating (TR)

- **FR-6.1** BR: default (e.g. 0) or from ITA. ITA = weighted combination of Singles, Doubles, Checkout ratings per spec.
- **FR-6.2** Level requirements table: per-decade target % and hits/darts (e.g. 20–29 → 2/9). Used for pass/fail and progression.
- **FR-6.3** After each training session: session score % → level change (−1 / 0 / +1 / +2 / +3); CR updated and clamped 1–99.
- **FR-6.4** TR = current rating (CR). Displayed on dashboard and in GE; used for cohort grouping and handicap (e.g. finals night).

### 6.7 Match Rating (MR) and OMR

- **FR-7.1** Per-match MR computed from: opponent strength, result, leg share, 3DA vs baseline, doubles %. Stored with match record.
- **FR-7.2** Match eligibility: best-of-5 or longer; opponent within ±1 PR decade (or reduced weight); required metrics present; completed.
- **FR-7.3** OMR = trimmed weighted rolling average of last up to 10 eligible matches (trim highest and lowest when n ≥ 6). Format weights: best-of-5 = 1.0, 1.1, 1.2, 1.3 for longer; out-of-band opponent weight 0.8.
- **FR-7.4** Optional: Form (last 3 matches), Consistency (inverse of std dev over last 10) for UI only.

### 6.8 Player Rating (PR)

- **FR-8.1** PR is a hybrid of TR and MR. Exact formula to be confirmed (e.g. weighted average or separate display). Used for grouping and handicap.
- **FR-8.2** PR (and TR, MR) displayed on dashboard with trend; used in GE and competition eligibility.

### 6.9 Player Dashboard

- **FR-9.1** Shows: name/nickname, avatar, current cohort (name, dates), next training session date, next competition date.
- **FR-9.2** Shows current PR, TR, MR with trend indicators. Optional: cohort ranking (feature flag).
- **FR-9.3** Link to Performance Analyzer. Optional: links to cohort WhatsApp (future).

### 6.10 Performance Analyzer

- **FR-10.1** **Free tier:** TR; basic session history (session/routine scores only); basic trends (e.g. singles last 30 days).
- **FR-10.2** **Gold tier:** As Free; no AI (detailed in Platform).
- **FR-10.3** **Platinum tier:** PR, TR, MR; full session history (darts); session trends (30/90/all-time); match history; AI analysis (deferred implementation).
- **FR-10.4** Tier stored per player (or via membership service); UI gates features by tier.

### 6.11 Competitions (foundation)

- **FR-11.1** Competition events can be created (Admin): e.g. “Competition day”, “Finals night”. Linked to cohort/calendar where appropriate.
- **FR-11.2** Match results: legs, 3DA, doubles, opponent, format. Stored for MR/OMR calculation.
- **FR-11.3** Finals night style: groups, round-robin, handicap (e.g. lower-rated player starts 451), progression to semis/final. Detailed flow can be a later phase; data model and rating integration in scope.

### 6.12 Admin Portal

- **FR-12.1** **View:** Player profiles (no edit of ratings by default; support for corrections if needed).
- **FR-12.2** **CRUD:** Calendars, schedules, sessions, routines, level requirements, cohorts, cohort members, competitions. **Reference data CRUD (admin):** checkout combinations (edit dart1/dart2/dart3 per total), level averages (level bands with 3-dart average and accuracy %).
- **FR-12.3** **View:** Cohort performance data, cohort session data, competition data. No raw DB access; all via admin UI and data-access layer.

### 6.13 Notifications and orchestration (GO)

- **FR-13.1** Players can be notified of upcoming sessions (e.g. “Day 2 - Singles practice due on 2026-03-01 20:00”). Mechanism (email, in-app, push) to be decided; placeholder for “notification content” and “due session” in scope.
- **FR-13.2** GO responsibilities: manage session lifecycle, record scores, trigger TR/MR/PR updates after sessions/matches. Can be implemented as server-side logic (e.g. Supabase Edge Functions or app backend) or transactional app logic; no client-only rating calculation for integrity.

---

## 7. Non-functional requirements

### 7.1 Architecture and stack (RSD alignment)

- **NFR-1** Modular monolith; shared codebase for web (and later mobile). Supabase for auth, Postgres, RLS, storage. Netlify for web. GitHub + CI/CD.
- **NFR-2** UI must not call Supabase directly; all data access via `packages/data`. RLS on all user-facing tables. No service-role or secret keys in client.
- **NFR-3** Schema changes only via migrations. No ad-hoc DB changes.

### 7.2 Security and data

- **NFR-4** Auth: Supabase Auth; email verification and password reset (Resend SMTP when configured). No PII in client beyond what’s needed for the session.
- **NFR-5** Admin: role-restricted; destructive actions confirmed and logged. No raw DB manipulation exposed.

### 7.3 UX and accessibility

- **NFR-6** Mobile-first, portrait-first. Component reuse; accessibility (tap targets, contrast, readable errors). Consistent navigation and patterns.

### 7.4 Quality and testing

- **NFR-7** Jest-based tests for core modules (rating engines, scoring, data access). Deterministic tests; CI gates (lint, test, build) must pass.
- **NFR-8** Errors: no silent failures; user-facing errors clear and actionable; system errors logged with context, no secrets in logs.

### 7.5 Performance and scale

- **NFR-9** Dashboard and session list load in &lt; 3s on typical connection. Dart submission and score calculation feel immediate (optimistic UI or fast round-trip).
- **NFR-10** dart_scores will grow large; consider partitioning or archiving strategy for analytics; MVP can start with single table and index strategy.

---

## 8. Constraints and assumptions

- **Assumption:** Founding cohort and early phases use a single tenant (one Supabase project). Multi-tenant or white-label not required for initial plan.
- **Assumption:** Tiered membership is represented in data (e.g. tier on player); payment/subscription integration is a separate stream.
- **Assumption:** Voice input for score capture is a UX enhancement; manual input must be fully supported and primary for reliability.
- **Constraint:** Rating logic (TR, MR, OMR) must match published specs exactly; no undocumented variations.
- **Constraint:** No new core technologies without explicit approval (per .cursorrules).

---

## 9. High-level development phases (for planning)

The following phases are **suggested** to turn this PRD into a development plan. Dependencies and order should be refined when creating the actual **DELIVERY_TASK_MAP.md** or implementation plan.

| Phase | Focus | Key deliverables |
|-------|--------|-------------------|
| **P1 — Foundation** | Data model, auth, player profile, admin skeleton. | Supabase schema (migrations), RLS, auth flow, player profile CRUD, admin app or area with login and placeholder pages. |
| **P2 — Training content** | Schedules, sessions, routines, level requirements. | Admin CRUD for schedules/sessions/routines/levels; API/data layer to read them; no GE yet. |
| **P3 — Cohorts and calendar** | Cohorts, calendar, player assignment. | Cohort and cohort_members; calendar and player_calendar; admin CRUD; “next session” and “available sessions” for a player. |
| **P4 — Game Engine core** | Run a session, record darts, compute scores. | GE UI: select session → run routines → input darts (manual first) → store dart_scores, routine/session scores; level check and display. |
| **P5 — Training Rating** | TR end-to-end. | BR/ITA (ITA session type + calculation); CR progression after each session; level requirements applied; TR on dashboard and in GE. |
| **P6 — Dashboard and analyzer (basic)** | Player dashboard, basic analyzer. | Dashboard: profile, cohort, next session, PR/TR/MR and trends. Analyzer: session history and basic trends (Free tier). Tier gating. |
| **P7 — Match Rating and competitions** | MR/OMR, competition sessions. | Match result capture; MR per match; OMR calculation; competition day and finals-style events; PR combining TR and MR. |
| **P8 — Polish and scale** | Voice input, notifications, admin reporting, performance. | Voice score input; GO notifications; admin cohort/competition reports; indexing/archiving for dart_scores; any remaining tier features. |

Phases P1–P3 can be partially parallelised (e.g. content model and cohort/calendar). P4 depends on P2–P3. P5 depends on P4. P6 depends on P5. P7 depends on P5 and P6. P8 is incremental on top of P7.

---

## 10. Document history and maintenance

- **v1.0** — Initial PRD derived from OPP Product Brief, OPP Platform, Training Rating Spec v2, Match Rating Spec, Cohort example.
- **v1.1** — FR-1.2: player checkout preferences (profile → Checkout preferences, `player_checkout_variations`). FR-12.2: reference data CRUD for checkout combinations and level averages (admin). See PROJECT_STATUS_TRACKER and P8_FEATURES §8.
- This document should be updated when product scope or priorities change. Cursor may propose updates; governance docs (e.g. .cursorrules) must not be overwritten without explicit instruction.
- **PROJECT_STATUS_TRACKER.md** and (when created) **DELIVERY_TASK_MAP.md** will reference this PRD and track progress against the phases and requirements above.
