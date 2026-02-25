-- Bulk test user creation: test_user_jobs table and FK from players.
-- Spec: docs/OPP_BULK_TEST_USER_CREATION_IMPLEMENTATION_CHECKLIST.md §2.

-- ---------------------------------------------------------------------------
-- 1. Table: test_user_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_user_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_admin_id uuid NOT NULL REFERENCES public.players(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  requested_count int NOT NULL,
  start_n int,
  end_n int,
  status text NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL')),
  created_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  errors_json jsonb,
  notes text
);

COMMENT ON TABLE public.test_user_jobs IS 'One row per bulk test-user create (or delete) job. Tracks requested vs created counts and per-user errors.';
COMMENT ON COLUMN public.test_user_jobs.created_by_admin_id IS 'Admin (players.id) who started the job.';
COMMENT ON COLUMN public.test_user_jobs.requested_count IS 'Number of test users requested in this job.';
COMMENT ON COLUMN public.test_user_jobs.start_n IS 'First N in email range (proffyndev+opp{N}@gmail.com).';
COMMENT ON COLUMN public.test_user_jobs.end_n IS 'Last N in email range.';
COMMENT ON COLUMN public.test_user_jobs.status IS 'RUNNING | COMPLETED | FAILED | PARTIAL.';
COMMENT ON COLUMN public.test_user_jobs.errors_json IS 'Per-user failure details (e.g. array of { n, email, error }).';

-- ---------------------------------------------------------------------------
-- 2. FK from players.test_user_job_id (added in §1)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.players'::regclass AND conname = 'fk_players_test_user_job_id'
  ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT fk_players_test_user_job_id
      FOREIGN KEY (test_user_job_id) REFERENCES public.test_user_jobs(id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Index for listing jobs
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_test_user_jobs_created_at ON public.test_user_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_user_jobs_created_by_admin_id ON public.test_user_jobs(created_by_admin_id);

-- ---------------------------------------------------------------------------
-- 4. RLS — only admins can SELECT, INSERT, UPDATE
-- ---------------------------------------------------------------------------
ALTER TABLE public.test_user_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS test_user_jobs_select_admin ON public.test_user_jobs;
CREATE POLICY test_user_jobs_select_admin ON public.test_user_jobs
  FOR SELECT USING (public.current_user_is_players_admin());

DROP POLICY IF EXISTS test_user_jobs_insert_admin ON public.test_user_jobs;
CREATE POLICY test_user_jobs_insert_admin ON public.test_user_jobs
  FOR INSERT WITH CHECK (public.current_user_is_players_admin());

DROP POLICY IF EXISTS test_user_jobs_update_admin ON public.test_user_jobs;
CREATE POLICY test_user_jobs_update_admin ON public.test_user_jobs
  FOR UPDATE USING (public.current_user_is_players_admin());

-- No DELETE policy for v1; jobs are append-only. Bulk create runs under
-- service role in Edge Function so RLS is bypassed for job INSERT/UPDATE.
