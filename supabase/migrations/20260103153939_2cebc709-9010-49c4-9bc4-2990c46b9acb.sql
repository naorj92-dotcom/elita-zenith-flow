-- Create enum types
CREATE TYPE public.staff_role AS ENUM ('admin', 'provider', 'front_desk');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.transaction_type AS ENUM ('service', 'retail', 'refund');

-- Create staff table
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin VARCHAR(4) NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role staff_role NOT NULL DEFAULT 'provider',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  service_commission_tier1 DECIMAL(5,2) DEFAULT 40.00,
  service_commission_tier2 DECIMAL(5,2) DEFAULT 45.00,
  service_commission_tier3 DECIMAL(5,2) DEFAULT 50.00,
  service_tier1_threshold DECIMAL(10,2) DEFAULT 5000.00,
  service_tier2_threshold DECIMAL(10,2) DEFAULT 10000.00,
  retail_commission_rate DECIMAL(5,2) DEFAULT 10.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  avatar_url TEXT,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_visit_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table for commission tracking
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(10,2),
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_clock table for PIN-based clock in/out
CREATE TABLE public.time_clock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock ENABLE ROW LEVEL SECURITY;

-- Create public read policies (staff app - internal use only)
CREATE POLICY "Allow public read access to staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Allow public read access to clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow public read access to services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow public read access to rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow public read access to appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Allow public read access to transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to time_clock" ON public.time_clock FOR SELECT USING (true);

-- Create insert/update policies for internal staff app
CREATE POLICY "Allow public insert to staff" ON public.staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to staff" ON public.staff FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to services" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to rooms" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to appointments" ON public.appointments FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to transactions" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to time_clock" ON public.time_clock FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to time_clock" ON public.time_clock FOR UPDATE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate tiered commission
CREATE OR REPLACE FUNCTION public.calculate_commission(
  p_staff_id UUID,
  p_amount DECIMAL,
  p_transaction_type transaction_type,
  p_period_start DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_staff RECORD;
  v_period_sales DECIMAL;
  v_commission_rate DECIMAL;
BEGIN
  SELECT * INTO v_staff FROM public.staff WHERE id = p_staff_id;
  
  IF p_transaction_type = 'retail' THEN
    RETURN p_amount * (v_staff.retail_commission_rate / 100);
  END IF;
  
  -- Calculate period sales for tiered service commission
  SELECT COALESCE(SUM(amount), 0) INTO v_period_sales
  FROM public.transactions
  WHERE staff_id = p_staff_id
    AND transaction_type = 'service'
    AND transaction_date >= p_period_start;
  
  -- Determine commission tier
  IF v_period_sales >= v_staff.service_tier2_threshold THEN
    v_commission_rate := v_staff.service_commission_tier3;
  ELSIF v_period_sales >= v_staff.service_tier1_threshold THEN
    v_commission_rate := v_staff.service_commission_tier2;
  ELSE
    v_commission_rate := v_staff.service_commission_tier1;
  END IF;
  
  RETURN p_amount * (v_commission_rate / 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Insert sample staff data with PINs
INSERT INTO public.staff (pin, first_name, last_name, email, role, service_commission_tier1, service_commission_tier2, service_commission_tier3, retail_commission_rate) VALUES
('1234', 'Maria', 'Santos', 'maria@elitamedspa.com', 'admin', 40.00, 45.00, 50.00, 10.00),
('5678', 'Elena', 'Rodriguez', 'elena@elitamedspa.com', 'provider', 40.00, 45.00, 50.00, 10.00),
('0000', 'Sofia', 'Chen', 'sofia@elitamedspa.com', 'front_desk', 35.00, 40.00, 45.00, 8.00);

-- Insert sample services
INSERT INTO public.services (name, description, category, duration_minutes, price, requires_consent) VALUES
('Botox - Full Face', 'Comprehensive Botox treatment for forehead, frown lines, and crow''s feet', 'Injectables', 45, 650.00, true),
('Hydrafacial Deluxe', 'Deep cleansing, exfoliation, and hydration treatment', 'Facials', 60, 250.00, false),
('Laser Hair Removal - Full Legs', 'Permanent hair reduction using advanced laser technology', 'Laser', 90, 450.00, true),
('Chemical Peel - Medium', 'Rejuvenating peel for improved texture and tone', 'Facials', 45, 175.00, true),
('Dermal Fillers - Lips', 'Natural-looking lip enhancement with hyaluronic acid', 'Injectables', 30, 550.00, true);

-- Insert sample rooms
INSERT INTO public.rooms (name, description) VALUES
('Suite A', 'Luxury treatment suite with advanced equipment'),
('Suite B', 'Premium injection room'),
('Suite C', 'Laser treatment room'),
('Consultation', 'Private consultation room');

-- Insert sample clients
INSERT INTO public.clients (first_name, last_name, email, phone, is_vip, total_spent, visit_count) VALUES
('Victoria', 'Hamilton', 'victoria.h@email.com', '(555) 123-4567', true, 15750.00, 24),
('Sophia', 'Bennett', 'sophia.b@email.com', '(555) 234-5678', true, 8900.00, 15),
('Isabella', 'Thornton', 'isabella.t@email.com', '(555) 345-6789', false, 3200.00, 8),
('Charlotte', 'Ashworth', 'charlotte.a@email.com', '(555) 456-7890', false, 1850.00, 5);