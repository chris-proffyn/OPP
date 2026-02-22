-- Add default score input mode for player (voice vs manual). Used by GE step page.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS score_input_mode text NOT NULL DEFAULT 'manual'
  CHECK (score_input_mode IN ('voice', 'manual'));

COMMENT ON COLUMN public.players.score_input_mode IS 'Default score input mode for this user: voice or manual.';
