-- Allow players to delete their own dart_scores for "Correct visit" (revert last visit).
-- Per OPP_ROUTINE_PAGE_IMPLEMENTATION_CHECKLIST §6. Admin retains full access via dart_scores_delete_admin.
CREATE POLICY dart_scores_delete_own ON public.dart_scores
  FOR DELETE
  USING (player_id = public.current_user_player_id());
