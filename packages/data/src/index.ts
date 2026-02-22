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
  RoutineType,
  LevelRequirement,
  CreateSchedulePayload,
  UpdateSchedulePayload,
  CreateSessionPayload,
  UpdateSessionPayload,
  CreateRoutinePayload,
  UpdateRoutinePayload,
  CreateLevelRequirementPayload,
  UpdateLevelRequirementPayload,
  CheckoutCombination,
  UpdateCheckoutCombinationPayload,
  PlayerCheckoutVariation,
  CreatePlayerCheckoutVariationPayload,
  UpdatePlayerCheckoutVariationPayload,
  LevelAverage,
  CreateLevelAveragePayload,
  UpdateLevelAveragePayload,
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
  UpdateCalendarEntryPayload,
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
  PlayerStepRun,
  CreatePlayerStepRunPayload,
  UpdatePlayerStepRunPayload,
  PlayerAttemptResult,
  CreatePlayerAttemptResultPayload,
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
  CohortPerformanceReport,
  CohortPerformanceReportRow,
  CompetitionReport,
  CompetitionReportMatchRow,
  CompetitionReportSummaryRow,
} from './types';
export { isRoutineType, ROUTINE_TYPES } from './types';
export { DataError, isDataError } from './errors';
export {
  getCurrentPlayer,
  createPlayer,
  updatePlayer,
  updatePlayerTier,
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
  getLevelRequirementByMinLevelAndRoutineType,
  createLevelRequirement,
  updateLevelRequirement,
  deleteLevelRequirement,
} from './level-requirements';
export {
  getCheckoutCombinationByTotal,
  listCheckoutCombinations,
  updateCheckoutCombination,
} from './checkout-combinations';
export { getRecommendedSegmentForRemaining } from './get-recommended-checkout-segment';
export {
  listLevelAverages,
  getLevelAverageById,
  getLevelAverageForLevel,
  getExpectedHitsForSingleDartRoutine,
  createLevelAverage,
  updateLevelAverage,
  deleteLevelAverage,
} from './level-averages';
export {
  computeExpectedCheckoutSuccesses,
  getExpectedCheckoutSuccesses,
} from './checkout-expectation';
export type { ExpectedCheckoutResult, LevelAverageForCheckout } from './checkout-expectation';
export {
  getPlayerCheckoutVariationByTotal,
  listPlayerCheckoutVariations,
  createPlayerCheckoutVariation,
  updatePlayerCheckoutVariation,
  deletePlayerCheckoutVariation,
} from './player-checkout-variations';
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
  updateCalendarEntry,
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
  resetSessionForCalendar,
} from './session-runs';
export {
  createPlayerStepRun,
  updatePlayerStepRun,
  listPlayerStepRunsByTrainingId,
  getPlayerStepRunsForSessionRun,
  getPlayerStepRunByTrainingRoutineStep,
  hasPlayerStepRunsForRoutine,
} from './player-step-runs';
export {
  insertPlayerAttemptResult,
  listAttemptResultsForStepRun,
} from './player-attempt-results';
export {
  getRecentSessionScoresForPlayer,
  listCompletedSessionRunsForPlayer,
  getSessionHistoryForPlayer,
  getTrendForPlayer,
} from './session-history';
export {
  insertDartScore,
  insertDartScores,
  listDartScoresByTrainingId,
  listDartScoresForStep,
  getDartScoresForSessionRun,
  deleteDartScore,
  revertLastVisit,
} from './dart-scores';
export {
  listRoutineScoresForSessionRun,
  upsertPlayerRoutineScore,
} from './player-routine-scores';
export type { RoutineScoreForRun } from './player-routine-scores';
export { levelChangeFromSessionScore, roundScore, routineScore, sessionScore, stepScore, checkoutRoutineScore } from './scoring';
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
  getITACalendarEntryForPlayer,
  getOrCreateITACalendarEntryForPlayer,
  getRoutineITAType,
  hasCompletedITA,
  isITASession,
} from './ita-session';
export type {
  DartRow,
  ITARatings,
  ITARoutineInfo,
  ITARoutineType,
  PlayerITAStatus,
} from './ita-session';
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
export { getCohortPerformanceReport, getCompetitionReport } from './reports';
export type { GetCohortPerformanceReportOptions } from './reports';
