
-- Allow clients to cancel their own upcoming appointments
CREATE POLICY "Clients can cancel own appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  client_id IN (
    SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
  )
)
WITH CHECK (
  client_id IN (
    SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
  )
);
