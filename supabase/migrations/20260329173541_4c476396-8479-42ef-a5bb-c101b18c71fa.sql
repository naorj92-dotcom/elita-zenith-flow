
-- Drop the overly permissive employee SELECT policy
DROP POLICY IF EXISTS "Employees can view staff" ON public.staff;

-- Employees can only view their own staff record (full access to own data including compensation)
CREATE POLICY "Employees can view own staff record"
ON public.staff
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT ur.staff_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.is_active = true
  )
);
