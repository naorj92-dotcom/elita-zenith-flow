
-- Create calendar_sync table to track Google Calendar event mappings
CREATE TABLE public.calendar_sync (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  sync_status text NOT NULL DEFAULT 'synced',
  last_synced_at timestamp with time zone NOT NULL DEFAULT now(),
  sync_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(appointment_id),
  UNIQUE(google_event_id, google_calendar_id)
);

-- Enable RLS
ALTER TABLE public.calendar_sync ENABLE ROW LEVEL SECURITY;

-- Only staff/owners can manage calendar sync records
CREATE POLICY "Staff can manage calendar sync"
ON public.calendar_sync
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Index for fast lookups
CREATE INDEX idx_calendar_sync_appointment ON public.calendar_sync(appointment_id);
CREATE INDEX idx_calendar_sync_google_event ON public.calendar_sync(google_event_id, google_calendar_id);
