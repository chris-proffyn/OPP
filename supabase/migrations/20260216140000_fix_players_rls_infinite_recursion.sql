-- Fix infinite recursion: admin policies must not query players from within
-- players' RLS. Use a SECURITY DEFINER function so the check bypasses RLS.

CREATE OR REPLACE FUNCTION public.current_user_is_players_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  );
$$;

-- Replace admin policies to use the function instead of inline subquery
DROP POLICY IF EXISTS players_select_admin ON public.players;
DROP POLICY IF EXISTS players_update_admin ON public.players;

CREATE POLICY players_select_admin ON public.players
  FOR SELECT USING (public.current_user_is_players_admin());

CREATE POLICY players_update_admin ON public.players
  FOR UPDATE USING (public.current_user_is_players_admin());
