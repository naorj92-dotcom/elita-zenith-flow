
-- Function to auto-assign active intake forms to a new client
CREATE OR REPLACE FUNCTION public.auto_assign_intake_forms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert a pending client_form for every active intake form
  INSERT INTO public.client_forms (client_id, form_id, status)
  SELECT NEW.client_id, f.id, 'pending'::form_status
  FROM public.forms f
  WHERE f.is_active = true
    AND f.form_type = 'intake'
    AND NEW.client_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger: fires when a new client_profile row is inserted (i.e. new client signs up)
CREATE TRIGGER trg_auto_assign_intake_forms
  AFTER INSERT ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_intake_forms();
