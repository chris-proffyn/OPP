-- P2 Training Content: schedules, sessions, routines, schedule_entries, session_routines, routine_steps, level_requirements
-- Spec: docs/P2_TRAINING_CONTENT_DOMAIN.md §4–5, §8

-- ---------------------------------------------------------------------------
-- 1. Tables (dependency order: schedules, sessions, routines; then child tables)
-- ---------------------------------------------------------------------------

CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  day_no int NOT NULL CHECK (day_no >= 1),
  session_no int NOT NULL CHECK (session_no >= 1),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, day_no, session_no)
);

CREATE TABLE public.session_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  routine_no int NOT NULL CHECK (routine_no >= 1),
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, routine_no)
);

CREATE TABLE public.routine_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  step_no int NOT NULL CHECK (step_no >= 1),
  target text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routine_id, step_no)
);

CREATE TABLE public.level_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_level int NOT NULL CHECK (min_level >= 0),
  tgt_hits int NOT NULL CHECK (tgt_hits >= 0),
  darts_allowed int NOT NULL CHECK (darts_allowed >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (min_level)
);

COMMENT ON TABLE public.schedules IS 'P2: Training programme (e.g. Beginner Daily).';
COMMENT ON TABLE public.schedule_entries IS 'P2: Which session runs on which day/slot.';
COMMENT ON TABLE public.sessions IS 'P2: Named session (e.g. Singles 1..10).';
COMMENT ON TABLE public.session_routines IS 'P2: Order of routines in a session.';
COMMENT ON TABLE public.routines IS 'P2: Named routine with steps.';
COMMENT ON TABLE public.routine_steps IS 'P2: One target per step (e.g. S20, D16).';
COMMENT ON TABLE public.level_requirements IS 'P2: Per-decade target hits/darts for TR.';

-- ---------------------------------------------------------------------------
-- 2. Trigger: updated_at on all seven tables (generic function)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER schedules_updated_at
  BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER schedule_entries_updated_at
  BEFORE UPDATE ON public.schedule_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER session_routines_updated_at
  BEFORE UPDATE ON public.session_routines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER routines_updated_at
  BEFORE UPDATE ON public.routines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER routine_steps_updated_at
  BEFORE UPDATE ON public.routine_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER level_requirements_updated_at
  BEFORE UPDATE ON public.level_requirements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security (admin-only via current_user_is_players_admin)
-- ---------------------------------------------------------------------------

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_requirements ENABLE ROW LEVEL SECURITY;

-- Schedules
CREATE POLICY schedules_select_admin ON public.schedules FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY schedules_insert_admin ON public.schedules FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY schedules_update_admin ON public.schedules FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY schedules_delete_admin ON public.schedules FOR DELETE USING (public.current_user_is_players_admin());

-- Schedule entries
CREATE POLICY schedule_entries_select_admin ON public.schedule_entries FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY schedule_entries_insert_admin ON public.schedule_entries FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY schedule_entries_update_admin ON public.schedule_entries FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY schedule_entries_delete_admin ON public.schedule_entries FOR DELETE USING (public.current_user_is_players_admin());

-- Sessions
CREATE POLICY sessions_select_admin ON public.sessions FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY sessions_insert_admin ON public.sessions FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY sessions_update_admin ON public.sessions FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY sessions_delete_admin ON public.sessions FOR DELETE USING (public.current_user_is_players_admin());

-- Session routines
CREATE POLICY session_routines_select_admin ON public.session_routines FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY session_routines_insert_admin ON public.session_routines FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY session_routines_update_admin ON public.session_routines FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY session_routines_delete_admin ON public.session_routines FOR DELETE USING (public.current_user_is_players_admin());

-- Routines
CREATE POLICY routines_select_admin ON public.routines FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY routines_insert_admin ON public.routines FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY routines_update_admin ON public.routines FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY routines_delete_admin ON public.routines FOR DELETE USING (public.current_user_is_players_admin());

-- Routine steps
CREATE POLICY routine_steps_select_admin ON public.routine_steps FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY routine_steps_insert_admin ON public.routine_steps FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY routine_steps_update_admin ON public.routine_steps FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY routine_steps_delete_admin ON public.routine_steps FOR DELETE USING (public.current_user_is_players_admin());

-- Level requirements
CREATE POLICY level_requirements_select_admin ON public.level_requirements FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY level_requirements_insert_admin ON public.level_requirements FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY level_requirements_update_admin ON public.level_requirements FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY level_requirements_delete_admin ON public.level_requirements FOR DELETE USING (public.current_user_is_players_admin());

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_schedule_entries_schedule_id ON public.schedule_entries(schedule_id);
CREATE INDEX idx_schedule_entries_session_id ON public.schedule_entries(session_id);
CREATE INDEX idx_session_routines_session_id ON public.session_routines(session_id);
CREATE INDEX idx_session_routines_routine_id ON public.session_routines(routine_id);
CREATE INDEX idx_routine_steps_routine_id ON public.routine_steps(routine_id);

-- ---------------------------------------------------------------------------
-- 5. Seed: default level_requirements (decades 0–90 per TR spec §7)
-- ---------------------------------------------------------------------------

INSERT INTO public.level_requirements (min_level, tgt_hits, darts_allowed) VALUES
  (0, 0, 9),
  (10, 1, 9),
  (20, 2, 9),
  (30, 3, 9),
  (40, 4, 9),
  (50, 5, 9),
  (60, 6, 9),
  (70, 7, 9),
  (80, 8, 9),
  (90, 9, 9);
