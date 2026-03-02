
-- 1. Tighten audit_logs INSERT: only staff (not any authenticated user)
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;
CREATE POLICY "Staff can create audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
