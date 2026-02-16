-- P5 Training Rating (optional): ITA audit columns on players.
-- Spec: docs/P5_TRAINING_RATING_DOMAIN.md §4.1; docs/P5_TRAINING_RATING_IMPLEMENTATION_TASKS.md §1.
-- No RLS change: players_update_own and players_update_admin already allow updating own/admin rows.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS ita_score numeric,
  ADD COLUMN IF NOT EXISTS ita_completed_at timestamptz;

COMMENT ON COLUMN public.players.ita_score IS 'P5: ITA score (e.g. L29) for display/audit; set when Initial Training Assessment is completed.';
COMMENT ON COLUMN public.players.ita_completed_at IS 'P5: When ITA was completed; used for "has done ITA" and optional re-assessment flow.';
