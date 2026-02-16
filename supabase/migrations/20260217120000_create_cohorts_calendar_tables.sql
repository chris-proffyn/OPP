-- P3 Cohorts and Calendar: cohorts, cohort_members, calendar, player_calendar
-- Spec: docs/P3_COHORTS_CALENDAR_DOMAIN.md §4–5, §9

-- ---------------------------------------------------------------------------
-- 1. Helper: current user's player id (for RLS player-scoped policies)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_player_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.players WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_player_id() IS 'P3: Returns players.id for the current auth user, or NULL. Used by RLS.';

-- ---------------------------------------------------------------------------
-- 2. Tables (dependency order: cohorts → cohort_members, calendar → player_calendar)
-- ---------------------------------------------------------------------------

CREATE TABLE public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level int NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cohorts IS 'P3: Finite training group with schedule and date range.';

CREATE TABLE public.cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, player_id)
);

COMMENT ON TABLE public.cohort_members IS 'P3: Assigns players to a cohort. At most one active cohort per player (enforced in app).';

CREATE TABLE public.calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_at timestamptz NOT NULL,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE RESTRICT,
  day_no int NOT NULL CHECK (day_no >= 1),
  session_no int NOT NULL CHECK (session_no >= 1),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, day_no, session_no)
);

COMMENT ON TABLE public.calendar IS 'P3: Planned session occurrences for a cohort (generated from schedule + start_date).';

CREATE TABLE public.player_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendar(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('planned', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, calendar_id)
);

COMMENT ON TABLE public.player_calendar IS 'P3: Player-specific calendar entry status (planned/completed). Used for next/available sessions.';

-- ---------------------------------------------------------------------------
-- 3. Triggers: updated_at (reuse P2 set_updated_at)
-- ---------------------------------------------------------------------------

CREATE TRIGGER cohorts_updated_at
  BEFORE UPDATE ON public.cohorts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cohort_members_updated_at
  BEFORE UPDATE ON public.cohort_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER calendar_updated_at
  BEFORE UPDATE ON public.calendar FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER player_calendar_updated_at
  BEFORE UPDATE ON public.player_calendar FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security (admin full; players read own cohort/calendar/player_calendar)
-- ---------------------------------------------------------------------------

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_calendar ENABLE ROW LEVEL SECURITY;

-- Cohorts: admin all; player SELECT if member
CREATE POLICY cohorts_select_admin ON public.cohorts FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY cohorts_select_member ON public.cohorts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.cohort_members cm WHERE cm.cohort_id = cohorts.id AND cm.player_id = public.current_user_player_id())
);
CREATE POLICY cohorts_insert_admin ON public.cohorts FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY cohorts_update_admin ON public.cohorts FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY cohorts_delete_admin ON public.cohorts FOR DELETE USING (public.current_user_is_players_admin());

-- Cohort members: admin all; player SELECT own rows
CREATE POLICY cohort_members_select_admin ON public.cohort_members FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY cohort_members_select_own ON public.cohort_members FOR SELECT USING (player_id = public.current_user_player_id());
CREATE POLICY cohort_members_insert_admin ON public.cohort_members FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY cohort_members_update_admin ON public.cohort_members FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY cohort_members_delete_admin ON public.cohort_members FOR DELETE USING (public.current_user_is_players_admin());

-- Calendar: admin all; player SELECT if in cohort
CREATE POLICY calendar_select_admin ON public.calendar FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY calendar_select_member ON public.calendar FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.cohort_members cm WHERE cm.cohort_id = calendar.cohort_id AND cm.player_id = public.current_user_player_id())
);
CREATE POLICY calendar_insert_admin ON public.calendar FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY calendar_update_admin ON public.calendar FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY calendar_delete_admin ON public.calendar FOR DELETE USING (public.current_user_is_players_admin());

-- Player calendar: admin all; player SELECT and UPDATE own rows; INSERT/DELETE admin only
CREATE POLICY player_calendar_select_admin ON public.player_calendar FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY player_calendar_select_own ON public.player_calendar FOR SELECT USING (player_id = public.current_user_player_id());
CREATE POLICY player_calendar_update_admin ON public.player_calendar FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY player_calendar_update_own ON public.player_calendar FOR UPDATE USING (player_id = public.current_user_player_id());
CREATE POLICY player_calendar_insert_admin ON public.player_calendar FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY player_calendar_delete_admin ON public.player_calendar FOR DELETE USING (public.current_user_is_players_admin());

-- ---------------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_cohort_members_cohort_id ON public.cohort_members(cohort_id);
CREATE INDEX idx_cohort_members_player_id ON public.cohort_members(player_id);
CREATE INDEX idx_calendar_cohort_id ON public.calendar(cohort_id);
CREATE INDEX idx_calendar_scheduled_at ON public.calendar(scheduled_at);
CREATE INDEX idx_player_calendar_player_id ON public.player_calendar(player_id);
CREATE INDEX idx_player_calendar_calendar_id ON public.player_calendar(calendar_id);
CREATE INDEX idx_player_calendar_player_status ON public.player_calendar(player_id, status);
