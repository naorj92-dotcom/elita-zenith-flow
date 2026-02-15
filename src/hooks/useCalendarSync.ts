import { supabase } from '@/integrations/supabase/client';

export function useCalendarSync() {
  const syncAppointment = async (appointmentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('Calendar sync skipped: no active session');
        return;
      }

      const response = await supabase.functions.invoke('sync-google-calendar', {
        body: { action: 'sync', appointment_id: appointmentId },
      });

      if (response.error) {
        console.error('Calendar sync error:', response.error);
      } else {
        console.log('Calendar sync result:', response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Calendar sync failed:', error);
    }
  };

  const syncAll = async () => {
    try {
      const response = await supabase.functions.invoke('sync-google-calendar', {
        body: { action: 'sync_all' },
      });

      if (response.error) {
        console.error('Calendar sync_all error:', response.error);
      }

      return response.data;
    } catch (error) {
      console.error('Calendar sync_all failed:', error);
    }
  };

  return { syncAppointment, syncAll };
}
