-- Memberships table for recurring spa memberships
CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly', -- monthly, quarterly, yearly
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of benefit objects
  monthly_service_credits INTEGER NOT NULL DEFAULT 0,
  retail_discount_percent NUMERIC DEFAULT 0,
  priority_booking BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Client memberships (subscriptions)
CREATE TABLE public.client_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, cancelled, expired
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_billing_date TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  remaining_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gift cards
CREATE TABLE public.gift_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  initial_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  purchaser_name TEXT,
  purchaser_email TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  message TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Loyalty points system
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- earned, redeemed, expired, bonus
  description TEXT,
  related_appointment_id UUID REFERENCES public.appointments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Waitlist for popular timeslots
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  preferred_staff_id UUID REFERENCES public.staff(id),
  preferred_date DATE,
  preferred_time_range TEXT, -- morning, afternoon, evening
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, contacted, booked, cancelled
  contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Memberships policies (public read, staff manage)
CREATE POLICY "Anyone can view active memberships" ON public.memberships FOR SELECT USING (is_active = true);
CREATE POLICY "Staff can manage memberships" ON public.memberships FOR ALL USING (true);

-- Client memberships policies
CREATE POLICY "Clients can view own memberships" ON public.client_memberships FOR SELECT USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));
CREATE POLICY "Staff can manage all client memberships" ON public.client_memberships FOR ALL USING (true);

-- Gift cards policies (staff manage, anyone can check balance by code)
CREATE POLICY "Staff can manage gift cards" ON public.gift_cards FOR ALL USING (true);
CREATE POLICY "Anyone can view gift card by code" ON public.gift_cards FOR SELECT USING (true);

-- Loyalty points policies
CREATE POLICY "Clients can view own points" ON public.loyalty_points FOR SELECT USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));
CREATE POLICY "Staff can manage all loyalty points" ON public.loyalty_points FOR ALL USING (true);

-- Waitlist policies
CREATE POLICY "Clients can view own waitlist entries" ON public.waitlist FOR SELECT USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));
CREATE POLICY "Staff can manage all waitlist entries" ON public.waitlist FOR ALL USING (true);
CREATE POLICY "Anyone can add to waitlist" ON public.waitlist FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_memberships_updated_at BEFORE UPDATE ON public.client_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add loyalty points balance view function
CREATE OR REPLACE FUNCTION public.get_client_loyalty_balance(p_client_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(CASE WHEN transaction_type IN ('earned', 'bonus') THEN points ELSE -points END)
     FROM public.loyalty_points
     WHERE client_id = p_client_id),
    0
  );
END;
$$;

-- Insert sample membership tiers
INSERT INTO public.memberships (name, description, price, billing_period, monthly_service_credits, retail_discount_percent, priority_booking, benefits) VALUES
('Glow Essentials', 'Perfect for skincare maintenance with monthly facials', 149, 'monthly', 1, 10, false, '["1 signature facial per month", "10% off retail products", "Birthday month bonus treatment", "Member-only pricing on add-ons"]'::jsonb),
('Radiance VIP', 'Enhanced benefits for the dedicated skincare enthusiast', 299, 'monthly', 2, 15, true, '["2 treatments per month", "15% off all retail", "Priority booking", "Complimentary upgrades when available", "Guest passes (2/year)"]'::jsonb),
('Elite Unlimited', 'The ultimate luxury experience with unlimited access', 499, 'monthly', 99, 20, true, '["Unlimited signature treatments", "20% off everything", "Priority VIP booking", "Exclusive member events", "Complimentary friend referral treatments"]'::jsonb);

-- Insert sample gift card
INSERT INTO public.gift_cards (code, initial_amount, remaining_amount, purchaser_name, recipient_name, message) VALUES
('ELITA-GIFT-2024', 200, 200, 'Demo User', 'Gift Recipient', 'Treat yourself to some relaxation!');