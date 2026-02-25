-- Free Training: allow session_runs without a calendar (run_type = 'free', routine_id set).
-- Spec: docs/OPP_EXTRA_TRAINING_DOMAIN.md, docs/OPP_EXTRA_TRAINING_IMPLEMENTATION_CHECKLIST.md §5.
-- dart_scores.training_id still references session_runs(id); no change to dart_scores schema.

-- 1. run_type: 'scheduled' = calendar-based (replay allowed); 'free' = platinum ad-hoc single routine.
ALTER TABLE public.session_runs
  ADD COLUMN IF NOT EXISTS run_type text NOT NULL DEFAULT 'scheduled';

ALTER TABLE public.session_runs
  DROP CONSTRAINT IF EXISTS session_runs_run_type_check;

ALTER TABLE public.session_runs
  ADD CONSTRAINT session_runs_run_type_check
  CHECK (run_type IN ('scheduled', 'free'));

-- 2. routine_id: for free runs, the single routine being practiced (NULL for scheduled).
ALTER TABLE public.session_runs
  ADD COLUMN IF NOT EXISTS routine_id uuid REFERENCES public.routines(id) ON DELETE RESTRICT;

-- 3. calendar_id: allow NULL for free runs (scheduled runs keep calendar_id set).
ALTER TABLE public.session_runs
  ALTER COLUMN calendar_id DROP NOT NULL;

-- 4. Constraint: scheduled = has calendar; free = no calendar, has routine.
ALTER TABLE public.session_runs
  DROP CONSTRAINT IF EXISTS session_runs_scheduled_free_check;

ALTER TABLE public.session_runs
  ADD CONSTRAINT session_runs_scheduled_free_check
  CHECK (
    (run_type = 'scheduled' AND calendar_id IS NOT NULL)
    OR
    (run_type = 'free' AND calendar_id IS NULL AND routine_id IS NOT NULL)
  );

COMMENT ON COLUMN public.session_runs.run_type IS 'scheduled = calendar/session run (or replay); free = platinum ad-hoc single routine (no calendar).';
COMMENT ON COLUMN public.session_runs.routine_id IS 'For run_type = free: the routine being practiced. NULL for scheduled runs.';

COMMENT ON TABLE public.session_runs IS 'P4: Training runs. scheduled = per calendar (replay allowed); free = ad-hoc single routine (platinum). training_id for dart_scores and player_routine_scores.';
