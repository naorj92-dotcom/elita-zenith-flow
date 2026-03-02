
-- Fix overly permissive waitlist INSERT policy
DROP POLICY IF EXISTS "Anyone can add to waitlist" ON public.waitlist;

CREATE POLICY "Authenticated clients can add to waitlist"
ON public.waitlist
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (
    SELECT cp.client_id
    FROM client_profiles cp
    WHERE cp.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'owner')
  OR has_role(auth.uid(), 'employee')
);
