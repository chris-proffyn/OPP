-- Allow admins full CRUD on level_averages. SELECT remains for any authenticated user.

CREATE POLICY level_averages_insert_admin ON public.level_averages
  FOR INSERT WITH CHECK (public.current_user_is_players_admin());

CREATE POLICY level_averages_update_admin ON public.level_averages
  FOR UPDATE USING (public.current_user_is_players_admin());

CREATE POLICY level_averages_delete_admin ON public.level_averages
  FOR DELETE USING (public.current_user_is_players_admin());
