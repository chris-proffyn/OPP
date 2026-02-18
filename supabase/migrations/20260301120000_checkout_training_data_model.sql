-- OPP Checkout Training (§1): Data model and migrations.
-- Spec: docs/OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md §1.
-- Prerequisite: routine_type on routine_steps and level_requirements (migration 20260230120000).

-- ---------------------------------------------------------------------------
-- 1.1 Session run — snapshot player level
-- ---------------------------------------------------------------------------

ALTER TABLE public.session_runs
  ADD COLUMN IF NOT EXISTS player_level_snapshot int;

COMMENT ON COLUMN public.session_runs.player_level_snapshot IS 'Player level at session start; used for checkout expected_successes calculation. Backfill NULL for existing rows; set on insert when starting a session run (from cohort level or player training_rating → level).';

-- ---------------------------------------------------------------------------
-- 1.2 Checkout config (Option A: extend level_requirements for routine_type = 'C')
-- ---------------------------------------------------------------------------

ALTER TABLE public.level_requirements
  ADD COLUMN IF NOT EXISTS attempt_count int CHECK (attempt_count IS NULL OR attempt_count >= 1);

ALTER TABLE public.level_requirements
  ADD COLUMN IF NOT EXISTS allowed_throws_per_attempt int CHECK (allowed_throws_per_attempt IS NULL OR allowed_throws_per_attempt >= 1);

-- Defaults for new C rows: 9, 9. Existing SS/SD/ST rows stay NULL.
UPDATE public.level_requirements
SET attempt_count = 9, allowed_throws_per_attempt = 9
WHERE routine_type = 'C' AND (attempt_count IS NULL OR allowed_throws_per_attempt IS NULL);

COMMENT ON COLUMN public.level_requirements.attempt_count IS 'Checkout (C) only: number of attempts per step. Default 9. Used for expectation and scoring per OPP_CHECKOUT_TRAINING_DOMAIN.';
COMMENT ON COLUMN public.level_requirements.allowed_throws_per_attempt IS 'Checkout (C) only: darts allowed per attempt. Default 9. Used for expectation and scoring per OPP_CHECKOUT_TRAINING_DOMAIN.';

-- ---------------------------------------------------------------------------
-- 1.3 Player step runs (per-step outcomes for checkout)
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_step_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES public.session_runs(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE RESTRICT,
  routine_no int NOT NULL CHECK (routine_no >= 1),
  step_no int NOT NULL CHECK (step_no >= 1),
  routine_step_id uuid REFERENCES public.routine_steps(id) ON DELETE RESTRICT,
  checkout_target int NOT NULL CHECK (checkout_target >= 2 AND checkout_target <= 170),
  expected_successes numeric NOT NULL,
  expected_successes_int int NOT NULL CHECK (expected_successes_int >= 0),
  actual_successes int NOT NULL DEFAULT 0 CHECK (actual_successes >= 0),
  step_score numeric,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (training_id, routine_id, step_no)
);

COMMENT ON TABLE public.player_step_runs IS 'Per-step run for checkout routines: expected/actual successes and step score. One row per (training_id, routine_id, step_no).';

CREATE INDEX idx_player_step_runs_training_id ON public.player_step_runs(training_id);
CREATE INDEX idx_player_step_runs_player_id ON public.player_step_runs(player_id);

ALTER TABLE public.player_step_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY player_step_runs_select_admin ON public.player_step_runs FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY player_step_runs_select_own ON public.player_step_runs FOR SELECT USING (player_id = public.current_user_player_id());
CREATE POLICY player_step_runs_insert_admin ON public.player_step_runs FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY player_step_runs_insert_own ON public.player_step_runs FOR INSERT WITH CHECK (player_id = public.current_user_player_id());
CREATE POLICY player_step_runs_update_admin ON public.player_step_runs FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY player_step_runs_update_own ON public.player_step_runs FOR UPDATE USING (player_id = public.current_user_player_id());
CREATE POLICY player_step_runs_delete_admin ON public.player_step_runs FOR DELETE USING (public.current_user_is_players_admin());

CREATE TRIGGER player_step_runs_updated_at
  BEFORE UPDATE ON public.player_step_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 1.4 Player attempt results (per-attempt success/failure for checkout steps)
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_attempt_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_step_run_id uuid NOT NULL REFERENCES public.player_step_runs(id) ON DELETE CASCADE,
  attempt_index int NOT NULL CHECK (attempt_index >= 1),
  is_success boolean NOT NULL,
  darts_used int NOT NULL CHECK (darts_used >= 1),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_step_run_id, attempt_index)
);

COMMENT ON TABLE public.player_attempt_results IS 'Per-attempt success/failure for checkout steps. actual_successes = count(*) where is_success for the step run.';

ALTER TABLE public.player_attempt_results ENABLE ROW LEVEL SECURITY;

-- Own: player owns the step run (via player_step_runs.player_id)
CREATE POLICY player_attempt_results_select_admin ON public.player_attempt_results FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY player_attempt_results_select_own ON public.player_attempt_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.player_step_runs psr WHERE psr.id = player_attempt_results.player_step_run_id AND psr.player_id = public.current_user_player_id())
);
CREATE POLICY player_attempt_results_insert_admin ON public.player_attempt_results FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY player_attempt_results_insert_own ON public.player_attempt_results FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.player_step_runs psr WHERE psr.id = player_attempt_results.player_step_run_id AND psr.player_id = public.current_user_player_id())
);
CREATE POLICY player_attempt_results_update_admin ON public.player_attempt_results FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY player_attempt_results_update_own ON public.player_attempt_results FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.player_step_runs psr WHERE psr.id = player_attempt_results.player_step_run_id AND psr.player_id = public.current_user_player_id())
);
CREATE POLICY player_attempt_results_delete_admin ON public.player_attempt_results FOR DELETE USING (public.current_user_is_players_admin());

-- ---------------------------------------------------------------------------
-- 1.5 Dart scores — checkout support (attempt_index)
-- ---------------------------------------------------------------------------

ALTER TABLE public.dart_scores
  ADD COLUMN IF NOT EXISTS attempt_index int;

COMMENT ON COLUMN public.dart_scores.attempt_index IS 'For checkout (C): 1..attempt_count per step. NULL for non-checkout. With dart_no: dart_no is index within step (1 to attempt_count * allowed_throws_per_attempt).';

COMMENT ON TABLE public.dart_scores IS 'P4: Low-level record of every dart thrown. For checkout (C): attempt_index and dart_no are per-step; dart_no can go up to attempt_count * allowed_throws_per_attempt.';
