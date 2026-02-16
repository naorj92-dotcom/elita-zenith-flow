
-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'staff')),
  sender_staff_id UUID REFERENCES public.staff(id),
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Clients can view their own messages
CREATE POLICY "Clients can view own messages"
ON public.messages FOR SELECT
USING (client_id IN (
  SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
));

-- Clients can send messages
CREATE POLICY "Clients can insert own messages"
ON public.messages FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
  ) AND sender_type = 'client'
);

-- Staff can manage all messages
CREATE POLICY "Staff can manage messages"
ON public.messages FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
