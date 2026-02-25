-- Bulk test user creation: add test-user columns to players.
-- Spec: docs/OPP_BULK_TEST_USER_CREATION_IMPLEMENTATION_CHECKLIST.md §1.
-- Enables distinguishing test users, job tracking, and collision-safe N allocation.

-- ---------------------------------------------------------------------------
-- 1. Add columns to public.players
-- ---------------------------------------------------------------------------
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_test_user boolean NOT NULL DEFAULT false;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS test_user_job_id uuid;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS created_by_admin_id uuid REFERENCES public.players(id);

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS test_user_seq_n int;

COMMENT ON COLUMN public.players.is_test_user IS 'True when this player was created by admin bulk test-user creation. Exclude from analytics by default.';
COMMENT ON COLUMN public.players.test_user_job_id IS 'Set when created via bulk job; references test_user_jobs.id. Nullable until job table exists or when not created via job.';
COMMENT ON COLUMN public.players.created_by_admin_id IS 'Admin (players.id) who created this test user via bulk create.';
COMMENT ON COLUMN public.players.test_user_seq_n IS 'N in email pattern proffyndev+opp{N}@gmail.com. Unique per test user when set.';

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_players_is_test_user ON public.players(is_test_user);

CREATE INDEX IF NOT EXISTS idx_players_test_user_job_id ON public.players(test_user_job_id)
  WHERE test_user_job_id IS NOT NULL;

-- Avoid duplicate N allocation; partial unique so only one row per non-null N.
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_test_user_seq_n_unique
  ON public.players(test_user_seq_n)
  WHERE test_user_seq_n IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
-- No policy change: existing players_select_admin and players_update_admin
-- (via current_user_is_players_admin()) already allow admins to SELECT/UPDATE
-- all rows, including test users. Test-user rows are created by Edge
-- Function using service role (RLS bypassed).
