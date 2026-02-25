-- Cohort status §2: when first member is added, move cohort from draft → proposed.
-- Spec: OPP_COHORT_MANAGEMENT_IMPLEMENTATION_CHECKLIST.md §2 (DRAFT → PROPOSED).

CREATE OR REPLACE FUNCTION public.cohort_members_set_proposed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cohorts
  SET cohort_status = 'proposed'
  WHERE id = NEW.cohort_id
    AND cohort_status = 'draft';
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.cohort_members_set_proposed() IS
  'On cohort_members INSERT: set cohort to proposed when it was draft (first member added).';

DROP TRIGGER IF EXISTS cohort_members_set_proposed_trigger ON public.cohort_members;
CREATE TRIGGER cohort_members_set_proposed_trigger
  AFTER INSERT ON public.cohort_members
  FOR EACH ROW
  EXECUTE FUNCTION public.cohort_members_set_proposed();
