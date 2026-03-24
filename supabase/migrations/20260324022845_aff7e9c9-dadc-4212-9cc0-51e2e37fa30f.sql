
-- Birthday gifts table
CREATE TABLE public.birthday_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  gift_type text NOT NULL DEFAULT 'discount',
  discount_percent numeric,
  free_addon_service_id uuid REFERENCES public.services(id),
  custom_message text,
  expiry_date date NOT NULL,
  redeemed boolean NOT NULL DEFAULT false,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.birthday_gifts ENABLE ROW LEVEL SECURITY;

-- Staff can manage birthday gifts
CREATE POLICY "Staff can manage birthday gifts" ON public.birthday_gifts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Clients can view own birthday gifts
CREATE POLICY "Clients can view own birthday gifts" ON public.birthday_gifts
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

-- Add birthday_gift_sent_year to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birthday_gift_sent_year integer;
