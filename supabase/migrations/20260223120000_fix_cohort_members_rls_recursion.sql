-- Fix infinite recursion: policy cohort_members_select_same_cohort queried
-- cohort_members from within cohort_members RLS. Use a SECURITY DEFINER
-- function so the membership check bypasses RLS.

CREATE OR REPLACE FUNCTION public.current_user_in_cohort(p_cohort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cohort_members
    WHERE cohort_id = p_cohort_id
      AND player_id = public.current_user_player_id()
  );
$$;

COMMENT ON FUNCTION public.current_user_in_cohort(uuid) IS 'P7: True if current user''s player is in the given cohort. Used by RLS to avoid recursion.';

DROP POLICY IF EXISTS cohort_members_select_same_cohort ON public.cohort_members;

CREATE POLICY cohort_members_select_same_cohort ON public.cohort_members
  FOR SELECT USING (public.current_user_in_cohort(cohort_id));
