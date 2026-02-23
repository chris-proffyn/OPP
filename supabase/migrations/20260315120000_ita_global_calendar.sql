-- ITA Update: global ITA calendar so players can complete ITA without being in a cohort schedule.
-- Per OPP_ITA_UPDATE_DOMAIN.md: ITA lives outside cohort/schedule; get-or-create ITA entry for any player.
-- Creates: one session "ITA" (if missing), schedule "ITA Schedule", cohort "ITA", one calendar row.
-- Adds RLS so players can insert themselves into player_calendar for that calendar (self-assign ITA).

-- 1) Ensure ITA session exists (by name)
INSERT INTO public.sessions (id, name, created_at, updated_at)
SELECT gen_random_uuid(), 'ITA', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.sessions
  WHERE LOWER(TRIM(name)) IN ('ita', 'initial training assessment')
);

-- 2) Create schedule "ITA Schedule" and one entry (day 1, session 1) pointing to ITA session
-- Use a fixed name so we can find it; create only if not exists
INSERT INTO public.schedules (id, name, created_at, updated_at)
SELECT gen_random_uuid(), 'ITA Schedule', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM public.schedules WHERE name = 'ITA Schedule');

INSERT INTO public.schedule_entries (schedule_id, day_no, session_no, session_id, created_at, updated_at)
SELECT s.id, 1, 1, sess.id, now(), now()
FROM public.schedules s
CROSS JOIN (SELECT id FROM public.sessions WHERE LOWER(TRIM(name)) IN ('ita', 'initial training assessment') LIMIT 1) sess
WHERE s.name = 'ITA Schedule'
  AND NOT EXISTS (
    SELECT 1 FROM public.schedule_entries se
    WHERE se.schedule_id = s.id AND se.day_no = 1 AND se.session_no = 1
  );

-- 3) Create cohort "ITA" (start/end far range) if not exists
INSERT INTO public.cohorts (id, name, level, start_date, end_date, schedule_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ITA', 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '10 years', s.id, now(), now()
FROM public.schedules s
WHERE s.name = 'ITA Schedule'
  AND NOT EXISTS (SELECT 1 FROM public.cohorts WHERE name = 'ITA');

-- 4) Create one calendar row for ITA cohort/schedule/session
INSERT INTO public.calendar (id, scheduled_at, cohort_id, schedule_id, day_no, session_no, session_id, created_at, updated_at)
SELECT gen_random_uuid(), now(), c.id, c.schedule_id, 1, 1, sess.id, now(), now()
FROM public.cohorts c
CROSS JOIN (SELECT id FROM public.sessions WHERE LOWER(TRIM(name)) IN ('ita', 'initial training assessment') LIMIT 1) sess
WHERE c.name = 'ITA'
  AND NOT EXISTS (
    SELECT 1 FROM public.calendar cal
    WHERE cal.cohort_id = c.id AND cal.day_no = 1 AND cal.session_no = 1
  );

-- 5a) RLS: allow authenticated user to read the ITA cohort row (so we can resolve calendar id)
DROP POLICY IF EXISTS cohorts_select_ita ON public.cohorts;
CREATE POLICY cohorts_select_ita ON public.cohorts
FOR SELECT
USING (name = 'ITA');

COMMENT ON POLICY cohorts_select_ita ON public.cohorts IS
'ITA Update: players can read the global ITA cohort to resolve calendar for self-assign.';

-- 5b) RLS: allow authenticated player to read the ITA calendar row (so we can get calendar_id before inserting player_calendar)
DROP POLICY IF EXISTS calendar_select_ita ON public.calendar;
CREATE POLICY calendar_select_ita ON public.calendar
FOR SELECT
USING (
  id IN (
    SELECT cal.id FROM public.calendar cal
    JOIN public.cohorts co ON cal.cohort_id = co.id
    WHERE co.name = 'ITA'
  )
);

COMMENT ON POLICY calendar_select_ita ON public.calendar IS
'ITA Update: players can read the global ITA calendar row to self-assign and start ITA.';

-- 6) RLS: allow player to INSERT into player_calendar for the ITA calendar only (self-assign)
DROP POLICY IF EXISTS player_calendar_insert_ita ON public.player_calendar;
CREATE POLICY player_calendar_insert_ita ON public.player_calendar
FOR INSERT
WITH CHECK (
  player_id = public.current_user_player_id()
  AND calendar_id IN (
    SELECT cal.id FROM public.calendar cal
    JOIN public.cohorts co ON cal.cohort_id = co.id
    WHERE co.name = 'ITA'
    LIMIT 1
  )
);

COMMENT ON POLICY player_calendar_insert_ita ON public.player_calendar IS
'ITA Update: players can self-assign the global ITA calendar entry so they can complete ITA without a cohort schedule.';
