import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentStatus } from '@/types';
import { useCalendarSync, GoogleCalendarEvent } from '@/hooks/useCalendarSync';
import { ScheduleHeader, CalendarView } from '@/components/schedule/ScheduleHeader';
import { CalendarTimeGrid } from '@/components/schedule/CalendarTimeGrid';

interface ScheduleAppointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  total_amount: number;
  client_name: string;
  service_name: string;
  staff_name: string;
  room_name: string | null;
}

export function SchedulePage() {
  const { staff } = useAuth();
  const { pullEvents } = useCalendarSync();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [view, setView] = useState<CalendarView>('day');
  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const getDates = useCallback((): Date[] => {
    const count = view === 'day' ? 1 : view === '4day' ? 4 : 7;
    const start = new Date(selectedDate);
    if (view === 'week') {
      start.setDate(start.getDate() - start.getDay()); // start on Sunday
    }
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [selectedDate, view]);

  const fetchData = useCallback(async () => {
    if (!staff) return;
    setIsLoading(true);

    const dates = getDates();
    const startOfRange = new Date(dates[0]);
    startOfRange.setHours(0, 0, 0, 0);
    const endOfRange = new Date(dates[dates.length - 1]);
    endOfRange.setHours(23, 59, 59, 999);

    const [dbResult, gcEvents] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          id, scheduled_at, duration_minutes, status, notes, total_amount,
          clients (first_name, last_name),
          services (name),
          staff (first_name, last_name),
          rooms (name)
        `)
        .gte('scheduled_at', startOfRange.toISOString())
        .lte('scheduled_at', endOfRange.toISOString())
        .order('scheduled_at', { ascending: true }),
      pullEvents(startOfRange.toISOString(), endOfRange.toISOString()),
    ]);

    if (dbResult.data) {
      setAppointments(
        dbResult.data.map((apt: any) => ({
          id: apt.id,
          scheduled_at: apt.scheduled_at,
          duration_minutes: apt.duration_minutes,
          status: apt.status as AppointmentStatus,
          notes: apt.notes,
          total_amount: apt.total_amount,
          client_name: apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'Walk-in',
          service_name: apt.services?.name || 'Service',
          staff_name: apt.staff ? `${apt.staff.first_name} ${apt.staff.last_name}` : '',
          room_name: apt.rooms?.name || null,
        }))
      );
    }

    setGoogleEvents(gcEvents.filter((ev) => !ev.extendedProperties?.private?.elita_appointment_id));
    setIsLoading(false);
  }, [staff, getDates, pullEvents]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setIsSyncing(true);
    await fetchData();
    setIsSyncing(false);
  };

  const stepSize = view === 'day' ? 1 : view === '4day' ? 4 : 7;

  const handlePrev = () =>
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - stepSize);
      return d;
    });

  const handleNext = () =>
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + stepSize);
      return d;
    });

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  };

  return (
    <div className="p-4 md:p-6 max-w-full">
      <ScheduleHeader
        selectedDate={selectedDate}
        view={view}
        onViewChange={setView}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onSync={handleSync}
        isSyncing={isSyncing}
      />
      <CalendarTimeGrid
        dates={getDates()}
        appointments={appointments}
        googleEvents={googleEvents}
        isLoading={isLoading}
      />
    </div>
  );
}
