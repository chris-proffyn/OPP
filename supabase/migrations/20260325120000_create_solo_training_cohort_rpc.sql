-- Solo training: create cohort via RPC so inserts run with definer privileges and are not blocked by RLS.
-- Client calls create_solo_training_cohort(schedule_id, start_date) instead of direct inserts.
-- Re-runnable: drop if exists then create; GRANT and COMMENT are idempotent.

DROP FUNCTION IF EXISTS public.create_solo_training_cohort(uuid, text);

CREATE OR REPLACE FUNCTION public.create_solo_training_cohort(p_schedule_id uuid, p_start_date text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
  p_nickname text;
  p_level numeric;
  cname text;
  clevel int;
  cstart date;
  cend date;
  cid uuid;
BEGIN
  pid := current_user_player_id();
  IF pid IS NULL THEN
    RAISE EXCEPTION 'Player not found or not authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT nickname, training_rating INTO p_nickname, p_level
  FROM public.players WHERE id = pid;

  cname := trim(coalesce(p_nickname, ''));
  IF cname = '' THEN
    cname := 'Player';
  END IF;
  cname := cname || ' solo cohort';
  clevel := coalesce((p_level)::int, 0);
  cstart := p_start_date::date;
  cend := (cstart + interval '1 year')::date;

  IF NOT EXISTS (SELECT 1 FROM public.schedule_entries WHERE schedule_id = p_schedule_id) THEN
    RAISE EXCEPTION 'Schedule not found or has no entries' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.cohorts (name, level, start_date, end_date, schedule_id)
  VALUES (cname, clevel, cstart, cend, p_schedule_id)
  RETURNING id INTO cid;

  INSERT INTO public.cohort_members (cohort_id, player_id)
  VALUES (cid, pid);

  WITH ins AS (
    INSERT INTO public.calendar (scheduled_at, cohort_id, schedule_id, day_no, session_no, session_id)
    SELECT
      ((cstart + (se.day_no - 1))::timestamp at time zone 'UTC' + interval '19 hours')::timestamptz,
      cid,
      p_schedule_id,
      se.day_no,
      se.session_no,
      se.session_id
    FROM public.schedule_entries se
    WHERE se.schedule_id = p_schedule_id
    ORDER BY se.day_no, se.session_no
    RETURNING id
  )
  INSERT INTO public.player_calendar (player_id, calendar_id, status)
  SELECT pid, id, 'planned' FROM ins;

  RETURN cid;
END;
$$;

COMMENT ON FUNCTION public.create_solo_training_cohort(uuid, text) IS
  'Solo training: create a cohort for the current player, add them as member, generate calendar and player_calendar. Called from client with schedule_id and start_date (YYYY-MM-DD).';

GRANT EXECUTE ON FUNCTION public.create_solo_training_cohort(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_solo_training_cohort(uuid, text) TO authenticated;
