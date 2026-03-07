
-- 1. Exclusive deals table (app-only flash sales)
CREATE TABLE public.exclusive_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  discount_percent numeric,
  discount_amount numeric,
  original_price numeric,
  deal_price numeric,
  service_id uuid REFERENCES public.services(id),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  max_claims integer,
  claims_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exclusive_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view active deals" ON public.exclusive_deals FOR SELECT USING (is_active = true AND now() BETWEEN starts_at AND expires_at);
CREATE POLICY "Staff can manage deals" ON public.exclusive_deals FOR ALL USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee')) WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- 2. Aftercare tips table
CREATE TABLE public.aftercare_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id),
  day_number integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  description text NOT NULL,
  icon text DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aftercare_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view aftercare tips" ON public.aftercare_tips FOR SELECT USING (true);
CREATE POLICY "Staff can manage aftercare tips" ON public.aftercare_tips FOR ALL USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee')) WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- 3. Referral program table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  referred_client_id uuid REFERENCES public.clients(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'booked', 'completed', 'rewarded')),
  reward_amount numeric NOT NULL DEFAULT 50,
  reward_credited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own referrals" ON public.referrals FOR SELECT USING (referrer_client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));
CREATE POLICY "Clients can create referrals" ON public.referrals FOR INSERT WITH CHECK (referrer_client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));
CREATE POLICY "Staff can manage referrals" ON public.referrals FOR ALL USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee')) WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- 4. Visit streaks table
CREATE TABLE public.visit_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_visit_month text,
  bonus_points_awarded integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.visit_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own streak" ON public.visit_streaks FOR SELECT USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));
CREATE POLICY "Staff can manage streaks" ON public.visit_streaks FOR ALL USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee')) WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));
-- Also allow client inserts for auto-creation
CREATE POLICY "Clients can upsert own streak" ON public.visit_streaks FOR INSERT WITH CHECK (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));
CREATE POLICY "Clients can update own streak" ON public.visit_streaks FOR UPDATE USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));
