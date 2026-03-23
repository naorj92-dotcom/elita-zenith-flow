
-- Treatment chart notes table
CREATE TABLE public.treatment_chart_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.staff(id),
  service_performed text NOT NULL,
  product_used text,
  lot_number text,
  expiration_date date,
  amount_units text,
  treatment_areas text,
  adverse_reaction text NOT NULL DEFAULT 'none',
  adverse_reaction_other text,
  provider_notes text,
  before_photo_url text,
  after_photo_url text,
  followup_instructions text,
  provider_signature text NOT NULL,
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treatment_chart_notes ENABLE ROW LEVEL SECURITY;

-- Only providers and owners (admin) can manage chart notes - NOT front_desk
CREATE POLICY "Providers and owners can view chart notes"
  ON public.treatment_chart_notes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner') OR 
    (public.has_role(auth.uid(), 'employee') AND public.get_employee_type(auth.uid()) = 'provider')
  );

CREATE POLICY "Providers and owners can insert chart notes"
  ON public.treatment_chart_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'owner') OR 
    (public.has_role(auth.uid(), 'employee') AND public.get_employee_type(auth.uid()) = 'provider')
  );

CREATE POLICY "Providers and owners can update unlocked chart notes"
  ON public.treatment_chart_notes FOR UPDATE
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'owner') OR 
     (public.has_role(auth.uid(), 'employee') AND public.get_employee_type(auth.uid()) = 'provider'))
    AND is_locked = false
  );

-- Clients can view their own follow-up instructions only
CREATE POLICY "Clients can view own chart note followups"
  ON public.treatment_chart_notes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client') AND
    client_id IN (SELECT cp.client_id FROM public.client_profiles cp WHERE cp.user_id = auth.uid()) AND
    followup_instructions IS NOT NULL AND followup_instructions != ''
  );

-- Trigger to auto-lock notes older than 24 hours
CREATE OR REPLACE FUNCTION public.lock_old_chart_notes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
BEGIN
  IF NEW.created_at < (now() - interval '24 hours') THEN
    NEW.is_locked := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lock_chart_notes_on_update
  BEFORE UPDATE ON public.treatment_chart_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_old_chart_notes();

-- Updated at trigger
CREATE TRIGGER update_treatment_chart_notes_updated_at
  BEFORE UPDATE ON public.treatment_chart_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
