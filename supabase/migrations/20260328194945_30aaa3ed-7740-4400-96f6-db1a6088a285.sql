
CREATE OR REPLACE FUNCTION public.update_visit_streak_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_current_month text;
  v_last_month text;
  v_prev_month text;
  v_streak record;
  v_new_streak integer;
  v_new_longest integer;
BEGIN
  -- Only fire when appointment transitions to 'completed'
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_client_id := NEW.client_id;
  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_current_month := to_char(now(), 'YYYY-MM');
  v_last_month := to_char(now() - interval '1 month', 'YYYY-MM');

  -- Get or create streak record
  SELECT * INTO v_streak FROM public.visit_streaks WHERE client_id = v_client_id;

  IF v_streak IS NULL THEN
    -- First visit ever
    INSERT INTO public.visit_streaks (client_id, current_streak, longest_streak, last_visit_month)
    VALUES (v_client_id, 1, 1, v_current_month);

    RETURN NEW;
  END IF;

  -- Already visited this month — no update
  IF v_streak.last_visit_month = v_current_month THEN
    RETURN NEW;
  END IF;

  -- Determine new streak
  IF v_streak.last_visit_month = v_last_month THEN
    v_new_streak := v_streak.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_new_longest := GREATEST(v_new_streak, v_streak.longest_streak);

  UPDATE public.visit_streaks
  SET current_streak = v_new_streak,
      longest_streak = v_new_longest,
      last_visit_month = v_current_month,
      updated_at = now()
  WHERE client_id = v_client_id;

  -- Award bonus loyalty points at milestones (3, 6, 12 months)
  IF v_new_streak IN (3, 6, 12) THEN
    INSERT INTO public.loyalty_points (client_id, points, transaction_type, description)
    VALUES (
      v_client_id,
      100,
      'bonus',
      'Streak bonus: ' || v_new_streak || '-month visit streak! 🔥'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on appointments table
DROP TRIGGER IF EXISTS trg_update_visit_streak ON public.appointments;
CREATE TRIGGER trg_update_visit_streak
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_visit_streak_on_completion();
