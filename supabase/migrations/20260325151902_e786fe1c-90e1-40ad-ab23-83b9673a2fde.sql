ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referring_client_id uuid REFERENCES public.clients(id);