-- Create machines table
CREATE TABLE public.machines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- RLS policies for machines
CREATE POLICY "Allow public read access to machines" ON public.machines FOR SELECT USING (true);
CREATE POLICY "Allow public insert to machines" ON public.machines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to machines" ON public.machines FOR UPDATE USING (true);

-- Add machine_type_id to services table
ALTER TABLE public.services ADD COLUMN machine_type_id UUID REFERENCES public.machines(id);

-- Add recovery_buffer_minutes to services
ALTER TABLE public.services ADD COLUMN recovery_buffer_minutes INTEGER NOT NULL DEFAULT 0;

-- Create trigger for updated_at
CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample machine types
INSERT INTO public.machines (name, machine_type, quantity, status) VALUES
  ('RF Contour Pro', 'RF Contouring', 3, 'active'),
  ('HydraGlow Elite', 'Hydra-Facial', 2, 'active'),
  ('LED Rejuvenator', 'LED Therapy', 4, 'active'),
  ('MicroDerm Advanced', 'Microdermabrasion', 2, 'active'),
  ('Cryo Sculpt', 'Body Contouring', 1, 'maintenance');