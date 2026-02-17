-- P7 Match Rating and Competition: competitions, matches tables and RLS
-- Spec: docs/P7_MATCH_RATING_COMPETITION_DOMAIN.md §4
-- players.match_rating and players.player_rating already exist (P1).

-- ---------------------------------------------------------------------------
-- 1. Table: competitions
-- ---------------------------------------------------------------------------
CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  competition_type text NOT NULL CHECK (competition_type IN ('competition_day', 'finals_night')),
  scheduled_at timestamptz,
  format_legs int,
  format_target int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.competitions IS 'P7: Competition events (e.g. competition day, finals night). Next competition derived from scheduled_at + cohort.';

CREATE TRIGGER competitions_updated_at
  BEFORE UPDATE ON public.competitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Table: matches (one row per player per match)
-- ---------------------------------------------------------------------------
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  competition_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL,
  calendar_id uuid REFERENCES public.calendar(id) ON DELETE SET NULL,
  played_at timestamptz NOT NULL DEFAULT now(),
  format_best_of int NOT NULL CHECK (format_best_of >= 5),
  legs_won int NOT NULL,
  legs_lost int NOT NULL,
  total_legs int NOT NULL,
  three_dart_avg numeric,
  player_3da_baseline numeric,
  doubles_attempted int,
  doubles_hit int,
  doubles_pct numeric,
  opponent_rating_at_match numeric,
  rating_difference numeric,
  match_rating numeric NOT NULL,
  weight numeric NOT NULL,
  eligible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (player_id <> opponent_id),
  CHECK (total_legs = legs_won + legs_lost)
);

COMMENT ON TABLE public.matches IS 'P7: One row per player per match. Two rows per head-to-head (one per player). MR/OMR/PR updated after insert.';

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_matches_player_id ON public.matches(player_id);
CREATE INDEX idx_matches_opponent_id ON public.matches(opponent_id);
CREATE INDEX idx_matches_competition_id ON public.matches(competition_id);
CREATE INDEX idx_matches_played_at ON public.matches(played_at DESC);

-- ---------------------------------------------------------------------------
-- 3. RLS: competitions
-- ---------------------------------------------------------------------------
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY competitions_select_admin ON public.competitions
  FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY competitions_insert_admin ON public.competitions
  FOR INSERT WITH CHECK (public.current_user_is_players_admin());
CREATE POLICY competitions_update_admin ON public.competitions
  FOR UPDATE USING (public.current_user_is_players_admin());
CREATE POLICY competitions_delete_admin ON public.competitions
  FOR DELETE USING (public.current_user_is_players_admin());

-- Players can SELECT competitions for their cohort(s) or cohort_id IS NULL
CREATE POLICY competitions_select_player ON public.competitions
  FOR SELECT USING (
    cohort_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.cohort_members cm
      WHERE cm.cohort_id = competitions.cohort_id
        AND cm.player_id = public.current_user_player_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. RLS: matches
-- ---------------------------------------------------------------------------
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY matches_select_admin ON public.matches
  FOR SELECT USING (public.current_user_is_players_admin());
CREATE POLICY matches_insert_admin ON public.matches
  FOR INSERT WITH CHECK (public.current_user_is_players_admin());

-- Players can SELECT own matches or where they are opponent
CREATE POLICY matches_select_player ON public.matches
  FOR SELECT USING (
    player_id = public.current_user_player_id()
    OR opponent_id = public.current_user_player_id()
  );
-- Players can INSERT only their own match row (player_id = self)
CREATE POLICY matches_insert_player ON public.matches
  FOR INSERT WITH CHECK (player_id = public.current_user_player_id());

-- No UPDATE/DELETE policies: match records are immutable after insert (admin corrections could be added later).
