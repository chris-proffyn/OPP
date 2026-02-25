-- Global feature flags (app-level). Default voice_enabled = false.
-- When voice_enabled is false: hide voice UI and treat score input as manual.

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  value boolean NOT NULL
);

COMMENT ON TABLE public.feature_flags IS 'App feature flags. Read by app; only admins may update.';

-- Default: voice input disabled
INSERT INTO public.feature_flags (key, value)
  VALUES ('voice_enabled', false)
  ON CONFLICT (key) DO NOTHING;

-- RLS: anyone authenticated can read; only admins can update
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_flags_select ON public.feature_flags;
CREATE POLICY feature_flags_select
  ON public.feature_flags FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS feature_flags_update ON public.feature_flags;
CREATE POLICY feature_flags_update
  ON public.feature_flags FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.players p WHERE p.user_id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS feature_flags_insert ON public.feature_flags;
CREATE POLICY feature_flags_insert
  ON public.feature_flags FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.user_id = auth.uid() AND p.role = 'admin'));
