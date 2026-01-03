-- Create client_profiles table for authenticated clients
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create packages table (bundles of services clients purchase)
CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  services JSONB NOT NULL DEFAULT '[]',
  total_sessions INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_packages table (purchased packages by clients)
CREATE TABLE public.client_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  sessions_used INTEGER NOT NULL DEFAULT 0,
  sessions_total INTEGER NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create before_after_photos table
CREATE TABLE public.before_after_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  before_photo_url TEXT,
  after_photo_url TEXT,
  notes TEXT,
  taken_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_visible_to_client BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_recommendations table
CREATE TABLE public.product_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_url TEXT,
  price DECIMAL(10,2),
  priority TEXT DEFAULT 'normal',
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  recommended_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_recommendations table
CREATE TABLE public.service_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  reason TEXT,
  priority TEXT DEFAULT 'normal',
  is_booked BOOLEAN NOT NULL DEFAULT false,
  recommended_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.before_after_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_recommendations ENABLE ROW LEVEL SECURITY;

-- Client profiles policies (clients can only see their own)
CREATE POLICY "Users can view own profile" ON public.client_profiles 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.client_profiles 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.client_profiles 
  FOR UPDATE USING (auth.uid() = user_id);

-- Staff can manage all client profiles
CREATE POLICY "Staff can view all client profiles" ON public.client_profiles 
  FOR SELECT USING (true);
CREATE POLICY "Staff can insert client profiles" ON public.client_profiles 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update client profiles" ON public.client_profiles 
  FOR UPDATE USING (true);

-- Packages policies (public read, staff write)
CREATE POLICY "Anyone can view packages" ON public.packages 
  FOR SELECT USING (true);
CREATE POLICY "Staff can insert packages" ON public.packages 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update packages" ON public.packages 
  FOR UPDATE USING (true);

-- Client packages policies
CREATE POLICY "Clients can view own packages" ON public.client_packages 
  FOR SELECT USING (
    client_id IN (
      SELECT cp.client_id FROM public.client_profiles cp WHERE cp.user_id = auth.uid()
    )
  );
CREATE POLICY "Staff can manage all client packages" ON public.client_packages 
  FOR ALL USING (true);

-- Before/after photos policies
CREATE POLICY "Clients can view own visible photos" ON public.before_after_photos 
  FOR SELECT USING (
    is_visible_to_client = true AND
    client_id IN (
      SELECT cp.client_id FROM public.client_profiles cp WHERE cp.user_id = auth.uid()
    )
  );
CREATE POLICY "Staff can manage all photos" ON public.before_after_photos 
  FOR ALL USING (true);

-- Product recommendations policies
CREATE POLICY "Clients can view own recommendations" ON public.product_recommendations 
  FOR SELECT USING (
    client_id IN (
      SELECT cp.client_id FROM public.client_profiles cp WHERE cp.user_id = auth.uid()
    )
  );
CREATE POLICY "Staff can manage all product recommendations" ON public.product_recommendations 
  FOR ALL USING (true);

-- Service recommendations policies
CREATE POLICY "Clients can view own service recommendations" ON public.service_recommendations 
  FOR SELECT USING (
    client_id IN (
      SELECT cp.client_id FROM public.client_profiles cp WHERE cp.user_id = auth.uid()
    )
  );
CREATE POLICY "Staff can manage all service recommendations" ON public.service_recommendations 
  FOR ALL USING (true);

-- Create storage bucket for client photos
INSERT INTO storage.buckets (id, name, public) VALUES ('client-photos', 'client-photos', false);

-- Storage policies for client photos
CREATE POLICY "Clients can view own photos" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'client-photos' AND 
    (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.clients c
      INNER JOIN public.client_profiles cp ON cp.client_id = c.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can upload photos" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'client-photos');

CREATE POLICY "Staff can view all photos" ON storage.objects 
  FOR SELECT USING (bucket_id = 'client-photos');

CREATE POLICY "Staff can update photos" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'client-photos');

CREATE POLICY "Staff can delete photos" ON storage.objects 
  FOR DELETE USING (bucket_id = 'client-photos');

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON public.client_profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample packages
INSERT INTO public.packages (name, description, services, total_sessions, price) VALUES
('Hydrafacial Series (6)', 'Six Hydrafacial treatments for optimal skin health', '["Hydrafacial Deluxe"]', 6, 1200.00),
('Botox Maintenance Plan', 'Quarterly Botox treatments for one year', '["Botox - Full Face"]', 4, 2200.00),
('Laser Hair Removal - Full Legs (8)', 'Eight sessions of laser hair removal for full legs', '["Laser Hair Removal - Full Legs"]', 8, 3000.00);