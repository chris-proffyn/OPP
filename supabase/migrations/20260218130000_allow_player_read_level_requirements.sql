-- P4 GE: Allow authenticated users (players) to read level_requirements for level-check display.
-- Admin remains the only role that can INSERT/UPDATE/DELETE.

CREATE POLICY level_requirements_select_authenticated ON public.level_requirements
  FOR SELECT USING (auth.uid() IS NOT NULL);
