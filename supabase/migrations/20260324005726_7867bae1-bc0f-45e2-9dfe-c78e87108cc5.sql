
-- Add opt-out fields to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sms_opt_out boolean NOT NULL DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email_opt_out boolean NOT NULL DEFAULT false;

-- Create notification_triggers table for admin toggle control
CREATE TABLE public.notification_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  channels text[] NOT NULL DEFAULT '{email}',
  email_subject text,
  email_body text NOT NULL DEFAULT '',
  sms_body text NOT NULL DEFAULT '',
  timing_description text,
  google_review_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage notification triggers"
  ON public.notification_triggers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Staff can view notification triggers"
  ON public.notification_triggers FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Seed the 5 trigger configs
INSERT INTO public.notification_triggers (trigger_key, name, description, channels, timing_description, email_subject, email_body, sms_body) VALUES
(
  '48hr_appointment_reminder',
  '48hr Appointment Reminder',
  'Sent 48 hours before any appointment',
  '{email,sms}',
  '48 hours before appointment',
  'Reminder: Your {{service_name}} Appointment',
  'Hi {{first_name}},\n\nThis is a reminder that your {{service_name}} is scheduled for {{weekday}} at {{time}} with {{provider_first_name}} at Elita Medical Spa.\n\n{{forms_message}}\n\nWe look forward to seeing you!',
  'Hi {{first_name}}, reminder: your {{service_name}} is {{weekday}} at {{time}} with {{provider_first_name}} at Elita Medical Spa. {{forms_message}} Reply STOP to opt out.'
),
(
  '2hr_same_day_reminder',
  '2hr Same-Day Reminder',
  'Sent 2 hours before appointment start time',
  '{sms}',
  '2 hours before appointment',
  '',
  '',
  'See you soon, {{first_name}}! Your {{service_name}} is today at {{time}}. Running late? Reply LATE and we''ll hold your spot.'
),
(
  '24hr_post_visit_followup',
  '24hr Post-Visit Follow-Up',
  'Sent 24 hours after appointment is completed',
  '{email,sms}',
  '24 hours after completion',
  'How Are You Feeling After Your {{service_name}}?',
  'Hi {{first_name}},\n\nWe hope you love your results! Your aftercare notes are available in your Elita portal: {{portal_url}}\n\nA quick Google review means the world to us: {{google_review_url}}\n\nQuestions? Just reply to this email.',
  'Hi {{first_name}}, hope you love your results! Your aftercare notes are in your Elita portal: {{portal_url}}. A quick Google review means the world to us: {{google_review_url}}. Questions? Just reply here.'
),
(
  'package_expiry_warning',
  'Package Expiry Warning',
  'Sent 7 days before package expiry if sessions remain',
  '{email,sms}',
  '7 days before package expiry',
  'Your {{package_name}} Package is Expiring Soon',
  'Hi {{first_name}},\n\nYour {{package_name}} has {{sessions_remaining}} session(s) expiring on {{expiry_date}}. Don''t let them go to waste!\n\nBook now: {{portal_url}}',
  'Hi {{first_name}}, your {{package_name}} has {{sessions_remaining}} session(s) expiring on {{expiry_date}}. Don''t let them go to waste! Book now: {{portal_url}}'
),
(
  'membership_renewal_reminder',
  'Membership Renewal Reminder',
  'Sent 5 days before monthly membership renewal',
  '{email,sms}',
  '5 days before renewal',
  'Your Elita Membership Renews Soon',
  'Hi {{first_name}},\n\nYour Elita membership renews on {{renewal_date}}. Book your included {{included_service}} this month: {{portal_url}}',
  'Hi {{first_name}}, your Elita membership renews on {{renewal_date}}. Book your included {{included_service}} this month: {{portal_url}}'
);
