-- Bulk test user creation: test_user_seq for atomic N allocation.
-- Spec: docs/OPP_BULK_TEST_USER_CREATION_IMPLEMENTATION_CHECKLIST.md §3.
-- Allocation: UPDATE test_user_seq SET next_n = next_n + :count WHERE key = 'opp'
--   RETURNING next_n - :count AS start_n; use start_n .. start_n+count-1 for job.

-- ---------------------------------------------------------------------------
-- 1. Table: test_user_seq
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_user_seq (
  key text PRIMARY KEY,
  next_n int NOT NULL
);

COMMENT ON TABLE public.test_user_seq IS 'Atomic counter for test user email N (proffyndev+opp{N}@gmail.com). Key ''opp''; next_n is the next value to allocate. Edge Function uses service role to UPDATE and allocate ranges.';

-- ---------------------------------------------------------------------------
-- 2. Seed row
-- ---------------------------------------------------------------------------
-- If test users already exist, start after the current max N to avoid reuse.
INSERT INTO public.test_user_seq (key, next_n)
VALUES (
  'opp',
  1 + COALESCE(
    (SELECT MAX(test_user_seq_n) FROM public.players WHERE test_user_seq_n IS NOT NULL),
    0
  )
)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. RLS — only admins (or service role) can SELECT/UPDATE
-- ---------------------------------------------------------------------------
ALTER TABLE public.test_user_seq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS test_user_seq_select_admin ON public.test_user_seq;
CREATE POLICY test_user_seq_select_admin ON public.test_user_seq
  FOR SELECT USING (public.current_user_is_players_admin());

DROP POLICY IF EXISTS test_user_seq_update_admin ON public.test_user_seq;
CREATE POLICY test_user_seq_update_admin ON public.test_user_seq
  FOR UPDATE USING (public.current_user_is_players_admin());

-- No INSERT policy: the only row is created by this migration. Edge Function
-- uses service role and bypasses RLS for allocation (UPDATE ... RETURNING).
