-- Allow admins to update (and insert) checkout_combinations for reference data maintenance.
-- SELECT remains for any authenticated user (existing policy).

CREATE POLICY checkout_combinations_update_admin ON public.checkout_combinations
  FOR UPDATE USING (public.current_user_is_players_admin());

CREATE POLICY checkout_combinations_insert_admin ON public.checkout_combinations
  FOR INSERT WITH CHECK (public.current_user_is_players_admin());
