
-- Create 4 new trigger functions + attach 4 new triggers

CREATE OR REPLACE FUNCTION public.notify_staff_client_checked_in()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_client RECORD; v_service RECORD;
BEGIN
  IF (OLD.checked_in_at IS NULL AND NEW.checked_in_at IS NOT NULL) THEN
    SELECT first_name, last_name INTO v_client FROM public.clients WHERE id = NEW.client_id;
    SELECT name INTO v_service FROM public.services WHERE id = NEW.service_id;
    INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
    SELECT ur.user_id, 'staff', 'appointment', 'Client Checked In',
      COALESCE(v_client.first_name,'') || ' ' || COALESCE(v_client.last_name,'') || ' checked in for ' || COALESCE(v_service.name, 'their appointment'),
      'calendar', '/schedule', 'appointment', NEW.id
    FROM public.user_roles ur WHERE ur.role = 'owner' AND ur.is_active = true;
    IF NEW.staff_id IS NOT NULL THEN
      INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
      SELECT ur.user_id, 'staff', 'appointment', 'Client Checked In',
        COALESCE(v_client.first_name,'') || ' ' || COALESCE(v_client.last_name,'') || ' checked in for ' || COALESCE(v_service.name, 'their appointment'),
        'calendar', '/schedule', 'appointment', NEW.id
      FROM public.user_roles ur WHERE ur.staff_id = NEW.staff_id AND ur.is_active = true;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_staff_inventory_low()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_product RECORD; v_total_remaining integer;
BEGIN
  SELECT ip.name, ip.reorder_threshold INTO v_product FROM public.inventory_products ip WHERE ip.id = NEW.product_id;
  SELECT COALESCE(SUM(quantity_remaining), 0) INTO v_total_remaining FROM public.inventory_batches WHERE product_id = NEW.product_id AND is_active = true;
  IF v_total_remaining <= v_product.reorder_threshold THEN
    INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
    SELECT ur.user_id, 'staff', 'inventory', 'Low Inventory Alert',
      COALESCE(v_product.name, 'Product') || ' is running low (' || v_total_remaining || ' remaining)',
      'alert-triangle', '/admin/inventory', 'inventory_product', NEW.product_id
    FROM public.user_roles ur WHERE ur.role = 'owner' AND ur.is_active = true;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_staff_new_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_client RECORD;
BEGIN
  SELECT first_name, last_name INTO v_client FROM public.clients WHERE id = NEW.client_id;
  INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
  SELECT ur.user_id, 'staff', 'general', 'New Review',
    COALESCE(v_client.first_name,'') || ' ' || COALESCE(v_client.last_name,'') || ' left a ' || NEW.rating || '-star review',
    'star', '/clients/' || NEW.client_id, 'client_review', NEW.id
  FROM public.user_roles ur WHERE ur.role = 'owner' AND ur.is_active = true;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_staff_membership_failed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_client RECORD;
BEGIN
  IF OLD.status != 'past_due' AND NEW.status = 'past_due' THEN
    SELECT first_name, last_name INTO v_client FROM public.clients WHERE id = NEW.client_id;
    INSERT INTO public.in_app_notifications (user_id, recipient_type, category, title, body, icon, action_url, related_entity_type, related_entity_id)
    SELECT ur.user_id, 'staff', 'membership', 'Membership Payment Failed',
      COALESCE(v_client.first_name,'') || ' ' || COALESCE(v_client.last_name,'') || '''s membership payment failed',
      'credit-card', '/clients/' || NEW.client_id, 'client_membership', NEW.id
    FROM public.user_roles ur WHERE ur.role = 'owner' AND ur.is_active = true;
  END IF;
  RETURN NEW;
END; $$;

-- Attach triggers
CREATE TRIGGER trg_notify_staff_client_checked_in AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.notify_staff_client_checked_in();
CREATE TRIGGER trg_notify_staff_inventory_low AFTER UPDATE ON public.inventory_batches FOR EACH ROW EXECUTE FUNCTION public.notify_staff_inventory_low();
CREATE TRIGGER trg_notify_staff_new_review AFTER INSERT ON public.client_reviews FOR EACH ROW EXECUTE FUNCTION public.notify_staff_new_review();
CREATE TRIGGER trg_notify_staff_membership_failed AFTER UPDATE ON public.client_memberships FOR EACH ROW EXECUTE FUNCTION public.notify_staff_membership_failed();
