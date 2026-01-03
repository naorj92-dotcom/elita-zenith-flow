-- Create staff_goals table for daily goals and achievements
CREATE TABLE public.staff_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  goal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_sales_goal NUMERIC NOT NULL DEFAULT 500,
  goal_achieved BOOLEAN NOT NULL DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  bonus_commission_rate NUMERIC DEFAULT 5.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, goal_date)
);

-- Enable RLS
ALTER TABLE public.staff_goals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view own goals" 
ON public.staff_goals 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can insert own goals" 
ON public.staff_goals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Staff can update own goals" 
ON public.staff_goals 
FOR UPDATE 
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_goals;

-- Create trigger for updated_at
CREATE TRIGGER update_staff_goals_updated_at
BEFORE UPDATE ON public.staff_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();