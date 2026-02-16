
-- Add emergency contact, pronouns, and marketing fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS pronouns text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marketing_opt_in text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_tags text[] DEFAULT '{}';
