-- Create products table for retail inventory
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  sku TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS policies - public read, staff can manage
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert products"
  ON public.products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can update products"
  ON public.products FOR UPDATE
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample retail products
INSERT INTO public.products (name, description, category, sku, price, cost, quantity_in_stock, reorder_level) VALUES
  ('SkinCeuticals C E Ferulic', 'Vitamin C serum for anti-aging', 'Skincare', 'SKC-001', 182.00, 91.00, 15, 5),
  ('EltaMD UV Clear SPF 46', 'Lightweight facial sunscreen', 'Skincare', 'ELT-001', 41.00, 20.50, 25, 10),
  ('Revision Skincare Nectifirm', 'Neck and décolletage cream', 'Skincare', 'REV-001', 100.00, 50.00, 12, 5),
  ('Latisse Eyelash Serum', 'Prescription lash growth serum', 'Lashes', 'LAT-001', 179.00, 89.50, 8, 3),
  ('ZO Skin Health Retinol', 'Anti-aging retinol treatment', 'Skincare', 'ZO-001', 135.00, 67.50, 10, 5),
  ('Colorescience Sunforgettable SPF 50', 'Mineral powder sunscreen', 'Skincare', 'COL-001', 69.00, 34.50, 20, 8);