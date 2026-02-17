-- P7: Allow players to SELECT cohort_members in cohorts they belong to (for opponent list in Record match).
CREATE POLICY cohort_members_select_same_cohort ON public.cohort_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cohort_members cm2
      WHERE cm2.cohort_id = cohort_members.cohort_id
        AND cm2.player_id = public.current_user_player_id()
    )
  );
