-- Clear all player training data: session runs, dart scores, routine scores, step runs, attempt results.
-- Also clears all player rating values and ITA completion so "Complete ITA" appears again on profile/play.
-- Resets player_calendar status to 'planned' so sessions show as not completed.
-- Use for dev/reset or to wipe training history.

-- Delete all session runs. CASCADE removes:
--   dart_scores (training_id)
--   player_routine_scores (training_id)
--   player_step_runs (training_id) → player_attempt_results (player_step_run_id)
DELETE FROM public.session_runs;

-- Clear all player rating values and ITA completion (so profile shows "Complete ITA" again)
UPDATE public.players
SET baseline_rating = NULL,
    training_rating = NULL,
    match_rating = NULL,
    player_rating = NULL,
    ita_score = NULL,
    ita_completed_at = NULL;

-- Mark all player calendar entries as planned so sessions appear as not completed
UPDATE public.player_calendar
SET status = 'planned'
WHERE status = 'completed';
