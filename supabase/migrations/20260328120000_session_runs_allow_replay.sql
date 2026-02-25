-- Extra Training (Replay): allow multiple session_runs per (player_id, calendar_id).
-- Spec: docs/OPP_EXTRA_TRAINING_DOMAIN.md, docs/OPP_EXTRA_TRAINING_IMPLEMENTATION_CHECKLIST.md §1.
-- Display session score for a calendar entry is derived (e.g. average of completed runs).

-- Drop unique constraint so replay can create additional runs for the same calendar session.
ALTER TABLE public.session_runs
  DROP CONSTRAINT IF EXISTS session_runs_player_id_calendar_id_key;

-- Composite index for "list runs for this calendar" (WHERE player_id = ? AND calendar_id = ? ORDER BY started_at DESC).
CREATE INDEX IF NOT EXISTS idx_session_runs_player_calendar_started
  ON public.session_runs (player_id, calendar_id, started_at DESC);

COMMENT ON TABLE public.session_runs IS 'P4: Training runs per player per calendar (training_id for dart_scores and player_routine_scores). Multiple runs per (player, calendar) support replay; display session score = average of completed runs.';
