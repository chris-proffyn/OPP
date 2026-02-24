-- Solo training: allow authenticated players to create a solo cohort, add themselves, and generate calendar.
-- Per OPP_SINGLE_PLAYER_TRAINING_IMPLEMENTATION_CHECKLIST §2–4. Schedules/schedule_entries must be readable for schedule picker and calendar generation.
-- Re-runnable: each policy is dropped if exists before create.

-- 1) Schedule entries: allow authenticated users to read (needed for solo calendar generation and schedule list flow).
DROP POLICY IF EXISTS schedule_entries_select_authenticated ON public.schedule_entries;
CREATE POLICY schedule_entries_select_authenticated ON public.schedule_entries
  FOR SELECT USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY schedule_entries_select_authenticated ON public.schedule_entries IS
  'Solo training: players read schedule entries to list schedules and generate solo calendar.';

-- 2) Cohorts: allow INSERT for solo cohort (name must end with ' solo cohort').
DROP POLICY IF EXISTS cohorts_insert_solo ON public.cohorts;
CREATE POLICY cohorts_insert_solo ON public.cohorts
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND name LIKE '% solo cohort'
  );

COMMENT ON POLICY cohorts_insert_solo ON public.cohorts IS
  'Solo training: player can create one cohort with name ending " solo cohort".';

-- 3) Cohort members: allow INSERT when adding self to a solo cohort (cohort name ends with ' solo cohort').
DROP POLICY IF EXISTS cohort_members_insert_solo ON public.cohort_members;
CREATE POLICY cohort_members_insert_solo ON public.cohort_members
  FOR INSERT
  WITH CHECK (
    player_id = public.current_user_player_id()
    AND cohort_id IN (SELECT id FROM public.cohorts WHERE name LIKE '% solo cohort')
  );

COMMENT ON POLICY cohort_members_insert_solo ON public.cohort_members IS
  'Solo training: player can add themselves to a cohort they created (solo cohort).';

-- 4) Calendar: allow INSERT for calendar rows belonging to a solo cohort.
DROP POLICY IF EXISTS calendar_insert_solo ON public.calendar;
CREATE POLICY calendar_insert_solo ON public.calendar
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND cohort_id IN (SELECT id FROM public.cohorts WHERE name LIKE '% solo cohort')
  );

COMMENT ON POLICY calendar_insert_solo ON public.calendar IS
  'Solo training: player can insert calendar rows for their solo cohort.';

-- 5) Player calendar: allow INSERT when adding self for a calendar that belongs to a solo cohort.
DROP POLICY IF EXISTS player_calendar_insert_solo ON public.player_calendar;
CREATE POLICY player_calendar_insert_solo ON public.player_calendar
  FOR INSERT
  WITH CHECK (
    player_id = public.current_user_player_id()
    AND calendar_id IN (
      SELECT c.id FROM public.calendar c
      JOIN public.cohorts co ON c.cohort_id = co.id
      WHERE co.name LIKE '% solo cohort'
    )
  );

COMMENT ON POLICY player_calendar_insert_solo ON public.player_calendar IS
  'Solo training: player can assign themselves to calendar entries of their solo cohort.';
