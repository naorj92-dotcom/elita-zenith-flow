import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentStatus } from '@/types';
import { useCalendarSync, GoogleCalendarEvent } from '@/hooks/useCalendarSync';
import { ScheduleHeader, CalendarView } from '@/components/schedule/ScheduleHeader';
import { CalendarTimeGrid } from '@/components/schedule/CalendarTimeGrid';
import { RescheduleDialog } from '@/components/schedule/RescheduleDialog';
import { toast } from 'sonner';

export interface ScheduleAppointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  total_amount: number;
  client_name: string;
  service_name: string;
  staff_name: string;
  staff_id: string | null;
  client_id: string | null;
  room_name: string | null;
}

export interface ScheduleStaff {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: string;
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
  const [staffList, setStaffList] = useState<ScheduleStaff[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullCalendar, setIsFullCalendar] = useState(false);
  const [clientDetailsMap, setClientDetailsMap] = useState<Record<string, any>>({});

  // Reschedule dialog state
  const [rescheduleApt, setRescheduleApt] = useState<ScheduleAppointment | null>(null);
  const [rescheduleNewTime, setRescheduleNewTime] = useState<Date | null>(null);
  const [rescheduleNewStaffId, setRescheduleNewStaffId] = useState<string | null>(null);
  const [rescheduleNewStaffName, setRescheduleNewStaffName] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase
        .from('staff')
        .select('id, first_name, last_name, avatar_url, role')
        .eq('is_active', true)
        .order('first_name', { ascending: true });
      if (data) {
        setStaffList(data);
        setSelectedStaffIds(data.map((s) => s.id));
      }
    };
    fetchStaff();
  }, []);

  const getDates = useCallback((): Date[] => {
    const count = view === 'day' ? 1 : view === '4day' ? 4 : 7;
    const start = new Date(selectedDate);
    if (view === 'week') {
      start.setDate(start.getDate() - start.getDay());
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
          id, scheduled_at, duration_minutes, status, notes, total_amount, staff_id, client_id,
          clients (first_name, last_name, phone, email, visit_count, total_spent, date_of_birth),
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
      const newClientMap: Record<string, any> = {};
      const mapped = dbResult.data.map((apt: any) => {
        const id = apt.id;
        if (apt.clients) {
          newClientMap[id] = {
            phone: apt.clients.phone,
            email: apt.clients.email,
            visit_count: apt.clients.visit_count,
            total_spent: apt.clients.total_spent,
            date_of_birth: apt.clients.date_of_birth,
          };
        }
        return {
          id,
          scheduled_at: apt.scheduled_at,
          duration_minutes: apt.duration_minutes,
          status: apt.status as AppointmentStatus,
          notes: apt.notes,
          total_amount: apt.total_amount,
          staff_id: apt.staff_id,
          client_id: apt.client_id,
          client_name: apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'Walk-in',
          service_name: apt.services?.name || 'Service',
          staff_name: apt.staff ? `${apt.staff.first_name} ${apt.staff.last_name}` : '',
          room_name: apt.rooms?.name || null,
        };
      });
      setAppointments(mapped);
      setClientDetailsMap(newClientMap);
    }

    setGoogleEvents(gcEvents.filter((ev) => !ev.extendedProperties?.private?.elita_appointment_id));
    setIsLoading(false);
  }, [staff, getDates, pullEvents]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, selectedDate, view]);

  const handleSync = async () => {
    setIsSyncing(true);
    await fetchData();
    setIsSyncing(false);
  };

  const handleAppointmentDrop = (appointmentId: string, newScheduledAt: Date, newStaffId?: string | null) => {
    if (appointmentId.startsWith('gcal-')) {
      const gcalId = appointmentId.replace('gcal-', '');
      const gEvent = googleEvents.find((e) => e.id === gcalId);
      if (!gEvent) return;

      const startStr = gEvent.start?.dateTime || gEvent.start?.date || '';
      const endStr = gEvent.end?.dateTime || gEvent.end?.date || '';
      const start = new Date(startStr);
      const end = endStr ? new Date(endStr) : new Date(start.getTime() + 3600000);
      const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
      const parts = (gEvent.summary || '').split(' - ');

      const fakeApt: ScheduleAppointment = {
        id: appointmentId,
        scheduled_at: start.toISOString(),
        duration_minutes: durationMin,
        status: 'scheduled',
        notes: null,
        total_amount: 0,
        client_name: parts[1]?.trim() || parts[0]?.trim() || 'Unknown',
        service_name: parts[0]?.trim() || 'Appointment',
        staff_name: '',
        staff_id: null,
        client_id: null,
        room_name: null,
      };

      setRescheduleApt(fakeApt);
      setRescheduleNewTime(newScheduledAt);
      setRescheduleNewStaffId(null);
      setRescheduleNewStaffName(null);
      return;
    }
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return;
    
    // Resolve new staff info
    const targetStaff = newStaffId ? staffList.find(s => s.id === newStaffId) : null;
    
    setRescheduleApt(apt);
    setRescheduleNewTime(newScheduledAt);
    setRescheduleNewStaffId(newStaffId || null);
    setRescheduleNewStaffName(targetStaff ? `${targetStaff.first_name} ${targetStaff.last_name}` : null);
  };

  const handleRescheduleConfirm = async () => {
    if (!rescheduleApt || !rescheduleNewTime) return;
    setIsRescheduling(true);

    if (rescheduleApt.id.startsWith('gcal-')) {
      const gcalId = rescheduleApt.id.replace('gcal-', '');
      setGoogleEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== gcalId) return ev;
          const dur = rescheduleApt.duration_minutes || 60;
          const newEnd = new Date(rescheduleNewTime.getTime() + dur * 60000);
          return {
            ...ev,
            start: { ...ev.start, dateTime: rescheduleNewTime.toISOString() },
            end: { ...ev.end, dateTime: newEnd.toISOString() },
          };
        })
      );
      toast.success('Appointment moved locally (not synced to Google)');
    } else {
      const updateData: Record<string, any> = { scheduled_at: rescheduleNewTime.toISOString() };
      if (rescheduleNewStaffId && rescheduleNewStaffId !== rescheduleApt.staff_id) {
        updateData.staff_id = rescheduleNewStaffId;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', rescheduleApt.id);

      if (error) {
        toast.error('Failed to update appointment');
      } else {
        const actions = [];
        if (rescheduleNewStaffId && rescheduleNewStaffId !== rescheduleApt.staff_id) actions.push('reassigned');
        if (new Date(rescheduleApt.scheduled_at).getTime() !== rescheduleNewTime.getTime()) actions.push('rescheduled');
        toast.success(`Appointment ${actions.join(' & ')} successfully`);
        await fetchData();
      }
    }

    setIsRescheduling(false);
    setRescheduleApt(null);
    setRescheduleNewTime(null);
    setRescheduleNewStaffId(null);
    setRescheduleNewStaffName(null);
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: status as any })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Appointment ${status.replace('_', ' ')}`);
      await fetchData();
    }
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

  const filteredStaff = isFullCalendar ? staffList : staffList.filter((s) => selectedStaffIds.includes(s.id));

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
        staffList={staffList}
        selectedStaffIds={selectedStaffIds}
        onSelectedStaffChange={setSelectedStaffIds}
        isFullCalendar={isFullCalendar}
        onFullCalendarChange={setIsFullCalendar}
      />
      <CalendarTimeGrid
        dates={getDates()}
        appointments={appointments}
        googleEvents={googleEvents}
        isLoading={isLoading}
        staffList={filteredStaff}
        onAppointmentDrop={handleAppointmentDrop}
        onStatusChange={handleStatusChange}
        onClientChanged={fetchData}
        clientDetailsMap={clientDetailsMap}
      />
      <RescheduleDialog
        open={!!rescheduleApt}
        onOpenChange={(open) => { if (!open) { setRescheduleApt(null); setRescheduleNewTime(null); setRescheduleNewStaffId(null); setRescheduleNewStaffName(null); } }}
        appointment={rescheduleApt}
        newScheduledAt={rescheduleNewTime}
        newStaffId={rescheduleNewStaffId}
        newStaffName={rescheduleNewStaffName}
        onConfirm={handleRescheduleConfirm}
        isLoading={isRescheduling}
      />
    </div>
  );
}
