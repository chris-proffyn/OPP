-- Fix solo cohort insert RLS: ensure policy allows authenticated players to insert a row with name ending ' solo cohort'.
-- Use current_user_player_id() so the policy is consistent with cohort_members_insert_solo and requires a player row.

DROP POLICY IF EXISTS cohorts_insert_solo ON public.cohorts;

CREATE POLICY cohorts_insert_solo ON public.cohorts
  FOR INSERT
  WITH CHECK (
    public.current_user_player_id() IS NOT NULL
    AND name LIKE '% solo cohort'
  );

COMMENT ON POLICY cohorts_insert_solo ON public.cohorts IS
  'Solo training: player can create one cohort with name ending " solo cohort".';
