# OPP — Project Status Tracker

**Project:** OPP (Darts Training Platform)  
**Document Type:** Runtime control & execution tracking  
**Last Updated:** P1–P8 phase entries added

---

## 1. Current State

- **Phase:** Development environment complete. Product requirements defined.
- **Bootstrap:** Completed per RSD_PROJECT_BOOTSTRAP.md.
- **Next:** Use `docs/PRODUCT_REQUIREMENTS.md` (PRD) to create comprehensive high-level development plan (e.g. DELIVERY_TASK_MAP.md or phased implementation plan). Then proceed with P1 (Foundation) or as directed.

---

## 2. In Progress

- None.

---

## 3. Completed

- Project bootstrap: canonical folder structure, root `.cursorrules`, `docs/NEW_CHAT.md`, `docs/PROJECT_STATUS_TRACKER.md`, `README.md`, `apps/`, `packages/`, `supabase/` baseline created.
- Dev environment implementation checklist: `docs/DEV_ENVIRONMENT_CHECKLIST.md` created and executed.
- Development environment: Node/npm monorepo, TypeScript, `.gitignore`, `.env.example` (Supabase URL configured; anon key from dashboard). Packages `@opp/utils`, `@opp/data`, `@opp/ui`. Web app (Vite + React) runs and builds; mobile stub. ESLint, Prettier, Jest (one passing test), GitHub Actions CI. README updated with setup and scripts. GitHub remote: https://github.com/chris-proffyn/OPP (add via `git remote add origin` if cloning fresh).
- Product Requirements Document: `docs/PRODUCT_REQUIREMENTS.md` (PRD) — vision, scope, references to OPP docs; functional requirements by domain; NFRs; 8-phase high-level development plan.
- **P1 — Foundation delivered:** Supabase migrations (`players` table, RLS, `current_user_is_players_admin` helper); auth (sign up, sign in, sign out, forgot/reset password); onboarding and profile view/edit; authenticated layout and guarded home; admin area (`/admin`) with dashboard placeholder, players list, and read-only player view; all data access via `packages/data`; unit tests and manual test plan in `docs/P1_TEST_PLAN.md`. Spec verification per `docs/P1_FOUNDATION_IMPLEMENTATION_TASKS.md` §11.
- **P2 — Training content delivered:** Migrations for schedules, schedule_entries, sessions, session_routines, routines, routine_steps, level_requirements (triggers, RLS, indexes); data layer in `packages/data` (list/get/create/update/delete + setScheduleEntries, setSessionRoutines, setRoutineSteps); admin CRUD at `/admin/schedules`, `/admin/sessions`, `/admin/routines`, `/admin/level-requirements`; unit tests for schedules, sessions, routines, level requirements. Spec per `docs/P2_TRAINING_CONTENT_IMPLEMENTATION_TASKS.md`.
- **P3 — Cohorts and calendar delivered:** Migrations for cohorts, cohort_members, calendar, player_calendar (triggers, RLS, indexes); data layer in `packages/data` (cohorts, cohort members, calendar, player calendar; getNextSessionForPlayer, getAvailableSessionsForPlayer); admin CRUD at `/admin/cohorts` (list, new, edit, members, generate calendar, calendar view). Spec per `docs/P3_COHORTS_CALENDAR_IMPLEMENTATION_TASKS.md`.
- **P4 — Game Engine core delivered:** Migrations for session_runs, dart_scores, player_routine_scores (triggers, RLS, indexes); data layer (createSessionRun, getSessionRunByPlayerAndCalendar, completeSessionRun, insertDartScore/insertDartScores, upsertPlayerRoutineScore, roundScore/routineScore/sessionScore; getAllSessionsForPlayer with status and session_score); GE UI: Play nav, `/play` landing (**all sessions** with **Status** Completed/Due/Future and **Score** column, Start/View), `/play/session/:calendarId` game screen (context, level check, start/resume, routine loop, segment grid dart input, session score during play and in end summary, mark player_calendar completed). Level check display from level_requirements. Spec per `docs/P4_GAME_ENGINE_IMPLEMENTATION_TASKS.md` and `docs/P4_GAME_ENGINE_DOMAIN.md`.
- **P5 — Training Rating delivered:** BR/ITA: ITA session identification (name-based), ITA score calculation (Singles/Doubles/Checkout), set baseline_rating and training_rating on ITA completion; optional players.ita_score and ita_completed_at. CR progression: levelChangeFromSessionScore, applyTrainingRatingProgression at session end (skip for ITA). TR on dashboard (Home) and in GE (game screen and session-end summary). Spec per `docs/P5_TRAINING_RATING_IMPLEMENTATION_TASKS.md` and `docs/P5_TRAINING_RATING_DOMAIN.md`.
- **P6 — Dashboard and analyzer (basic) delivered:** Dashboard (Home): profile, cohort, next session, PR/TR/MR and TR trend (↑/→/↓), link to Performance. Performance Analyzer (`/analyzer`): Free tier — current TR, session history (session + routine scores), basic trends (session score and Singles last 30 days). Tier gating: Free sees only last-30-day trends and session/routine scores; Gold/Platinum placeholder. Spec per `docs/P6_DASHBOARD_ANALYZER_IMPLEMENTATION_TASKS.md` and `docs/P6_DASHBOARD_ANALYZER_DOMAIN.md`.
- **P7 — Match Rating and competitions delivered:** Match capture (Record match at `/play/record-match`; recordMatch inserts two match rows, updates OMR and PR for both players). MR/OMR/PR: match_rating and player_rating populated; Dashboard shows next competition via getNextCompetitionForPlayer. Admin competitions CRUD at `/admin/competitions` (list, new, edit, delete, view matches). Analyzer match history (Gold/Platinum). Spec per `docs/P7_MATCH_RATING_COMPETITION_IMPLEMENTATION_TASKS.md` and `docs/P7_MATCH_RATING_COMPETITION_DOMAIN.md`.

