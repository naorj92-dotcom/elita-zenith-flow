
-- Add fields for client profile (Boulevard-style)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS scheduling_alert TEXT,
  ADD COLUMN IF NOT EXISTS medications TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS text_notifications BOOLEAN NOT NULL DEFAULT true;
