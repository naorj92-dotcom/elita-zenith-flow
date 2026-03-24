
-- Checkout upsell rules (Pair With rules configured by admin)
CREATE TABLE public.checkout_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  suggested_service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  display_text text NOT NULL DEFAULT '',
  suggested_price numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage checkout rules"
  ON public.checkout_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Staff can view checkout rules"
  ON public.checkout_rules FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Upsell suggestion logs
CREATE TABLE public.upsell_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  rule_type text NOT NULL,
  suggestion_text text NOT NULL,
  action text NOT NULL DEFAULT 'shown',
  dollar_value numeric,
  related_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  related_package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.upsell_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage upsell logs"
  ON public.upsell_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));
