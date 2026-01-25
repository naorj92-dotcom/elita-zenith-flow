-- =============================================================================
-- SECURITY FIX: Fix remaining USING (true) policies across all tables
-- Fixes: staff_goals_permissive, client_photos_storage, systematic_policy_bypass
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX: staff_goals - Staff can only manage their own goals, owners can manage all
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view own goals" ON public.staff_goals;
DROP POLICY IF EXISTS "Staff can insert own goals" ON public.staff_goals;
DROP POLICY IF EXISTS "Staff can update own goals" ON public.staff_goals;

-- Staff can view their own goals OR owners can view all
CREATE POLICY "Staff can view own goals"
ON public.staff_goals FOR SELECT
USING (
  staff_id IN (SELECT ur.staff_id FROM user_roles ur WHERE ur.user_id = auth.uid())
  OR has_role(auth.uid(), 'owner')
);

-- Staff can insert their own goals OR owners can insert any
CREATE POLICY "Staff can insert own goals"
ON public.staff_goals FOR INSERT
WITH CHECK (
  staff_id IN (SELECT ur.staff_id FROM user_roles ur WHERE ur.user_id = auth.uid())
  OR has_role(auth.uid(), 'owner')
);

-- Staff can update their own goals OR owners can update any
CREATE POLICY "Staff can update own goals"
ON public.staff_goals FOR UPDATE
USING (
  staff_id IN (SELECT ur.staff_id FROM user_roles ur WHERE ur.user_id = auth.uid())
  OR has_role(auth.uid(), 'owner')
);

-- -----------------------------------------------------------------------------
-- 2. FIX: client-photos storage bucket - Add proper role checks
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view all photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete photos" ON storage.objects;

-- Authenticated staff can upload client photos
CREATE POLICY "Auth staff upload client photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-photos' AND
  (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
);

-- Authenticated staff can view all client photos
CREATE POLICY "Auth staff view client photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-photos' AND
  (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
);

-- Staff can update client photos
CREATE POLICY "Auth staff update client photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'client-photos' AND
  (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
);

-- Staff can delete client photos
CREATE POLICY "Auth staff delete client photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-photos' AND
  (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
);

-- -----------------------------------------------------------------------------
-- 3. FIX: forms table - Only owners can manage forms
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can insert forms" ON public.forms;
DROP POLICY IF EXISTS "Staff can update forms" ON public.forms;

CREATE POLICY "Owners can manage forms"
ON public.forms FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- -----------------------------------------------------------------------------
-- 4. FIX: packages table - Only owners can manage packages
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can insert packages" ON public.packages;
DROP POLICY IF EXISTS "Staff can update packages" ON public.packages;

CREATE POLICY "Owners can manage packages"
ON public.packages FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- -----------------------------------------------------------------------------
-- 5. FIX: memberships table - Only owners can manage memberships
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage memberships" ON public.memberships;

CREATE POLICY "Owners can manage memberships"
ON public.memberships FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- -----------------------------------------------------------------------------
-- 6. FIX: client_memberships - Staff can manage (owners + employees only)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage all client memberships" ON public.client_memberships;

CREATE POLICY "Staff can manage client memberships"
ON public.client_memberships FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 7. FIX: loyalty_points - Staff can manage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage all loyalty points" ON public.loyalty_points;

CREATE POLICY "Staff can manage loyalty points"
ON public.loyalty_points FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 8. FIX: waitlist - Staff can manage, anyone can add (keep this)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage all waitlist entries" ON public.waitlist;

CREATE POLICY "Staff can manage waitlist"
ON public.waitlist FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 9. FIX: service_recommendations - Staff can manage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage all service recommendations" ON public.service_recommendations;

CREATE POLICY "Staff can manage service recommendations"
ON public.service_recommendations FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 10. FIX: product_recommendations - Staff can manage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage all product recommendations" ON public.product_recommendations;

CREATE POLICY "Staff can manage product recommendations"
ON public.product_recommendations FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 11. FIX: before_after_photos - Staff can manage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage all photos" ON public.before_after_photos;

CREATE POLICY "Staff can manage photos"
ON public.before_after_photos FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 12. FIX: client_forms - Staff can manage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage all client forms" ON public.client_forms;

CREATE POLICY "Staff can manage client forms"
ON public.client_forms FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 13. FIX: client_packages - Staff can manage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage all client packages" ON public.client_packages;

CREATE POLICY "Staff can manage client packages"
ON public.client_packages FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 14. FIX: notification_templates - Only owners can manage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage notification templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Staff can view notification templates" ON public.notification_templates;

CREATE POLICY "Owners can manage notification templates"
ON public.notification_templates FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- Staff can view templates
CREATE POLICY "Staff can view notification templates"
ON public.notification_templates FOR SELECT
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 15. FIX: notification_logs - Staff can view/create
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can create notification logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Staff can view notification logs" ON public.notification_logs;

CREATE POLICY "Staff can create notification logs"
ON public.notification_logs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

CREATE POLICY "Staff can view notification logs"
ON public.notification_logs FOR SELECT
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 16. FIX: receipts - Staff can manage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage all receipts" ON public.receipts;

CREATE POLICY "Staff can manage receipts"
ON public.receipts FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- -----------------------------------------------------------------------------
-- 17. FIX: client_profiles - Staff can manage, users can manage own
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can insert client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Staff can update client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Staff can view all client profiles" ON public.client_profiles;

CREATE POLICY "Staff can manage client profiles"
ON public.client_profiles FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));