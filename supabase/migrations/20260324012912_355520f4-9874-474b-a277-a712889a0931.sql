
-- Tighten the INSERT policy to only allow inserts where user_id matches the caller OR the caller is staff
DROP POLICY "Authenticated can insert notifications" ON public.in_app_notifications;

CREATE POLICY "Users or staff can insert notifications"
ON public.in_app_notifications FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'employee'::app_role)
);
