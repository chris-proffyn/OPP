-- Atomic N allocation for bulk test user creation.
-- Spec: docs/OPP_BULK_TEST_USER_CREATION_IMPLEMENTATION_CHECKLIST.md §3, §7.
-- Called by Edge Function (service role) to allocate a range of N for proffyndev+opp{N}@gmail.com.

CREATE OR REPLACE FUNCTION public.allocate_test_user_n(p_count int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_n int;
BEGIN
  IF p_count IS NULL OR p_count < 1 THEN
    RAISE EXCEPTION 'p_count must be >= 1';
  END IF;
  UPDATE public.test_user_seq
  SET next_n = next_n + p_count
  WHERE key = 'opp'
  RETURNING (next_n - p_count) INTO start_n;
  IF start_n IS NULL THEN
    RAISE EXCEPTION 'test_user_seq row for key ''opp'' not found';
  END IF;
  RETURN start_n;
END;
$$;

COMMENT ON FUNCTION public.allocate_test_user_n(int) IS 'Allocates the next p_count N values for test user emails; returns the first N (start_n). Call with service role.';
