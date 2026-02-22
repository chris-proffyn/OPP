-- Backfill routine_type on routine_steps that still have default 'SS' but should be SD, ST, or C
-- based on target. Fixes ITA (and any other) routines created before we set routine_type explicitly
-- (e.g. by 20260315140000 / 20260315160000 before they were updated, or admin-created routines).
-- Idempotent: only updates rows where routine_type = 'SS' and target implies a different type.

-- D… → SD (doubles)
UPDATE public.routine_steps
SET routine_type = 'SD'
WHERE routine_type = 'SS'
  AND left(trim(target), 1) = 'D';

-- T… → ST (trebles)
UPDATE public.routine_steps
SET routine_type = 'ST'
WHERE routine_type = 'SS'
  AND left(trim(target), 1) = 'T';

-- O (checkout) → C. ITA checkout steps use target 'O'.
UPDATE public.routine_steps
SET routine_type = 'C'
WHERE routine_type = 'SS'
  AND trim(target) = 'O';
