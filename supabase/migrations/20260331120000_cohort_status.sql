-- Cohort status: DRAFT, PROPOSED, CONFIRMED, LIVE, OVERDUE, COMPLETE.
-- Spec: docs/OPP_COHORT_MANAGEMENT_IMPLEMENTATION_CHECKLIST.md §1, OPP_COHORT_MANAGEMENT_DOMAIN.md.

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS cohort_status text NOT NULL DEFAULT 'draft'
  CHECK (cohort_status IN ('draft', 'proposed', 'confirmed', 'live', 'overdue', 'complete'));

COMMENT ON COLUMN public.cohorts.cohort_status IS 'Cohort lifecycle: draft (no members), proposed (has members, editable), confirmed (approved, locked), live (started), overdue (past end_date, not all complete), complete (all sessions done).';

-- Backfill: cohorts with at least one member → proposed; others stay draft.
UPDATE public.cohorts c
SET cohort_status = 'proposed'
WHERE EXISTS (SELECT 1 FROM public.cohort_members cm WHERE cm.cohort_id = c.id)
  AND c.cohort_status = 'draft';
