-- Ensure the session used by the global ITA calendar has 3 routines (Singles, Doubles, Checkout).
-- Fixes the case where multiple ITA sessions exist and the calendar points to one that had none.
-- Idempotent: if that session already has session_routines, no-op.

DO $$
DECLARE
  ita_session_id uuid;
  r_singles_id uuid;
  r_doubles_id uuid;
  r_checkout_id uuid;
  step_no int;
  routine_count int;
BEGIN
  -- Session that the global ITA calendar row actually uses (same as getGlobalITACalendarId logic)
  SELECT cal.session_id INTO ita_session_id
  FROM public.calendar cal
  JOIN public.cohorts co ON cal.cohort_id = co.id
  WHERE co.name = 'ITA'
  LIMIT 1;

  IF ita_session_id IS NULL THEN
    RETURN; -- No global ITA calendar (migration 20260315120000 not run or cohort missing)
  END IF;

  SELECT COUNT(*) INTO routine_count
  FROM public.session_routines
  WHERE session_id = ita_session_id;

  IF routine_count > 0 THEN
    RETURN; -- Already has routines (e.g. from 20260315140000 or admin)
  END IF;

  -- Add 3 routines to this session (same as 20260315140000)
  INSERT INTO public.routines (id, name, description, created_at, updated_at)
  VALUES (gen_random_uuid(), 'ITA Singles', 'Singles segment assessment', now(), now())
  RETURNING id INTO r_singles_id;
  FOR step_no IN 1..5 LOOP
    INSERT INTO public.routine_steps (routine_id, step_no, target, routine_type, created_at, updated_at)
    VALUES (r_singles_id, step_no, 'S20', 'SS', now(), now());
  END LOOP;

  INSERT INTO public.routines (id, name, description, created_at, updated_at)
  VALUES (gen_random_uuid(), 'ITA Doubles', 'Doubles assessment', now(), now())
  RETURNING id INTO r_doubles_id;
  FOR step_no IN 1..5 LOOP
    INSERT INTO public.routine_steps (routine_id, step_no, target, routine_type, created_at, updated_at)
    VALUES (r_doubles_id, step_no, 'D16', 'SD', now(), now());
  END LOOP;

  INSERT INTO public.routines (id, name, description, created_at, updated_at)
  VALUES (gen_random_uuid(), 'ITA Checkout', 'Checkout assessment', now(), now())
  RETURNING id INTO r_checkout_id;
  FOR step_no IN 1..5 LOOP
    INSERT INTO public.routine_steps (routine_id, step_no, target, routine_type, created_at, updated_at)
    VALUES (r_checkout_id, step_no, 'O', 'C', now(), now());
  END LOOP;

  INSERT INTO public.session_routines (session_id, routine_no, routine_id, created_at, updated_at)
  VALUES
    (ita_session_id, 1, r_singles_id, now(), now()),
    (ita_session_id, 2, r_doubles_id, now(), now()),
    (ita_session_id, 3, r_checkout_id, now(), now());
END $$;
