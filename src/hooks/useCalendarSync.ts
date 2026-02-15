import { supabase } from '@/integrations/supabase/client';

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  extendedProperties?: {
    private?: {
      elita_appointment_id?: string;
      elita_provider?: string;
      elita_room?: string;
    };
  };
}

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

  const pullEvents = async (timeMin: string, timeMax: string): Promise<GoogleCalendarEvent[]> => {
    try {
      const response = await supabase.functions.invoke('sync-google-calendar', {
        body: { action: 'pull', time_min: timeMin, time_max: timeMax },
      });

      if (response.error) {
        console.error('Calendar pull error:', response.error);
        return [];
      }

      return response.data?.events || [];
    } catch (error) {
      console.error('Calendar pull failed:', error);
      return [];
    }
  };

  return { syncAppointment, syncAll, pullEvents };
}
