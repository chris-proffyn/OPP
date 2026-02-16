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
  listCohortMembers,
  addCohortMember,
  removeCohortMember,
  getCurrentCohortForPlayer,
} from './cohort-members';
export type { CohortMemberWithPlayer } from './cohort-members';
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
