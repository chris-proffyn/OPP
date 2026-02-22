-- Fix infinite recursion in calendar_select_ita: the policy must not SELECT from calendar.
-- Use cohort_id instead so we only query cohorts.

DROP POLICY IF EXISTS calendar_select_ita ON public.calendar;

CREATE POLICY calendar_select_ita ON public.calendar
FOR SELECT
USING (
  cohort_id IN (SELECT id FROM public.cohorts WHERE name = 'ITA')
);

COMMENT ON POLICY calendar_select_ita ON public.calendar IS
'ITA Update: players can read the global ITA calendar row to self-assign and start ITA.';
