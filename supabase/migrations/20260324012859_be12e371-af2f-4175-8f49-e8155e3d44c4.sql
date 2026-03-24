
-- In-app notifications table
CREATE TABLE public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_type text NOT NULL DEFAULT 'staff',
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  icon text DEFAULT 'bell',
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_in_app_notif_user ON public.in_app_notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_in_app_notif_created ON public.in_app_notifications(created_at);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications"
ON public.in_app_notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can update own notifications (mark read)
CREATE POLICY "Users can update own notifications"
ON public.in_app_notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- System/staff can insert notifications (via service role or any authenticated)
CREATE POLICY "Authenticated can insert notifications"
ON public.in_app_notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- Owners can manage all notifications
CREATE POLICY "Owners can manage all notifications"
ON public.in_app_notifications FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;

-- Auto-delete notifications older than 30 days (function + trigger)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.in_app_notifications
  WHERE created_at < now() - interval '30 days';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_old_notifications
AFTER INSERT ON public.in_app_notifications
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_notifications();

-- ===== STAFF NOTIFICATION TRIGGERS =====

-- 1. New appointment booked by client
CREATE OR REPLACE FUNCTION public.notify_staff_new_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_service RECORD;
  v_staff_user_id uuid;
BEGIN
  -- Only fire when client books (status = scheduled, inserted)
  IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

  SELECT first_name, last_name INTO v_client FROM public.clients WHERE id = NEW.client_id;
  SELECT name INTO v_service FROM public.services WHERE id = NEW.service_id;

  -- Notify all owners
  INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
  SELECT ur.user_id, 'staff', 'appointment',
    'New Appointment Booked',
    COALESCE(v_client.first_name, '') || ' ' || COALESCE(v_client.last_name, '') || ' booked ' || COALESCE(v_service.name, 'an appointment'),
    'calendar', '/schedule',
    'appointment', NEW.id
  FROM public.user_roles ur WHERE ur.role = 'owner' AND ur.is_active = true;

  -- Notify assigned provider
  IF NEW.staff_id IS NOT NULL THEN
    SELECT user_id INTO v_staff_user_id FROM public.user_roles WHERE staff_id = NEW.staff_id AND is_active = true LIMIT 1;
    IF v_staff_user_id IS NOT NULL THEN
      INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
      VALUES (v_staff_user_id, 'staff', 'appointment',
        'New Appointment Booked',
        COALESCE(v_client.first_name, '') || ' ' || COALESCE(v_client.last_name, '') || ' booked ' || COALESCE(v_service.name, 'an appointment'),
        'calendar', '/schedule',
        'appointment', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_staff_new_appointment
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_new_appointment();

-- 2. Appointment cancelled by client
CREATE OR REPLACE FUNCTION public.notify_staff_cancelled_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_service RECORD;
BEGIN
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' AND NEW.client_id IS NOT NULL THEN
    SELECT first_name, last_name INTO v_client FROM public.clients WHERE id = NEW.client_id;
    SELECT name INTO v_service FROM public.services WHERE id = NEW.service_id;

    INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
    SELECT ur.user_id, 'staff', 'appointment',
      'Appointment Cancelled',
      COALESCE(v_client.first_name, '') || ' ' || COALESCE(v_client.last_name, '') || ' cancelled ' || COALESCE(v_service.name, 'their appointment'),
      'calendar-x', '/schedule',
      'appointment', NEW.id
    FROM public.user_roles ur WHERE ur.role IN ('owner') AND ur.is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_staff_cancelled
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_cancelled_appointment();

-- 3. Client submitted a form
CREATE OR REPLACE FUNCTION public.notify_staff_form_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_form RECORD;
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    SELECT first_name, last_name INTO v_client FROM public.clients WHERE id = NEW.client_id;
    SELECT name INTO v_form FROM public.forms WHERE id = NEW.form_id;

    INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
    SELECT ur.user_id, 'staff', 'form',
      'Form Submitted',
      COALESCE(v_client.first_name, '') || ' ' || COALESCE(v_client.last_name, '') || ' completed ' || COALESCE(v_form.name, 'a form'),
      'file-text', '/clients/' || NEW.client_id,
      'client_form', NEW.id
    FROM public.user_roles ur WHERE ur.role = 'owner' AND ur.is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_staff_form_submitted
AFTER UPDATE ON public.client_forms
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_form_submitted();

-- 4. Client shared AI Skin Analysis
CREATE OR REPLACE FUNCTION public.notify_staff_skin_analysis_shared()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
BEGIN
  IF (OLD.shared_with_provider IS DISTINCT FROM true) AND NEW.shared_with_provider = true THEN
    SELECT first_name, last_name INTO v_client FROM public.clients WHERE id = NEW.client_id;

    INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
    SELECT ur.user_id, 'staff', 'skin_analysis',
      'Skin Analysis Shared',
      COALESCE(v_client.first_name, '') || ' ' || COALESCE(v_client.last_name, '') || ' shared their AI skin analysis for review',
      'sparkles', '/clients/' || NEW.client_id,
      'skin_analysis', NEW.id
    FROM public.user_roles ur WHERE ur.role IN ('owner') AND ur.is_active = true
    UNION ALL
    SELECT ur.user_id, 'staff', 'skin_analysis',
      'Skin Analysis Shared',
      COALESCE(v_client.first_name, '') || ' ' || COALESCE(v_client.last_name, '') || ' shared their AI skin analysis for review',
      'sparkles', '/clients/' || NEW.client_id,
      'skin_analysis', NEW.id
    FROM public.user_roles ur WHERE ur.role = 'employee' AND ur.employee_type = 'provider' AND ur.is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_staff_skin_analysis
AFTER UPDATE ON public.skin_analyses
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_skin_analysis_shared();

-- 5. New client registered
CREATE OR REPLACE FUNCTION public.notify_staff_new_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
  SELECT ur.user_id, 'staff', 'client',
    'New Client Registered',
    COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '') || ' joined via the client portal',
    'user-plus', '/clients/' || NEW.id,
    'client', NEW.id
  FROM public.user_roles ur WHERE ur.role = 'owner' AND ur.is_active = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_staff_new_client
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_new_client();

