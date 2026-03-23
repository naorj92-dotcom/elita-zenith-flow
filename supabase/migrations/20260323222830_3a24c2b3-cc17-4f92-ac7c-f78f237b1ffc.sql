
-- Journey stage configuration table for admin to configure per-stage details
CREATE TABLE public.journey_stage_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL UNIQUE CHECK (stage IN ('freeze', 'tone', 'tight', 'glow')),
  description text,
  timeline_estimate text,
  sessions_target integer NOT NULL DEFAULT 6,
  service_ids uuid[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journey_stage_configs ENABLE ROW LEVEL SECURITY;

-- Anyone can read stage configs
CREATE POLICY "Anyone can view stage configs"
  ON public.journey_stage_configs FOR SELECT
  TO authenticated
  USING (true);

-- Only owners can manage
CREATE POLICY "Owners can manage stage configs"
  ON public.journey_stage_configs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Seed default configs
INSERT INTO public.journey_stage_configs (stage, description, timeline_estimate, sessions_target) VALUES
  ('freeze', 'Fat reduction through advanced cryolipolysis technology. Targets and eliminates stubborn fat cells for a sculpted silhouette.', '6 sessions over 8–10 weeks', 6),
  ('tone', 'Muscle sculpting using electromagnetic stimulation to build and define muscle tone.', '6 sessions over 6–8 weeks', 6),
  ('tight', 'Skin tightening with radiofrequency technology to firm and rejuvenate treated areas.', '4 sessions over 6–8 weeks', 4),
  ('glow', 'Skin rejuvenation combining hydration, exfoliation, and light therapy for radiant results.', '4 sessions over 4–6 weeks', 4);

-- Updated at trigger
CREATE TRIGGER update_journey_stage_configs_updated_at
  BEFORE UPDATE ON public.journey_stage_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
