
-- Create enum for client goals
CREATE TYPE public.client_goal AS ENUM (
  'fat_loss',
  'body_sculpting', 
  'skin_tightening',
  'face_glow',
  'post_weight_loss'
);

-- Create enum for treatment categories (Elita Method)
CREATE TYPE public.treatment_category AS ENUM (
  'freeze',
  'tone',
  'tight',
  'glow'
);

-- Client goals table
CREATE TABLE public.client_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  goal client_goal NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, goal)
);

-- Track treatment sessions per category
CREATE TABLE public.client_treatment_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category treatment_category NOT NULL,
  sessions_completed INTEGER NOT NULL DEFAULT 0,
  sessions_target INTEGER NOT NULL DEFAULT 6,
  last_session_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, category)
);

-- Enable RLS
ALTER TABLE public.client_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_treatment_progress ENABLE ROW LEVEL SECURITY;

-- RLS: Clients can manage own goals
CREATE POLICY "Clients can view own goals" ON public.client_goals
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Clients can insert own goals" ON public.client_goals
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Clients can update own goals" ON public.client_goals
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Staff can manage client goals" ON public.client_goals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));

-- RLS: Treatment progress
CREATE POLICY "Clients can view own progress" ON public.client_treatment_progress
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()));

CREATE POLICY "Staff can manage treatment progress" ON public.client_treatment_progress
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'employee'));
