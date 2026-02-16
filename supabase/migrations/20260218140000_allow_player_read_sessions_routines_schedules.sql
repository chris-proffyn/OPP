-- P4 GE: Allow authenticated users to read sessions, routines, and schedules for game screen.
-- Admin remains the only role that can INSERT/UPDATE/DELETE on these tables.

CREATE POLICY sessions_select_authenticated ON public.sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY session_routines_select_authenticated ON public.session_routines
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY routines_select_authenticated ON public.routines
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY routine_steps_select_authenticated ON public.routine_steps
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY schedules_select_authenticated ON public.schedules
  FOR SELECT USING (auth.uid() IS NOT NULL);
