-- Create receipts table for POS receipt storage
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  transaction_id UUID REFERENCES public.transactions(id),
  appointment_id UUID REFERENCES public.appointments(id),
  client_id UUID REFERENCES public.clients(id),
  staff_id UUID REFERENCES public.staff(id),
  
  -- Service details
  service_name TEXT,
  service_price NUMERIC NOT NULL DEFAULT 0,
  machine_used TEXT,
  treatment_summary JSONB DEFAULT '{}',
  
  -- Retail items
  retail_items JSONB DEFAULT '[]',
  retail_total NUMERIC NOT NULL DEFAULT 0,
  
  -- Financial breakdown
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 8.25,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  tip_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- Payment info
  payment_method TEXT DEFAULT 'card',
  
  -- Receipt metadata
  receipt_format TEXT NOT NULL DEFAULT 'standard',
  google_review_url TEXT DEFAULT 'https://g.page/r/elite-medspa/review',
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Staff can manage all receipts
CREATE POLICY "Staff can manage all receipts"
  ON public.receipts
  FOR ALL
  USING (true);

-- Clients can view their own receipts
CREATE POLICY "Clients can view own receipts"
  ON public.receipts
  FOR SELECT
  USING (client_id IN (
    SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
  ));

-- Create updated_at trigger
CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_receipts_client_id ON public.receipts(client_id);
CREATE INDEX idx_receipts_transaction_id ON public.receipts(transaction_id);
CREATE INDEX idx_receipts_created_at ON public.receipts(created_at DESC);