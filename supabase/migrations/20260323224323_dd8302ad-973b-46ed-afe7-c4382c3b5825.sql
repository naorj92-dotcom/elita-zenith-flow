
-- Table to link consent forms to services
CREATE TABLE public.service_form_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(form_id, service_id)
);

ALTER TABLE public.service_form_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage service form links"
  ON public.service_form_links FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Staff can view service form links"
  ON public.service_form_links FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Function to auto-assign consent forms when appointment is booked
CREATE OR REPLACE FUNCTION public.auto_assign_appointment_forms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_has_intake boolean;
BEGIN
  v_client_id := NEW.client_id;
  IF v_client_id IS NULL OR NEW.service_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if client has completed any intake form
  SELECT EXISTS (
    SELECT 1 FROM public.client_forms cf
    JOIN public.forms f ON f.id = cf.form_id
    WHERE cf.client_id = v_client_id
      AND f.form_type = 'intake'
      AND cf.status = 'completed'
  ) INTO v_has_intake;

  -- If no completed intake form, assign all active intake forms
  IF NOT v_has_intake THEN
    INSERT INTO public.client_forms (client_id, form_id, appointment_id, status)
    SELECT v_client_id, f.id, NEW.id, 'pending'::form_status
    FROM public.forms f
    WHERE f.is_active = true AND f.form_type = 'intake'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Always assign linked consent forms for this service
  INSERT INTO public.client_forms (client_id, form_id, appointment_id, status)
  SELECT v_client_id, sfl.form_id, NEW.id, 'pending'::form_status
  FROM public.service_form_links sfl
  JOIN public.forms f ON f.id = sfl.form_id
  WHERE sfl.service_id = NEW.service_id
    AND f.is_active = true
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_appointment_forms
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_appointment_forms();
