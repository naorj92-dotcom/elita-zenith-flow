
CREATE TABLE public.skin_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  photo_url text,
  skin_score integer DEFAULT 0,
  overall_summary text,
  concerns jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  next_steps text,
  shared_with_provider boolean DEFAULT false,
  shared_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.skin_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own analyses"
ON public.skin_analyses FOR SELECT
TO authenticated
USING (client_id IN (
  SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
));

CREATE POLICY "Clients can insert own analyses"
ON public.skin_analyses FOR INSERT
TO authenticated
WITH CHECK (client_id IN (
  SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
));

CREATE POLICY "Clients can update own analyses"
ON public.skin_analyses FOR UPDATE
TO authenticated
USING (client_id IN (
  SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
));

CREATE POLICY "Staff can manage all analyses"
ON public.skin_analyses FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));
