-- Client reviews/testimonials table
CREATE TABLE public.client_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  rating integer NOT NULL DEFAULT 5,
  review_text text,
  is_public boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can create own reviews"
  ON public.client_reviews FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Clients can view own reviews"
  ON public.client_reviews FOR SELECT TO authenticated
  USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Staff can manage reviews"
  ON public.client_reviews FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Family/linked accounts table
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  linked_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'family',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(primary_client_id, linked_client_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own family links"
  ON public.family_members FOR SELECT TO authenticated
  USING (primary_client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Clients can manage own family links"
  ON public.family_members FOR INSERT TO authenticated
  WITH CHECK (primary_client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Clients can delete own family links"
  ON public.family_members FOR DELETE TO authenticated
  USING (primary_client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Staff can manage family links"
  ON public.family_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Loyalty rewards catalog
CREATE TABLE public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  points_cost integer NOT NULL,
  reward_type text NOT NULL DEFAULT 'discount',
  reward_value numeric,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  max_redemptions integer,
  redemption_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards"
  ON public.loyalty_rewards FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Owners can manage rewards"
  ON public.loyalty_rewards FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Loyalty redemptions log
CREATE TABLE public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE CASCADE,
  points_spent integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own redemptions"
  ON public.loyalty_redemptions FOR SELECT TO authenticated
  USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Clients can create redemptions"
  ON public.loyalty_redemptions FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Staff can manage redemptions"
  ON public.loyalty_redemptions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));