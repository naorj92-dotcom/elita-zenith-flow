
-- =============================================
-- SECURITY HARDENING: Remove all dangerous "Allow anon" policies
-- These policies expose sensitive data to anyone on the internet
-- =============================================

-- 1. CLIENTS - Remove anon SELECT/INSERT/UPDATE
DROP POLICY IF EXISTS "Allow anon select clients" ON public.clients;
DROP POLICY IF EXISTS "Allow anon insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow anon update clients" ON public.clients;

-- 2. STAFF - Remove anon SELECT (validate_staff_pin RPC is SECURITY DEFINER, doesn't need it)
DROP POLICY IF EXISTS "Allow anon select staff" ON public.staff;

-- 3. APPOINTMENTS - Remove anon ALL
DROP POLICY IF EXISTS "Allow anon all appointments" ON public.appointments;

-- 4. TRANSACTIONS - Remove anon ALL
DROP POLICY IF EXISTS "Allow anon all transactions" ON public.transactions;

-- 5. RECEIPTS - Remove anon ALL
DROP POLICY IF EXISTS "Allow anon all receipts" ON public.receipts;

-- 6. TIME_CLOCK - Remove anon INSERT/SELECT/UPDATE
DROP POLICY IF EXISTS "Allow anon insert time_clock" ON public.time_clock;
DROP POLICY IF EXISTS "Allow anon select time_clock" ON public.time_clock;
DROP POLICY IF EXISTS "Allow anon update time_clock" ON public.time_clock;

-- 7. STAFF_GOALS - Remove anon INSERT/SELECT/UPDATE
DROP POLICY IF EXISTS "Allow anon insert staff_goals" ON public.staff_goals;
DROP POLICY IF EXISTS "Allow anon select staff_goals" ON public.staff_goals;
DROP POLICY IF EXISTS "Allow anon update staff_goals" ON public.staff_goals;

-- 8. MACHINES - Remove anon SELECT (already has staff/owner policies)
DROP POLICY IF EXISTS "Allow anon select machines" ON public.machines;

-- 9. SERVICES - Remove duplicate anon SELECT (keep "Allow public read access to services" for client portal booking)
DROP POLICY IF EXISTS "Allow anon select services" ON public.services;
