/**
 * P5: ITA (Initial Training Assessment) session identification and completion in GE.
 * Per P5_TRAINING_RATING_DOMAIN.md §9.1 Option A — name-based.
 * Per OPP_ITA_IMPLEMENTATION_CHECKLIST §1: "ITA completed" = ita_completed_at != null.
 * Session name and ITA calendar resolution live in @opp/data; re-export for app use.
 */

import { hasCompletedITA as hasCompletedITAData, isITASession as isITASessionData } from '@opp/data';

/** Re-export from @opp/data. Session is ITA if name is "ITA" or "Initial Training Assessment" (case-insensitive). */
export const isITASession = isITASessionData;

/** Re-export from @opp/data. Use in the app for UI and routing. */
export const hasCompletedITA = hasCompletedITAData;

/** Message shown when redirecting from Play to ITA (OPP_ITA_UPDATE_DOMAIN §2). */
export const PLAY_MUST_COMPLETE_ITA_MESSAGE =
  'You must complete your Initial Training Assessment before you can start training.';
