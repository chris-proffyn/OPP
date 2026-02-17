-- Set all players to the highest membership tier (platinum).
-- Use for dev/demo or one-off promotion. Reversible by updating back to desired tiers.

UPDATE public.players
SET tier = 'platinum';
