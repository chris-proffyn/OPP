-- ITA session created by 20260315120000 has no session_routines, so deriveITARatingsFromSessionRun
-- returns null (sessionData.routines.length !== 3). Add three routines (Singles, Doubles, Checkout)
-- with 5 steps each and link them to the ITA session so completion succeeds.

DO $$
DECLARE
  ita_session_id uuid;
  r_singles_id uuid;
  r_doubles_id uuid;
  r_checkout_id uuid;
  step_no int;
BEGIN
  -- Find ITA session that has no session_routines (the one we created in 20260315120000)
  SELECT s.id INTO ita_session_id
  FROM public.sessions s
  WHERE LOWER(TRIM(s.name)) IN ('ita', 'initial training assessment')
    AND NOT EXISTS (SELECT 1 FROM public.session_routines sr WHERE sr.session_id = s.id)
  LIMIT 1;

  IF ita_session_id IS NULL THEN
    RETURN; -- No bare ITA session to fix (e.g. admin already added routines)
  END IF;

  -- Create routine "ITA Singles" (step routine_type SS; ITA type is determined by routine_type only)
  INSERT INTO public.routines (id, name, description, created_at, updated_at)
  VALUES (gen_random_uuid(), 'ITA Singles', 'Singles segment assessment', now(), now())
  RETURNING id INTO r_singles_id;
  FOR step_no IN 1..5 LOOP
    INSERT INTO public.routine_steps (routine_id, step_no, target, routine_type, created_at, updated_at)
    VALUES (r_singles_id, step_no, 'S20', 'SS', now(), now());
  END LOOP;

  -- Create routine "ITA Doubles"
  INSERT INTO public.routines (id, name, description, created_at, updated_at)
  VALUES (gen_random_uuid(), 'ITA Doubles', 'Doubles assessment', now(), now())
  RETURNING id INTO r_doubles_id;
  FOR step_no IN 1..5 LOOP
    INSERT INTO public.routine_steps (routine_id, step_no, target, routine_type, created_at, updated_at)
    VALUES (r_doubles_id, step_no, 'D16', 'SD', now(), now());
  END LOOP;

  -- Create routine "ITA Checkout"
  INSERT INTO public.routines (id, name, description, created_at, updated_at)
  VALUES (gen_random_uuid(), 'ITA Checkout', 'Checkout assessment', now(), now())
  RETURNING id INTO r_checkout_id;
  FOR step_no IN 1..5 LOOP
    INSERT INTO public.routine_steps (routine_id, step_no, target, routine_type, created_at, updated_at)
    VALUES (r_checkout_id, step_no, 'O', 'C', now(), now());
  END LOOP;

  -- Link routines to ITA session (routine_no 1 = Singles, 2 = Doubles, 3 = Checkout)
  INSERT INTO public.session_routines (session_id, routine_no, routine_id, created_at, updated_at)
  VALUES
    (ita_session_id, 1, r_singles_id, now(), now()),
    (ita_session_id, 2, r_doubles_id, now(), now()),
    (ita_session_id, 3, r_checkout_id, now(), now());
END $$;