---

## 4. Blockers / Risks

- None recorded.

---

## 5. Constraints & Exclusions

- No feature development until explicitly requested.
- Follow .cursorrules and RSD foundational docs for all subsequent work.
- OPP-specific mandatory reading applies when starting feature work (Product Brief, Platform.md, rating engine specs, Cohort example).

---

## 6. Notes

- **PRODUCT_REQUIREMENTS.md** is in place and is mandatory reading before planning/feature work (see .cursorrules). Use it to derive DELIVERY_TASK_MAP.md or equivalent development plan.
- OPP Product Brief reference in .cursorrules: `OPP Darts Training Platform - Product Brief.pdf` — project has `OPP Darts Training Platform - Product Brief.md` in docs; PRD references the .md version.
- **Deployment env:** At some point, save the required .env variables (e.g. Supabase URL, publishable/anon key; never the secret key in client environments) into each target deployment environment: Netlify (web), iOS (e.g. Xcode scheme or config), Android, and any other targets so builds and runtime have the correct config.

---

## 7. Development phases (P1–P8)

Per `docs/PRODUCT_REQUIREMENTS.md` §9. Order and dependencies: P1→P2/P3 (partial parallel) → P4 → P5 → P6 → P7 → P8.

- [x] **P1 — Foundation**  
  Data model, auth, player profile, admin skeleton.  
  *Deliverables:* Supabase schema (migrations), RLS, auth flow, player profile CRUD, admin app or area with login and placeholder pages.

- [x] **P2 — Training content**  
  Schedules, sessions, routines, level requirements.  
  *Deliverables:* Admin CRUD for schedules/sessions/routines/levels; API/data layer to read them; no GE yet.

- [x] **P3 — Cohorts and calendar**  
  Cohorts, calendar, player assignment.  
  *Deliverables:* Cohort and cohort_members; calendar and player_calendar; admin CRUD; “next session” and “available sessions” for a player.

- [x] **P4 — Game Engine core**  
  Run a session, record darts, compute scores.  
  *Deliverables:* GE UI: select session → run routines → input darts (manual first) → store dart_scores, routine/session scores; level check and display.

- [x] **P5 — Training Rating**  
  TR end-to-end.  
  *Deliverables:* BR/ITA (ITA session type + calculation); CR progression after each session; level requirements applied; TR on dashboard and in GE.

- [x] **P6 — Dashboard and analyzer (basic)**  
  Player dashboard, basic analyzer.  
  *Deliverables:* Dashboard: profile, cohort, next session, PR/TR/MR and trends. Analyzer: session history and basic trends (Free tier). Tier gating.

- [x] **P7 — Match Rating and competitions**  
  MR/OMR, competition sessions.  
  *Deliverables:* Match result capture; MR per match; OMR calculation; competition day and finals-style events; PR combining TR and MR.

- [ ] **P8 — Polish and scale**  
  Notifications, admin reporting, performance, voice input.
  *Deliverables:* Voice score input; GO notifications; admin cohort/competition reports; indexing/archiving for dart_scores; any remaining tier features.
