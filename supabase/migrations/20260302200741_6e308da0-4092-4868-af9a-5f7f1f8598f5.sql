
-- Allow clients to INSERT their own appointments (for booking)
CREATE POLICY "Clients can book appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (
    SELECT cp.client_id
    FROM client_profiles cp
    WHERE cp.user_id = auth.uid()
  )
);

-- Allow clients to view active staff (providers) for booking
CREATE POLICY "Clients can view active staff for booking"
ON public.staff
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client') AND is_active = true
);

-- Allow clients to view machines for availability checking during booking
CREATE POLICY "Clients can view machines for booking"
ON public.machines
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client')
);
