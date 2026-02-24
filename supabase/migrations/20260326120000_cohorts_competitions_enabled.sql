-- Feature flag: enable or disable competitions within a cohort.
-- When false, cohort does not show competitions / match recording for that cohort.

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS competitions_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cohorts.competitions_enabled IS 'When true, competitions are enabled for this cohort; when false, competitions are disabled.';
