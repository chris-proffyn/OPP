-- P7: Allow recording player to insert both match rows (player + opponent perspective).
-- When player A records a match vs B, we insert (A,B) and (B,A); A must be allowed to insert (B,A).
DROP POLICY IF EXISTS matches_insert_player ON public.matches;
CREATE POLICY matches_insert_player ON public.matches
  FOR INSERT WITH CHECK (
    player_id = public.current_user_player_id()
    OR opponent_id = public.current_user_player_id()
  );
