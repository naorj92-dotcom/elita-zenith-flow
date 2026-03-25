
CREATE TABLE public.staff_weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  revenue_goal numeric NOT NULL DEFAULT 2000,
  appointments_goal integer NOT NULL DEFAULT 15,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (staff_id, week_start)
);

ALTER TABLE public.staff_weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own goals"
  ON public.staff_weekly_goals FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT ur.staff_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_active = true
    )
  );

CREATE POLICY "Staff can upsert own goals"
  ON public.staff_weekly_goals FOR INSERT
  TO authenticated
  WITH CHECK (
    staff_id IN (
      SELECT ur.staff_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_active = true
    )
  );

CREATE POLICY "Staff can update own goals"
  ON public.staff_weekly_goals FOR UPDATE
  TO authenticated
  USING (
    staff_id IN (
      SELECT ur.staff_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_active = true
    )
  );

CREATE POLICY "Owners can manage all goals"
  ON public.staff_weekly_goals FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
