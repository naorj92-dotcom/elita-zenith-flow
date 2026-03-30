
-- Fix security definer views by recreating with security_invoker = true

-- Fix staff_public view
DROP VIEW IF EXISTS public.staff_public;
CREATE VIEW public.staff_public 
WITH (security_invoker = true) AS
SELECT id, first_name, last_name, email, phone, role, avatar_url, is_active, hire_date
FROM public.staff;
GRANT SELECT ON public.staff_public TO authenticated;

-- Fix client_transactions_view - use security_invoker and RLS on base table
DROP VIEW IF EXISTS public.client_transactions_view;
CREATE VIEW public.client_transactions_view 
WITH (security_invoker = true, security_barrier = true) AS
SELECT t.id, t.appointment_id, t.client_id, t.transaction_type, t.amount, t.transaction_date, t.created_at, t.description
FROM public.transactions t;
GRANT SELECT ON public.client_transactions_view TO authenticated;

-- Re-add client SELECT policy on transactions (needed for security_invoker view)
-- But only expose non-commission columns via the view
DROP POLICY IF EXISTS "Clients can view own transactions" ON public.transactions;
CREATE POLICY "Clients can view own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid())
);
