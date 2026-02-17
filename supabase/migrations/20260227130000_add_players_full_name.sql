-- Add optional full name to players (in addition to nickname).

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS full_name text;

COMMENT ON COLUMN public.players.full_name IS 'Optional full name (e.g. legal or preferred full name). Nickname remains the display name.';
