-- Fix 1: user_roles - Add RESTRICTIVE policy to prevent non-owner INSERT/UPDATE/DELETE
-- The existing "Owners can manage all roles" ALL policy has WITH CHECK for owners,
-- but permissive policies are OR'd together, so we need a RESTRICTIVE policy to block non-owners

CREATE POLICY "Only owners can write roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (true)
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Fix 2: gift_cards - Replace broad staff policy with owner-only full access
-- and limited employee access (read-only for processing)
DROP POLICY IF EXISTS "Staff can manage gift cards" ON public.gift_cards;

-- Owners get full access
CREATE POLICY "Owners can manage gift cards"
ON public.gift_cards
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Employees can only read gift cards (needed for POS redemption)
CREATE POLICY "Employees can view gift cards"
ON public.gift_cards
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));

-- Employees can update gift cards (for redemption at checkout)
CREATE POLICY "Employees can update gift cards"
ON public.gift_cards
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role))
WITH CHECK (has_role(auth.uid(), 'employee'::app_role));