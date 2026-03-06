CREATE POLICY "Clients can view own treatment photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'treatment-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM clients c
    JOIN client_profiles cp ON cp.client_id = c.id
    WHERE cp.user_id = auth.uid()
  )
);