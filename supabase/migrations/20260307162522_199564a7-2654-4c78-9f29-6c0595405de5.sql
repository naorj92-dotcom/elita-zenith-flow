
-- Table to track client interest and purchase requests for packages/memberships
CREATE TABLE public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('package', 'membership')),
  package_id uuid REFERENCES public.packages(id),
  membership_id uuid REFERENCES public.memberships(id),
  tier_sessions integer,
  tier_total_price numeric,
  status text NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'contacted', 'purchased', 'declined')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

-- Clients can insert their own interest requests
CREATE POLICY "Clients can create own purchase requests"
  ON public.purchase_requests FOR INSERT
  WITH CHECK (client_id IN (
    SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
  ));

-- Clients can view their own requests
CREATE POLICY "Clients can view own purchase requests"
  ON public.purchase_requests FOR SELECT
  USING (client_id IN (
    SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
  ));

-- Staff can manage all purchase requests
CREATE POLICY "Staff can manage purchase requests"
  ON public.purchase_requests FOR ALL
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- Enable realtime for staff notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_requests;

-- Updated_at trigger
CREATE TRIGGER update_purchase_requests_updated_at
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
