/**
 * @opp/data — data-access layer. All Supabase access goes through here.
 * UI must not call Supabase directly.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

/**
 * Create a Supabase client. Call with env from the app (e.g. VITE_* in web).
 * Never use service_role in client code.
 */
export function createSupabaseClient(env: SupabaseEnv): SupabaseClient {
  return createClient(env.url, env.anonKey);
}

export type {
  CreatePlayerPayload,
  Player,
  UpdatePlayerPayload,
  Schedule,
  ScheduleEntry,
  Session,
  SessionRoutine,
  Routine,
  RoutineStep,
  LevelRequirement,
  CreateSchedulePayload,
  UpdateSchedulePayload,
  CreateSessionPayload,
  UpdateSessionPayload,
  CreateRoutinePayload,
  UpdateRoutinePayload,
  CreateLevelRequirementPayload,
  UpdateLevelRequirementPayload,
  ScheduleEntryInput,
  SessionRoutineInput,
  RoutineStepInput,
  // P3 Cohorts and calendar
  Cohort,
  CohortMember,
  Calendar,
  PlayerCalendar,
  PlayerCalendarStatus,
  CreateCohortPayload,
  UpdateCohortPayload,
  GenerateCalendarOptions,
  PlayerCalendarFilters,
  NextOrAvailableSession,
  SessionDisplayStatus,
  SessionWithStatus,
  // P4 Game Engine
  SessionRun,
  DartScore,
  PlayerRoutineScore,
  DartScorePayload,
  PlayerRoutineScorePayload,
  RecentSessionScore,
  SessionHistoryEntry,
  SessionHistoryRoutineScore,
  ListCompletedSessionRunsOptions,
  GetTrendForPlayerOptions,
  // P7 Match Rating and Competition
  Competition,
  CreateCompetitionPayload,
  UpdateCompetitionPayload,
  Match,
  MatchInsertPayload,
  MatchWithOpponentDisplay,
  RecordMatchPayload,
} from './types';
export { DataError, isDataError } from './errors';
export {
  getCurrentPlayer,
  createPlayer,
  updatePlayer,
  listPlayers,
  getPlayerById,
  setBaselineAndTrainingRating,
  setPlayerITACompleted,
} from './players';
export {
  listSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listScheduleEntries,
  setScheduleEntries,
} from './schedules';
export {
  listSessions,
  getSessionById,
  getSessionWithRoutines,
  createSession,
  updateSession,
  deleteSession,
  listSessionRoutines,
  setSessionRoutines,
} from './sessions';
export {
  listRoutines,
  getRoutineById,
  getRoutineWithSteps,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  listRoutineSteps,
  setRoutineSteps,
} from './routines';
export {
  listLevelRequirements,
  getLevelRequirementByMinLevel,
  createLevelRequirement,
  updateLevelRequirement,
  deleteLevelRequirement,
} from './level-requirements';
export {
  listCohorts,
  getCohortById,
  createCohort,
  updateCohort,
  deleteCohort,
} from './cohorts';
export type { GetCohortByIdResult } from './cohorts';
export {
  listCompetitions,
  getCompetitionById,
  createCompetition,
  updateCompetition,
  deleteCompetition,
} from './competitions';
export type { ListCompetitionsOptions } from './competitions';
export {
  listMatchesForPlayer,
  getNextCompetitionForPlayer,
  listMatchesForCompetition,
} from './matches';
export type { ListMatchesForPlayerOptions } from './matches';
export {
  listCohortMembers,
  addCohortMember,
  removeCohortMember,
  getCurrentCohortForPlayer,
  getOpponentsInCurrentCohort,
} from './cohort-members';
export type { CohortMemberWithPlayer, OpponentOption } from './cohort-members';
export {
  listCalendarByCohort,
  generateCalendarForCohort,
  getCalendarEntryById,
} from './calendar';
export type { CalendarWithSessionName, CalendarEntryWithDetails } from './calendar';
export {
  listPlayerCalendar,
  getNextSessionForPlayer,
  getAvailableSessionsForPlayer,
  getAllSessionsForPlayer,
  updatePlayerCalendarStatus,
} from './player-calendar';
export type { PlayerCalendarWithDetails } from './player-calendar';
export {
  createSessionRun,
  getSessionRunByPlayerAndCalendar,
  getSessionRunById,
  completeSessionRun,
} from './session-runs';
export {
  getRecentSessionScoresForPlayer,
  listCompletedSessionRunsForPlayer,
  getSessionHistoryForPlayer,
  getTrendForPlayer,
} from './session-history';
export { insertDartScore, insertDartScores, listDartScoresByTrainingId } from './dart-scores';
export { upsertPlayerRoutineScore } from './player-routine-scores';
export { levelChangeFromSessionScore, roundScore, routineScore, sessionScore } from './scoring';
export {
  computeCheckoutRating,
  computeDoublesRating,
  computeITAScore,
  computeSinglesRating,
} from './ita-scoring';
export { applyTrainingRatingProgression } from './progression';
export {
  completeITAAndSetBR,
  computeITARatingsFromDartScores,
  deriveITARatingsFromSessionRun,
  getRoutineITAType,
} from './ita-session';
export type { DartRow, ITARatings, ITARoutineInfo, ITARoutineType } from './ita-session';
export {
  OMR_WINDOW_SIZE,
  OMR_TRIM_THRESHOLD,
  FORMAT_WEIGHTS,
  OUT_OF_BAND_WEIGHT,
  PR_TR_WEIGHT,
  PR_OMR_WEIGHT,
  getDecade,
} from './rating-params';
export {
  computeMatchRating,
  getFormatWeight,
  isOpponentInBand,
} from './match-rating';
export type { ComputeMatchRatingInputs } from './match-rating';
export {
  getEligibleMatchesForOMR,
  computeOMR,
  updatePlayerOMR,
} from './omr';
export type { EligibleMatchForOMR } from './omr';
export { computePR, updatePlayerPR } from './pr';
export { recordMatch } from './record-match';
export type { RecordMatchResult } from './record-match';
