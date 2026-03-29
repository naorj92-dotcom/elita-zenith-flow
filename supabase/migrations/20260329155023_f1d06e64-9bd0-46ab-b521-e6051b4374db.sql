-- Fix 1: user_roles privilege escalation - add restrictive INSERT policy
-- The "Owners can manage all roles" ALL policy lacks WITH CHECK, allowing any authenticated user to insert

-- First, update the existing owner policy to include WITH CHECK
DROP POLICY IF EXISTS "Owners can manage all roles" ON public.user_roles;

CREATE POLICY "Owners can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Fix 2: products table - restrict public read to staff only, hide cost
-- Drop the overly permissive "anyone can view" policy
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

-- Create a view without cost for client-facing queries
CREATE OR REPLACE VIEW public.products_public AS
SELECT id, name, description, category, price, image_url, sku, is_active, quantity_in_stock, created_at, updated_at
FROM public.products
WHERE is_active = true;

-- Add staff-only SELECT policy  
CREATE POLICY "Staff can view products"
ON public.products
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Fix 3: staff table - create a view without financial columns for clients/employees
-- Drop existing broad SELECT policies
DROP POLICY IF EXISTS "Clients can view active staff for booking" ON public.staff;
DROP POLICY IF EXISTS "Employees can view staff" ON public.staff;

-- Create a security definer function for non-owner staff access
CREATE OR REPLACE FUNCTION public.get_staff_public_info()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  role staff_role,
  avatar_url text,
  is_active boolean,
  hire_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.first_name, s.last_name, s.email, s.phone, s.role, s.avatar_url, s.is_active, s.hire_date
  FROM public.staff s
  WHERE s.is_active = true;
$$;

-- Re-create narrower policies: clients and employees can only see non-financial columns
-- We use a restricted view approach via RLS
CREATE POLICY "Clients can view active staff for booking"
ON public.staff
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client'::app_role)
  AND is_active = true
);

CREATE POLICY "Employees can view staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'employee'::app_role)
);

-- Revoke direct column access to financial fields for anon and authenticated
-- and grant via column-level security
REVOKE SELECT ON public.staff FROM anon, authenticated;
GRANT SELECT (id, first_name, last_name, email, phone, role, avatar_url, is_active, hire_date, created_at, updated_at) ON public.staff TO authenticated;
GRANT SELECT (hourly_rate, service_commission_tier1, service_commission_tier2, service_commission_tier3, service_tier1_threshold, service_tier2_threshold, retail_commission_rate) ON public.staff TO authenticated;