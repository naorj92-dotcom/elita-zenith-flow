-- Create storage bucket for treatment photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('treatment-photos', 'treatment-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for treatment photos
CREATE POLICY "Staff can upload treatment photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'treatment-photos');

CREATE POLICY "Staff can update treatment photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'treatment-photos');

CREATE POLICY "Treatment photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'treatment-photos');

CREATE POLICY "Staff can delete treatment photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'treatment-photos');