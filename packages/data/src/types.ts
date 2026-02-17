/**
 * Plain types for @opp/data. Match public.players table (snake_case).
 * No Supabase-specific types leak to callers.
 */

export interface Player {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  gender: string | null;
  age_range: string | null;
  baseline_rating: number | null;
  training_rating: number | null;
  /** P5: ITA score when set (e.g. L29); optional until migration applied. */
  ita_score?: number | null;
  /** P5: When ITA was completed; optional until migration applied. */
  ita_completed_at?: string | null;
  match_rating: number | null;
  player_rating: number | null;
  /** P6: Membership tier for feature gating; default 'free'. */
  tier?: 'free' | 'gold' | 'platinum';
  /** P6: Optional profile image URL; upload pipeline TBD. */
  avatar_url?: string | null;
  date_joined: string;
  role: 'player' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface CreatePlayerPayload {
  display_name: string;
  email: string;
  gender?: string | null;
  age_range?: string | null;
}

/** Profile edit only. baseline_rating and training_rating are never set here (P5: ITA and progression only). */
export interface UpdatePlayerPayload {
  display_name?: string;
  email?: string;
  gender?: string | null;
  age_range?: string | null;
}

// ---------------------------------------------------------------------------
// P2 Training content (snake_case to match DB)
// ---------------------------------------------------------------------------

export interface Schedule {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEntry {
  id: string;
  schedule_id: string;
  day_no: number;
  session_no: number;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SessionRoutine {
  id: string;
  session_id: string;
  routine_no: number;
  routine_id: string;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineStep {
  id: string;
  routine_id: string;
  step_no: number;
  target: string;
  created_at: string;
  updated_at: string;
}

export interface LevelRequirement {
  id: string;
  min_level: number;
  tgt_hits: number;
  darts_allowed: number;
  created_at: string;
  updated_at: string;
}

// Payloads
export interface CreateSchedulePayload {
  name: string;
}

export interface UpdateSchedulePayload {
  name?: string;
}

export interface CreateSessionPayload {
  name: string;
}

export interface UpdateSessionPayload {
  name?: string;
}

export interface CreateRoutinePayload {
  name: string;
  description?: string | null;
}

export interface UpdateRoutinePayload {
  name?: string;
  description?: string | null;
}

export interface CreateLevelRequirementPayload {
  min_level: number;
  tgt_hits: number;
  darts_allowed: number;
}

export interface UpdateLevelRequirementPayload {
  min_level?: number;
  tgt_hits?: number;
  darts_allowed?: number;
}

export interface ScheduleEntryInput {
  day_no: number;
  session_no: number;
  session_id: string;
}

export interface SessionRoutineInput {
  routine_no: number;
  routine_id: string;
}

export interface RoutineStepInput {
  step_no: number;
  target: string;
}

// ---------------------------------------------------------------------------
// P3 Cohorts and calendar (snake_case to match DB)
// ---------------------------------------------------------------------------

export interface Cohort {
  id: string;
  name: string;
  level: number;
  start_date: string;
  end_date: string;
  schedule_id: string;
  created_at: string;
  updated_at: string;
}

export interface CohortMember {
  id: string;
  cohort_id: string;
  player_id: string;
  created_at: string;
  updated_at: string;
}

export interface Calendar {
  id: string;
  scheduled_at: string;
  cohort_id: string;
  schedule_id: string;
  day_no: number;
  session_no: number;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerCalendar {
  id: string;
  player_id: string;
  calendar_id: string;
  status: PlayerCalendarStatus;
  created_at: string;
  updated_at: string;
}

export type PlayerCalendarStatus = 'planned' | 'completed';

export interface CreateCohortPayload {
  name: string;
  level: number;
  start_date: string;
  end_date: string;
  schedule_id: string;
}

export interface UpdateCohortPayload {
  name?: string;
  level?: number;
  start_date?: string;
  end_date?: string;
  schedule_id?: string;
}

export interface GenerateCalendarOptions {
  defaultTimeOfDay?: string;
}

export interface PlayerCalendarFilters {
  status?: PlayerCalendarStatus;
  fromDate?: string;
  toDate?: string;
}

/** Single session entry returned by getNextSessionForPlayer / getAvailableSessionsForPlayer */
export interface NextOrAvailableSession {
  calendar_id: string;
  session_id: string;
  session_name: string;
  scheduled_at: string;
  day_no: number;
  session_no: number;
  cohort_id: string;
  schedule_id: string;
}

/** Session with display status for play landing (all sessions list) */
export type SessionDisplayStatus = 'Completed' | 'Due' | 'Future';

export interface SessionWithStatus extends NextOrAvailableSession {
  status: SessionDisplayStatus;
  /** Session score % when completed; null for Due/Future or if not yet saved. */
  session_score?: number | null;
}

// ---------------------------------------------------------------------------
// P4 Game Engine (session_runs, dart_scores, player_routine_scores)
// ---------------------------------------------------------------------------

export interface SessionRun {
  id: string;
  player_id: string;
  calendar_id: string;
  started_at: string;
  completed_at: string | null;
  session_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface DartScore {
  id: string;
  player_id: string;
  training_id: string;
  routine_id: string;
  routine_no: number;
  step_no: number;
  dart_no: number;
  target: string;
  actual: string;
  result: 'H' | 'M';
  created_at: string;
}

export interface PlayerRoutineScore {
  id: string;
  player_id: string;
  training_id: string;
  routine_id: string;
  routine_score: number;
  created_at: string;
  updated_at: string;
}

export interface DartScorePayload {
  player_id: string;
  training_id: string;
  routine_id: string;
  routine_no: number;
  step_no: number;
  dart_no: number;
  target: string;
  actual: string;
  result: 'H' | 'M';
}

export interface PlayerRoutineScorePayload {
  player_id: string;
  training_id: string;
  routine_id: string;
  routine_score: number;
}

// ---------------------------------------------------------------------------
// P6 Dashboard and Analyzer (session history and trends)
// ---------------------------------------------------------------------------

/** One completed run's score and date; for TR trend. */
export interface RecentSessionScore {
  session_score: number;
  completed_at: string;
}

/** Per-routine score within a session history entry. */
export interface SessionHistoryRoutineScore {
  routine_id: string;
  routine_name: string;
  routine_score: number;
}

/** One completed session run with session name and routine scores; for Analyzer. */
export interface SessionHistoryEntry {
  id: string;
  calendar_id: string;
  completed_at: string;
  session_score: number | null;
  session_name: string | null;
  routine_scores: SessionHistoryRoutineScore[];
}

/** Options for listCompletedSessionRunsForPlayer. */
export interface ListCompletedSessionRunsOptions {
  since?: string; // ISO date; only runs with completed_at >= since
  limit?: number;
}

/** Options for getTrendForPlayer. */
export interface GetTrendForPlayerOptions {
  type: 'session_score' | 'routine';
  routineName?: string; // required when type === 'routine'
  windowDays: number;
}

// ---------------------------------------------------------------------------
// P7 Match Rating and Competition
// ---------------------------------------------------------------------------

/** Competition event (competition day or finals night). */
export interface Competition {
  id: string;
  name: string;
  cohort_id: string | null;
  competition_type: 'competition_day' | 'finals_night';
  scheduled_at: string | null;
  format_legs: number | null;
  format_target: number | null;
  created_at: string;
  updated_at: string;
}

/** Payload to create a competition. */
export interface CreateCompetitionPayload {
  name: string;
  cohort_id?: string | null;
  competition_type: 'competition_day' | 'finals_night';
  scheduled_at?: string | null;
  format_legs?: number | null;
  format_target?: number | null;
}

/** Payload to update a competition (partial). */
export interface UpdateCompetitionPayload {
  name?: string;
  cohort_id?: string | null;
  competition_type?: 'competition_day' | 'finals_night';
  scheduled_at?: string | null;
  format_legs?: number | null;
  format_target?: number | null;
}

/** One row per player per match; two rows per head-to-head. */
export interface Match {
  id: string;
  player_id: string;
  opponent_id: string;
  competition_id: string | null;
  calendar_id: string | null;
  played_at: string;
  format_best_of: number;
  legs_won: number;
  legs_lost: number;
  total_legs: number;
  three_dart_avg: number | null;
  player_3da_baseline: number | null;
  doubles_attempted: number | null;
  doubles_hit: number | null;
  doubles_pct: number | null;
  opponent_rating_at_match: number | null;
  rating_difference: number | null;
  match_rating: number;
  weight: number;
  eligible: boolean;
  created_at: string;
  updated_at: string;
}

/** Payload to insert a match row (one player's perspective). */
export interface MatchInsertPayload {
  player_id: string;
  opponent_id: string;
  competition_id?: string | null;
  calendar_id?: string | null;
  played_at?: string;
  format_best_of: number;
  legs_won: number;
  legs_lost: number;
  total_legs: number;
  three_dart_avg?: number | null;
  player_3da_baseline?: number | null;
  doubles_attempted?: number | null;
  doubles_hit?: number | null;
  doubles_pct?: number | null;
  opponent_rating_at_match?: number | null;
  rating_difference?: number | null;
  match_rating: number;
  weight: number;
  eligible?: boolean;
}

/** Match row with opponent display_name for list UI. */
export interface MatchWithOpponentDisplay extends Match {
  opponent_display_name: string | null;
}

/** Payload to record a match (current player's perspective). Both rows inserted; OMR/PR updated for both players. */
export interface RecordMatchPayload {
  playerId: string;
  opponentId: string;
  formatBestOf: number;
  legsWon: number;
  legsLost: number;
  threeDartAvg?: number | null;
  doublesAttempted?: number | null;
  doublesHit?: number | null;
  competitionId?: string | null;
  calendarId?: string | null;
  playedAt?: string;
}
