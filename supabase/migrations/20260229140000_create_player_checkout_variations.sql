-- Player-specific checkout variations: one row per (player_id, total).
-- Players have full CRUD on their own rows. Empty by default; used only for overrides/additions.

CREATE TABLE public.player_checkout_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  total int NOT NULL CHECK (total >= 2 AND total <= 170),
  dart1 text,
  dart2 text,
  dart3 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, total)
);

COMMENT ON TABLE public.player_checkout_variations IS 'Player-specific checkout preferences (total + dart1, dart2, dart3). Overrides/additions to reference checkout_combinations.';

CREATE INDEX idx_player_checkout_variations_player_id ON public.player_checkout_variations(player_id);
CREATE INDEX idx_player_checkout_variations_player_total ON public.player_checkout_variations(player_id, total);

ALTER TABLE public.player_checkout_variations ENABLE ROW LEVEL SECURITY;

-- Players can only see and modify their own variations.
CREATE POLICY player_checkout_variations_select_own ON public.player_checkout_variations
  FOR SELECT USING (player_id = public.current_user_player_id());

CREATE POLICY player_checkout_variations_insert_own ON public.player_checkout_variations
  FOR INSERT WITH CHECK (player_id = public.current_user_player_id());

CREATE POLICY player_checkout_variations_update_own ON public.player_checkout_variations
  FOR UPDATE USING (player_id = public.current_user_player_id());

CREATE POLICY player_checkout_variations_delete_own ON public.player_checkout_variations
  FOR DELETE USING (player_id = public.current_user_player_id());
