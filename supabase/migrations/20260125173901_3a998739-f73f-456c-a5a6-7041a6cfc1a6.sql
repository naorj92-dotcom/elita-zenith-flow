-- =============================================================================
-- SECURITY FIX: Implement proper RLS policies for all exposed tables
-- Fixes: staff_table_public_exposure, client_side_role_checks, 
--        clients_table_public_exposure, gift_cards_public_exposure,
--        treatment_photos_public
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX: Staff table - Remove public access, restrict to authenticated users
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read access to staff" ON public.staff;
DROP POLICY IF EXISTS "Allow public insert to staff" ON public.staff;
DROP POLICY IF EXISTS "Allow public update to staff" ON public.staff;

-- Owners can manage all staff records
CREATE POLICY "Owners can manage staff"
ON public.staff FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- Authenticated employees can view staff (for scheduling, etc.)
CREATE POLICY "Employees can view staff"
ON public.staff FOR SELECT
USING (has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 2. FIX: Clients table - Remove public access, restrict to authenticated staff
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public insert to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public update to clients" ON public.clients;

-- Owners and employees can view all clients
CREATE POLICY "Staff can view clients"
ON public.clients FOR SELECT
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- Owners and employees can create clients
CREATE POLICY "Staff can create clients"
ON public.clients FOR INSERT
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- Owners and employees can update clients
CREATE POLICY "Staff can update clients"
ON public.clients FOR UPDATE
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- Clients can view their own record via client_profiles
CREATE POLICY "Clients can view own record"
ON public.clients FOR SELECT
USING (
  id IN (
    SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 3. FIX: Gift cards table - Remove public access policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view gift card by code" ON public.gift_cards;
DROP POLICY IF EXISTS "Staff can manage gift cards" ON public.gift_cards;

-- Only staff can manage gift cards
CREATE POLICY "Staff can manage gift cards"
ON public.gift_cards FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 4. FIX: Appointments table - Remove public access
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public insert to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public update to appointments" ON public.appointments;

-- Staff can manage all appointments
CREATE POLICY "Staff can manage appointments"
ON public.appointments FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- Clients can view their own appointments
CREATE POLICY "Clients can view own appointments"
ON public.appointments FOR SELECT
USING (
  client_id IN (
    SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 5. FIX: Transactions table - Remove public access (financial data)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read access to transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow public insert to transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow public update to transactions" ON public.transactions;

-- Only owners and employees can access transactions
CREATE POLICY "Staff can manage transactions"
ON public.transactions FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 6. FIX: Time clock table - Remove public access
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read access to time_clock" ON public.time_clock;
DROP POLICY IF EXISTS "Allow public insert to time_clock" ON public.time_clock;
DROP POLICY IF EXISTS "Allow public update to time_clock" ON public.time_clock;

-- Staff can manage time clock entries
CREATE POLICY "Staff can manage time clock"
ON public.time_clock FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 7. FIX: Rooms table - Remove public access
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read access to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow public insert to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow public update to rooms" ON public.rooms;

-- Staff can view rooms
CREATE POLICY "Staff can view rooms"
ON public.rooms FOR SELECT
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- Only owners can manage rooms
CREATE POLICY "Owners can manage rooms"
ON public.rooms FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- -----------------------------------------------------------------------------
-- 8. FIX: Machines table - Remove public access
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read access to machines" ON public.machines;
DROP POLICY IF EXISTS "Allow public insert to machines" ON public.machines;
DROP POLICY IF EXISTS "Allow public update to machines" ON public.machines;

-- Staff can view machines
CREATE POLICY "Staff can view machines"
ON public.machines FOR SELECT
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- Only owners can manage machines
CREATE POLICY "Owners can manage machines"
ON public.machines FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- -----------------------------------------------------------------------------
-- 9. FIX: Services table - Public read is OK, but restrict write access
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public insert to services" ON public.services;
DROP POLICY IF EXISTS "Allow public update to services" ON public.services;

-- Only owners can manage services
CREATE POLICY "Owners can manage services"
ON public.services FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- -----------------------------------------------------------------------------
-- 10. FIX: Products table - Only owners can manage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can insert products" ON public.products;
DROP POLICY IF EXISTS "Staff can update products" ON public.products;

-- Only owners can manage products
CREATE POLICY "Owners can manage products"
ON public.products FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- -----------------------------------------------------------------------------
-- 11. FIX: Treatment photos storage bucket - Make private
-- -----------------------------------------------------------------------------
UPDATE storage.buckets 
SET public = false 
WHERE id = 'treatment-photos';

-- Fix storage policies
DROP POLICY IF EXISTS "Staff can upload treatment photos" ON storage.objects;
DROP POLICY IF EXISTS "Treatment photos are publicly accessible" ON storage.objects;

-- Authenticated staff can upload treatment photos
CREATE POLICY "Auth staff upload treatment photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'treatment-photos' AND
  (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
);

-- Authenticated staff can view treatment photos
CREATE POLICY "Auth staff view treatment photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'treatment-photos' AND
  (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
);

-- Staff can update/delete treatment photos
CREATE POLICY "Auth staff manage treatment photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'treatment-photos' AND
  (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
);

CREATE POLICY "Auth staff delete treatment photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'treatment-photos' AND
  (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
);