-- ===== CLIENT NOTIFICATION TRIGGERS =====

-- 1. Appointment confirmed (status change to 'scheduled')
-- Already handled by insert trigger above, client gets notified on booking

-- 2. Form assigned to client
CREATE OR REPLACE FUNCTION public.notify_client_form_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_form RECORD;
BEGIN
  SELECT cp.user_id INTO v_user_id FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id LIMIT 1;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  
  SELECT name INTO v_form FROM public.forms WHERE id = NEW.form_id;

  INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
  VALUES (v_user_id, 'client', 'form',
    'New Form to Complete',
    'Please complete: ' || COALESCE(v_form.name, 'Required Form'),
    'file-text', '/portal/forms',
    'client_form', NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_client_form_assigned
AFTER INSERT ON public.client_forms
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_form_assigned();

-- 3. Staff sent a message to client
CREATE OR REPLACE FUNCTION public.notify_client_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.sender_type = 'staff' THEN
    SELECT cp.user_id INTO v_user_id FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id LIMIT 1;
    IF v_user_id IS NULL THEN RETURN NEW; END IF;

    INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
    VALUES (v_user_id, 'client', 'message',
      'New Message',
      LEFT(NEW.body, 100),
      'message-square', '/portal/messages',
      'message', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_client_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_new_message();

-- 4. Loyalty points earned
CREATE OR REPLACE FUNCTION public.notify_client_points_earned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.transaction_type IN ('earned', 'bonus') THEN
    SELECT cp.user_id INTO v_user_id FROM public.client_profiles cp WHERE cp.client_id = NEW.client_id LIMIT 1;
    IF v_user_id IS NULL THEN RETURN NEW; END IF;

    INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
    VALUES (v_user_id, 'client', 'rewards',
      'Points Earned! 🎉',
      'You earned ' || NEW.points || ' loyalty points' || COALESCE(' — ' || NEW.description, ''),
      'star', '/portal/rewards',
      'loyalty_points', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_client_points_earned
AFTER INSERT ON public.loyalty_points
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_points_earned();
