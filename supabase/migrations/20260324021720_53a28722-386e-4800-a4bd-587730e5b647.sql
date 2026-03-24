-- Add rebooking_interval_days to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS rebooking_interval_days integer;

-- Create rebook_reminders table
CREATE TABLE public.rebook_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id),
  suggested_date date NOT NULL,
  remind_at date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz
);

ALTER TABLE public.rebook_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage rebook reminders"
  ON public.rebook_reminders FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));