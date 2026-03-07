
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Clients can view active deals" ON public.exclusive_deals;
DROP POLICY IF EXISTS "Staff can manage deals" ON public.exclusive_deals;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Clients can view active deals"
  ON public.exclusive_deals
  FOR SELECT
  TO authenticated
  USING (
    (is_active = true) AND (now() >= starts_at) AND (now() <= expires_at)
  );

CREATE POLICY "Staff can manage deals"
  ON public.exclusive_deals
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
  );
