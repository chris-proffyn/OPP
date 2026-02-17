-- Allow players to read a calendar entry when they have a player_calendar row for it.
-- Fixes "Session not found or you don't have access" when a player has the session
-- assigned but cohort-based visibility fails (e.g. RLS context), and ensures
-- getCalendarEntryById succeeds for PlaySessionPage when getAllSessionsForPlayer
-- includes the session.
CREATE POLICY calendar_select_assigned ON public.calendar FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.player_calendar pc
    WHERE pc.calendar_id = calendar.id
      AND pc.player_id = public.current_user_player_id()
  )
);
