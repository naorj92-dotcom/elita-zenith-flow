-- Create notification templates table
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  category TEXT NOT NULL CHECK (category IN ('appointment_reminder', 'appointment_confirmation', 'membership_renewal', 'loyalty_update', 'general')),
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification logs table
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.notification_templates(id),
  client_id UUID REFERENCES public.clients(id),
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates (staff can manage)
CREATE POLICY "Staff can view notification templates" 
ON public.notification_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage notification templates" 
ON public.notification_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS policies for logs (staff can view)
CREATE POLICY "Staff can view notification logs" 
ON public.notification_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can create notification logs" 
ON public.notification_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.notification_templates (name, type, category, subject, body, variables) VALUES
-- Appointment Reminders
('Appointment Reminder - 24hr', 'email', 'appointment_reminder', 
 'Reminder: Your appointment tomorrow at Elita MedSpa', 
 'Hi {{client_name}},

This is a friendly reminder about your upcoming appointment:

📅 Date: {{appointment_date}}
⏰ Time: {{appointment_time}}
💆 Service: {{service_name}}
👤 With: {{staff_name}}

📍 Location: Elita MedSpa
   [Your Address Here]

Need to reschedule? Please call us at least 24 hours in advance.

We look forward to seeing you!

Warm regards,
The Elita MedSpa Team',
 '["client_name", "appointment_date", "appointment_time", "service_name", "staff_name"]'::jsonb),

('Appointment Confirmation', 'email', 'appointment_confirmation',
 'Your Elita MedSpa Appointment is Confirmed!',
 'Hi {{client_name}},

Great news! Your appointment has been confirmed:

📅 Date: {{appointment_date}}
⏰ Time: {{appointment_time}}
💆 Service: {{service_name}}
👤 With: {{staff_name}}
💰 Total: ${{amount}}

Pre-Appointment Tips:
• Arrive 10-15 minutes early for check-in
• Wear comfortable clothing
• Avoid caffeine before your treatment

Questions? Reply to this email or call us.

See you soon!
The Elita MedSpa Team',
 '["client_name", "appointment_date", "appointment_time", "service_name", "staff_name", "amount"]'::jsonb),

-- Membership Renewal
('Membership Renewal Reminder', 'email', 'membership_renewal',
 'Your Elita MedSpa Membership Renews Soon',
 'Hi {{client_name}},

Your {{membership_name}} membership is set to renew on {{renewal_date}}.

Current Benefits:
✨ {{monthly_credits}} service credits per month
🛍️ {{retail_discount}}% off retail products
⭐ Priority booking access

Next billing amount: ${{amount}}

Want to upgrade or make changes? Log in to your client portal or contact us.

Thank you for being a valued member!

The Elita MedSpa Team',
 '["client_name", "membership_name", "renewal_date", "monthly_credits", "retail_discount", "amount"]'::jsonb),

('Membership Credits Reset', 'email', 'membership_renewal',
 'Your Monthly Credits Have Been Refreshed!',
 'Hi {{client_name}},

Great news! Your {{membership_name}} membership credits have been refreshed for this month.

You now have {{credits}} service credits available.

Ready to book? Visit your client portal to schedule your next treatment.

The Elita MedSpa Team',
 '["client_name", "membership_name", "credits"]'::jsonb),

-- Loyalty Points
('Loyalty Points Earned', 'email', 'loyalty_update',
 'You Just Earned Loyalty Points! 🎉',
 'Hi {{client_name}},

Congratulations! You''ve earned {{points_earned}} loyalty points from your recent visit.

Your current balance: {{total_points}} points

Earning more:
• Every $1 spent = 1 point
• Refer a friend = 100 bonus points
• Birthday month = 2x points

Redeem your points for exclusive rewards in your client portal!

The Elita MedSpa Team',
 '["client_name", "points_earned", "total_points"]'::jsonb),

('Loyalty Milestone Reached', 'email', 'loyalty_update',
 'Congratulations! You''ve Reached a Loyalty Milestone! 🌟',
 'Hi {{client_name}},

Amazing! You''ve reached {{milestone}} loyalty points!

As a thank you for your loyalty, you''ve unlocked:
🎁 {{reward_description}}

Visit your client portal to claim your reward.

Thank you for choosing Elita MedSpa!

The Elita MedSpa Team',
 '["client_name", "milestone", "reward_description"]'::jsonb),

-- SMS Templates
('SMS Appointment Reminder', 'sms', 'appointment_reminder',
 NULL,
 'Elita MedSpa: Reminder - {{service_name}} appt tomorrow at {{appointment_time}}. Reply CONFIRM or call to reschedule.',
 '["service_name", "appointment_time"]'::jsonb),

('SMS Appointment Confirmation', 'sms', 'appointment_confirmation',
 NULL,
 'Elita MedSpa: Your {{service_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. See you soon!',
 '["service_name", "appointment_date", "appointment_time"]'::jsonb),

('SMS Points Earned', 'sms', 'loyalty_update',
 NULL,
 'Elita MedSpa: You earned {{points}} pts! Total: {{total_points}}. Redeem in your portal.',
 '["points", "total_points"]'::jsonb);