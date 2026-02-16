-- P4 Game Engine: session_runs, dart_scores, player_routine_scores
-- Spec: docs/P4_GAME_ENGINE_DOMAIN.md §4–5, §10

-- ---------------------------------------------------------------------------
-- 1. Table: session_runs (training event: one per player per calendar session)
-- ---------------------------------------------------------------------------

CREATE TABLE public.session_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendar(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  session_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, calendar_id)
);

COMMENT ON TABLE public.session_runs IS 'P4: One run per player per calendar session (training_id for dart_scores and player_routine_scores).';

-- ---------------------------------------------------------------------------
-- 2. Table: dart_scores (one row per dart thrown)
-- ---------------------------------------------------------------------------

CREATE TABLE public.dart_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES public.session_runs(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE RESTRICT,
  routine_no int NOT NULL CHECK (routine_no >= 1),
  step_no int NOT NULL CHECK (step_no >= 1),
  dart_no int NOT NULL CHECK (dart_no >= 1),
  target text NOT NULL,
  actual text NOT NULL,
  result text NOT NULL CHECK (result IN ('H', 'M')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.dart_scores IS 'P4: Low-level record of every dart thrown (target, actual, hit/miss).';

-- ---------------------------------------------------------------------------
-- 3. Table: player_routine_scores (one row per routine per session run)
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_routine_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES public.session_runs(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE RESTRICT,
  routine_score numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (training_id, routine_id)
);

COMMENT ON TABLE public.player_routine_scores IS 'P4: Routine score % per (training_id, routine_id).';

-- ---------------------------------------------------------------------------
-- 4. Triggers: updated_at (session_runs, player_routine_scores; reuse P2 set_updated_at)
-- ---------------------------------------------------------------------------

CREATE TRIGGER session_runs_updated_at
  BEFORE UPDATE ON public.session_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER player_routine_scores_updated_at
  BEFORE UPDATE ON public.player_routine_scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.session_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dart_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_routine_scores ENABLE ROW LEVEL SECURITY;

-- session_runs: SELECT/INSERT/UPDATE own or admin; DELETE admin only
CREATE POLICY session_runs_select_admin ON public.session_runs FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY session_runs_select_own ON public.session_runs FOR SELECT USING (player_id = public.current_user_player_id());
CREATE POLICY session_runs_insert_admin ON public.session_runs FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY session_runs_insert_own ON public.session_runs FOR INSERT WITH CHECK (player_id = public.current_user_player_id());
CREATE POLICY session_runs_update_admin ON public.session_runs FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY session_runs_update_own ON public.session_runs FOR UPDATE USING (player_id = public.current_user_player_id());
CREATE POLICY session_runs_delete_admin ON public.session_runs FOR DELETE USING (public.current_user_is_players_admin());

-- dart_scores: SELECT/INSERT own or admin; UPDATE/DELETE admin only
CREATE POLICY dart_scores_select_admin ON public.dart_scores FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY dart_scores_select_own ON public.dart_scores FOR SELECT USING (player_id = public.current_user_player_id());
CREATE POLICY dart_scores_insert_admin ON public.dart_scores FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY dart_scores_insert_own ON public.dart_scores FOR INSERT WITH CHECK (player_id = public.current_user_player_id());
CREATE POLICY dart_scores_update_admin ON public.dart_scores FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY dart_scores_delete_admin ON public.dart_scores FOR DELETE USING (public.current_user_is_players_admin());

-- player_routine_scores: SELECT/INSERT/UPDATE own or admin
CREATE POLICY player_routine_scores_select_admin ON public.player_routine_scores FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY player_routine_scores_select_own ON public.player_routine_scores FOR SELECT USING (player_id = public.current_user_player_id());
CREATE POLICY player_routine_scores_insert_admin ON public.player_routine_scores FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY player_routine_scores_insert_own ON public.player_routine_scores FOR INSERT WITH CHECK (player_id = public.current_user_player_id());
CREATE POLICY player_routine_scores_update_admin ON public.player_routine_scores FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY player_routine_scores_update_own ON public.player_routine_scores FOR UPDATE USING (player_id = public.current_user_player_id());
CREATE POLICY player_routine_scores_delete_admin ON public.player_routine_scores FOR DELETE USING (public.current_user_is_players_admin());

-- ---------------------------------------------------------------------------
-- 6. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_session_runs_player_id ON public.session_runs(player_id);
CREATE INDEX idx_session_runs_calendar_id ON public.session_runs(calendar_id);

CREATE INDEX idx_dart_scores_training_id ON public.dart_scores(training_id);
CREATE INDEX idx_dart_scores_player_id ON public.dart_scores(player_id);
CREATE INDEX idx_dart_scores_training_routine ON public.dart_scores(training_id, routine_id);

CREATE INDEX idx_player_routine_scores_training_id ON public.player_routine_scores(training_id);
CREATE INDEX idx_player_routine_scores_player_id ON public.player_routine_scores(player_id);
