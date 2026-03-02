
-- Fix overly permissive rooms anon SELECT policy
DROP POLICY IF EXISTS "Allow anon select rooms" ON public.rooms;
