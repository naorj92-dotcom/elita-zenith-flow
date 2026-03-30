
-- 1. STAFF TABLE: Hide compensation data from employees
-- Drop existing employee SELECT policy and replace with column-restricted access
-- We'll use a restrictive approach: employees can only see non-compensation columns via a view

CREATE OR REPLACE VIEW public.staff_public AS
SELECT id, first_name, last_name, email, phone, role, avatar_url, is_active, hire_date
FROM public.staff;

-- Grant access to the view
GRANT SELECT ON public.staff_public TO authenticated;

-- Now restrict the staff table: drop the employee SELECT and replace
-- Keep the restrictive policy but add a new one that limits employee access to own row for sensitive data
DROP POLICY IF EXISTS "Employees can only view own compensation" ON public.staff;
CREATE POLICY "Employees can only view own compensation"
ON public.staff
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  OR (
    has_role(auth.uid(), 'employee'::app_role)
    AND id IN (
      SELECT ur.staff_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_active = true
    )
  )
);

-- 2. TRANSACTIONS: Hide commission data from clients
-- Replace client SELECT policy to exclude commission columns via a view
CREATE OR REPLACE VIEW public.client_transactions_view AS
SELECT id, appointment_id, client_id, transaction_type, amount, transaction_date, created_at, description
FROM public.transactions;

GRANT SELECT ON public.client_transactions_view TO authenticated;

-- Drop and recreate the client SELECT policy to remove direct access
DROP POLICY IF EXISTS "Clients can view own transactions" ON public.transactions;
CREATE POLICY "Clients can view own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()))
  AND NOT (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
);

-- But we need clients to still access their data. The issue is column-level.
-- Since Postgres RLS can't filter columns, let's just keep the policy but note
-- that the view is the recommended access path. For now, we'll accept the tradeoff
-- OR we can revoke direct SELECT on transactions from authenticated and use the view.
-- Actually, let's just drop the client policy and have clients use the view instead.
DROP POLICY IF EXISTS "Clients can view own transactions" ON public.transactions;

-- Add RLS to the view via a security barrier
DROP VIEW IF EXISTS public.client_transactions_view;
CREATE VIEW public.client_transactions_view WITH (security_barrier = true) AS
SELECT t.id, t.appointment_id, t.client_id, t.transaction_type, t.amount, t.transaction_date, t.created_at, t.description
FROM public.transactions t
JOIN public.client_profiles cp ON cp.client_id = t.client_id
WHERE cp.user_id = auth.uid();

GRANT SELECT ON public.client_transactions_view TO authenticated;

-- 3. NOTIFICATION LOGS: Restrict to owners only
DROP POLICY IF EXISTS "Staff can view notification logs" ON public.notification_logs;
CREATE POLICY "Owners can view notification logs"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- Also restrict INSERT to owners only
DROP POLICY IF EXISTS "Staff can create notification logs" ON public.notification_logs;
CREATE POLICY "Owners can create notification logs"
ON public.notification_logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- 4. VISIT STREAKS: Remove client write access (trigger handles it)
DROP POLICY IF EXISTS "Clients can update own streak" ON public.visit_streaks;
DROP POLICY IF EXISTS "Clients can upsert own streak" ON public.visit_streaks;
