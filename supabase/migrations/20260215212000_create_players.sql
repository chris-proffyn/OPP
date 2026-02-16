-- P1 Foundation: players table, RLS, updated_at trigger
-- Spec: docs/P1_FOUNDATION_DOMAIN.md §4–5

-- ---------------------------------------------------------------------------
-- 1. Table: players
-- ---------------------------------------------------------------------------
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL,
  gender text CHECK (gender IN ('m', 'f', 'd')),
  age_range text,
  baseline_rating numeric,
  training_rating numeric,
  match_rating numeric,
  player_rating numeric,
  date_joined date NOT NULL DEFAULT current_date,
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.players IS 'One row per auth user; created on profile completion. P1 Foundation.';

-- ---------------------------------------------------------------------------
-- 2. Trigger: set updated_at on UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_players_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.set_players_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Own row: select, update, insert
CREATE POLICY players_select_own ON public.players
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY players_update_own ON public.players
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY players_insert_own ON public.players
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin: select and update all (admin = current user has role 'admin' in players)
CREATE POLICY players_select_admin ON public.players
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.players p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY players_update_admin ON public.players
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.players p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 4. Index for admin list by role
-- ---------------------------------------------------------------------------
CREATE INDEX idx_players_role ON public.players(role);
