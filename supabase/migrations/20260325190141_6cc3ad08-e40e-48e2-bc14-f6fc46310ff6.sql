
-- Drop all triggers first, then recreate them
DROP TRIGGER IF EXISTS trg_auto_assign_appointment_forms ON public.appointments;
DROP TRIGGER IF EXISTS trg_auto_assign_intake_forms ON public.appointments;
DROP TRIGGER IF EXISTS trg_notify_staff_new_appointment ON public.appointments;
DROP TRIGGER IF EXISTS trg_notify_staff_cancelled_appointment ON public.appointments;
DROP TRIGGER IF EXISTS trg_notify_staff_client_checked_in ON public.appointments;
DROP TRIGGER IF EXISTS trg_notify_staff_new_client ON public.clients;
DROP TRIGGER IF EXISTS trg_notify_staff_new_review ON public.client_reviews;
DROP TRIGGER IF EXISTS trg_notify_staff_form_submitted ON public.client_forms;
DROP TRIGGER IF EXISTS trg_notify_client_form_assigned ON public.client_forms;
DROP TRIGGER IF EXISTS trg_notify_client_new_message ON public.messages;
DROP TRIGGER IF EXISTS trg_notify_client_points_earned ON public.loyalty_points;
DROP TRIGGER IF EXISTS trg_notify_staff_inventory_low ON public.inventory_batches;
DROP TRIGGER IF EXISTS trg_notify_staff_membership_failed ON public.client_memberships;
DROP TRIGGER IF EXISTS trg_notify_staff_skin_analysis_shared ON public.skin_analyses;
DROP TRIGGER IF EXISTS trg_cleanup_old_notifications ON public.in_app_notifications;
DROP TRIGGER IF EXISTS trg_lock_old_chart_notes ON public.appointment_soap_notes;
DROP TRIGGER IF EXISTS trg_update_updated_at_appointments ON public.appointments;
DROP TRIGGER IF EXISTS trg_update_updated_at_services ON public.services;
DROP TRIGGER IF EXISTS trg_update_updated_at_clients ON public.clients;
DROP TRIGGER IF EXISTS trg_update_updated_at_client_forms ON public.client_forms;
DROP TRIGGER IF EXISTS trg_update_updated_at_soap_notes ON public.appointment_soap_notes;

-- Recreate all triggers
CREATE TRIGGER trg_auto_assign_appointment_forms AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.auto_assign_appointment_forms();
CREATE TRIGGER trg_auto_assign_intake_forms AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.auto_assign_intake_forms();
CREATE TRIGGER trg_notify_staff_new_appointment AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.notify_staff_new_appointment();
CREATE TRIGGER trg_notify_staff_cancelled_appointment AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.notify_staff_cancelled_appointment();
CREATE TRIGGER trg_notify_staff_client_checked_in AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.notify_staff_client_checked_in();
CREATE TRIGGER trg_notify_staff_new_client AFTER INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.notify_staff_new_client();
CREATE TRIGGER trg_notify_staff_new_review AFTER INSERT ON public.client_reviews FOR EACH ROW EXECUTE FUNCTION public.notify_staff_new_review();
CREATE TRIGGER trg_notify_staff_form_submitted AFTER UPDATE ON public.client_forms FOR EACH ROW EXECUTE FUNCTION public.notify_staff_form_submitted();
CREATE TRIGGER trg_notify_client_form_assigned AFTER INSERT ON public.client_forms FOR EACH ROW EXECUTE FUNCTION public.notify_client_form_assigned();
CREATE TRIGGER trg_notify_client_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_client_new_message();
CREATE TRIGGER trg_notify_client_points_earned AFTER INSERT ON public.loyalty_points FOR EACH ROW EXECUTE FUNCTION public.notify_client_points_earned();
CREATE TRIGGER trg_notify_staff_inventory_low AFTER UPDATE ON public.inventory_batches FOR EACH ROW EXECUTE FUNCTION public.notify_staff_inventory_low();
CREATE TRIGGER trg_notify_staff_membership_failed AFTER UPDATE ON public.client_memberships FOR EACH ROW EXECUTE FUNCTION public.notify_staff_membership_failed();
CREATE TRIGGER trg_notify_staff_skin_analysis_shared AFTER UPDATE ON public.skin_analyses FOR EACH ROW EXECUTE FUNCTION public.notify_staff_skin_analysis_shared();
CREATE TRIGGER trg_cleanup_old_notifications AFTER INSERT ON public.in_app_notifications FOR EACH ROW EXECUTE FUNCTION public.cleanup_old_notifications();
CREATE TRIGGER trg_lock_old_chart_notes BEFORE UPDATE ON public.appointment_soap_notes FOR EACH ROW EXECUTE FUNCTION public.lock_old_chart_notes();
CREATE TRIGGER trg_update_updated_at_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_update_updated_at_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_update_updated_at_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_update_updated_at_client_forms BEFORE UPDATE ON public.client_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_update_updated_at_soap_notes BEFORE UPDATE ON public.appointment_soap_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
