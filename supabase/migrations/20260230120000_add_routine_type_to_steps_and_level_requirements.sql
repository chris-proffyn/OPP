-- OPP Scoring Update (§1): routine_type on routine_steps and level_requirements.
-- Values: SS (single segment), SD (double), ST (treble), C (checkout). Drives expected-hit calculation per OPP_SCORING_UPDATE.md.

-- ---------------------------------------------------------------------------
-- 1. routine_steps — add routine_type
-- ---------------------------------------------------------------------------

ALTER TABLE public.routine_steps
  ADD COLUMN IF NOT EXISTS routine_type text NOT NULL DEFAULT 'SS';

ALTER TABLE public.routine_steps
  DROP CONSTRAINT IF EXISTS routine_steps_routine_type_check;

ALTER TABLE public.routine_steps
  ADD CONSTRAINT routine_steps_routine_type_check
  CHECK (routine_type IN ('SS', 'SD', 'ST', 'C'));

-- Backfill from target: D… → SD, T… → ST, else SS (S, number, Bull, etc.)
UPDATE public.routine_steps
SET routine_type = CASE
  WHEN left(trim(target), 1) = 'D' THEN 'SD'
  WHEN left(trim(target), 1) = 'T' THEN 'ST'
  ELSE 'SS'
END;

COMMENT ON COLUMN public.routine_steps.routine_type IS 'SS=single segment, SD=double, ST=treble, C=checkout. Used for expected-hit calculation from level_averages.';

-- ---------------------------------------------------------------------------
-- 2. level_requirements — add routine_type, change unique to (min_level, routine_type)
-- ---------------------------------------------------------------------------

ALTER TABLE public.level_requirements
  ADD COLUMN IF NOT EXISTS routine_type text;

UPDATE public.level_requirements
SET routine_type = 'SS'
WHERE routine_type IS NULL;

ALTER TABLE public.level_requirements
  ALTER COLUMN routine_type SET NOT NULL,
  ALTER COLUMN routine_type SET DEFAULT 'SS';

ALTER TABLE public.level_requirements
  DROP CONSTRAINT IF EXISTS level_requirements_routine_type_check;

ALTER TABLE public.level_requirements
  ADD CONSTRAINT level_requirements_routine_type_check
  CHECK (routine_type IN ('SS', 'SD', 'ST', 'C'));

-- Replace UNIQUE (min_level) with UNIQUE (min_level, routine_type)
ALTER TABLE public.level_requirements
  DROP CONSTRAINT IF EXISTS level_requirements_min_level_key;

ALTER TABLE public.level_requirements
  ADD CONSTRAINT level_requirements_min_level_routine_type_key
  UNIQUE (min_level, routine_type);

COMMENT ON COLUMN public.level_requirements.routine_type IS 'SS/SD/ST/C. One row per (min_level, routine_type); tgt_hits and darts_allowed apply per type.';
