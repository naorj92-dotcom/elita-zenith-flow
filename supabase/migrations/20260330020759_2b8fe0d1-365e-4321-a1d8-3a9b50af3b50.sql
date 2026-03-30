-- FIX 1: Staff table - block client-role users from reading staff records
DROP POLICY IF EXISTS "Owners can manage staff" ON public.staff;

CREATE POLICY "Owners can manage staff"
  ON public.staff
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only staff roles can access staff table"
  ON public.staff
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'employee'::app_role)
  );

-- FIX 2: Transactions table
CREATE POLICY "Clients can view own transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT cp.client_id
      FROM client_profiles cp
      WHERE cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can insert transactions" ON public.transactions;

CREATE POLICY "Staff can insert transactions"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role)
    OR (
      has_role(auth.uid(), 'employee'::app_role)
      AND staff_id IN (
        SELECT ur.staff_id
        FROM user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.is_active = true
      )
    )
  );