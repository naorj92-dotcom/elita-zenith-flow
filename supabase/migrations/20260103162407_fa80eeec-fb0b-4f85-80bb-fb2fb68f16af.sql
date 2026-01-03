-- Create form type enum
CREATE TYPE public.form_type AS ENUM ('intake', 'consent', 'contract', 'custom');

-- Create form status enum  
CREATE TYPE public.form_status AS ENUM ('draft', 'pending', 'completed', 'expired');

-- Forms table (templates created by staff)
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  form_type form_type NOT NULL DEFAULT 'custom',
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_signature BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Client form submissions
CREATE TABLE public.client_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  appointment_id UUID REFERENCES public.appointments(id),
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  status form_status NOT NULL DEFAULT 'pending',
  assigned_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_forms ENABLE ROW LEVEL SECURITY;

-- Forms policies (staff can manage, anyone can view active)
CREATE POLICY "Anyone can view active forms" ON public.forms
FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can insert forms" ON public.forms
FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update forms" ON public.forms
FOR UPDATE USING (true);

-- Client forms policies
CREATE POLICY "Staff can manage all client forms" ON public.client_forms
FOR ALL USING (true);

CREATE POLICY "Clients can view own forms" ON public.client_forms
FOR SELECT USING (
  client_id IN (
    SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can update own pending forms" ON public.client_forms
FOR UPDATE USING (
  client_id IN (
    SELECT cp.client_id FROM client_profiles cp WHERE cp.user_id = auth.uid()
  )
  AND status = 'pending'
);

-- Add updated_at triggers
CREATE TRIGGER update_forms_updated_at
BEFORE UPDATE ON public.forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_forms_updated_at
BEFORE UPDATE ON public.client_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample form templates
INSERT INTO public.forms (name, description, form_type, fields, requires_signature) VALUES
(
  'New Client Intake Form',
  'Complete health history and personal information for new clients',
  'intake',
  '[
    {"id": "emergency_contact", "type": "text", "label": "Emergency Contact Name", "required": true},
    {"id": "emergency_phone", "type": "text", "label": "Emergency Contact Phone", "required": true},
    {"id": "allergies", "type": "textarea", "label": "Known Allergies", "required": false},
    {"id": "medications", "type": "textarea", "label": "Current Medications", "required": false},
    {"id": "medical_conditions", "type": "textarea", "label": "Medical Conditions", "required": false},
    {"id": "pregnant", "type": "checkbox", "label": "Are you currently pregnant or nursing?", "required": false},
    {"id": "previous_treatments", "type": "textarea", "label": "Previous Cosmetic Treatments", "required": false}
  ]'::jsonb,
  true
),
(
  'Botox Consent Form',
  'Informed consent for Botox/Neurotoxin treatments',
  'consent',
  '[
    {"id": "understand_risks", "type": "checkbox", "label": "I understand the risks and potential side effects of Botox treatment", "required": true},
    {"id": "no_pregnancy", "type": "checkbox", "label": "I confirm I am not pregnant or breastfeeding", "required": true},
    {"id": "disclosed_medications", "type": "checkbox", "label": "I have disclosed all medications and supplements I am taking", "required": true},
    {"id": "follow_instructions", "type": "checkbox", "label": "I agree to follow all pre and post-treatment instructions", "required": true},
    {"id": "questions", "type": "textarea", "label": "Any questions or concerns?", "required": false}
  ]'::jsonb,
  true
),
(
  'Service Agreement',
  'General terms and conditions for MedSpa services',
  'contract',
  '[
    {"id": "accept_policies", "type": "checkbox", "label": "I accept the cancellation and refund policies", "required": true},
    {"id": "photo_consent", "type": "checkbox", "label": "I consent to before/after photos for my records", "required": true},
    {"id": "marketing_consent", "type": "checkbox", "label": "I consent to anonymous before/after photos for marketing (optional)", "required": false},
    {"id": "hipaa_acknowledgment", "type": "checkbox", "label": "I acknowledge receipt of HIPAA privacy practices", "required": true}
  ]'::jsonb,
  true
);