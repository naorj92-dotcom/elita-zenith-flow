-- Fix Realtime: Remove sensitive tables from publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.transactions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.staff_goals;
ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;

-- Fix audit_logs: Restrict INSERT to owners only
DROP POLICY IF EXISTS "Staff can create audit logs" ON public.audit_logs;

CREATE POLICY "Owners can create audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));