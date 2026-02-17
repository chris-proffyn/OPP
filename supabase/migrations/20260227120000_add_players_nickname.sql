-- Add Nickname column to players; used as the display name throughout the app.
-- Backfill from display_name so existing rows have a value.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS nickname text;

UPDATE public.players
  SET nickname = COALESCE(display_name, '')
  WHERE nickname IS NULL;

ALTER TABLE public.players
  ALTER COLUMN nickname SET NOT NULL;

ALTER TABLE public.players
  ALTER COLUMN nickname SET DEFAULT '';

COMMENT ON COLUMN public.players.nickname IS 'Player nickname; used as the display name in UI and reports.';
