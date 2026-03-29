-- Fix: Remove client policy that exposes all staff columns (including compensation data)
-- Clients should use the get_staff_public_info() security definer function instead
DROP POLICY IF EXISTS "Clients can view active staff for booking" ON public.staff;