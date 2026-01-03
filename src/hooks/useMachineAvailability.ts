import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, addDays, setHours, setMinutes } from 'date-fns';

interface Machine {
  id: string;
  name: string;
  machine_type: string;
  quantity: number;
  status: 'active' | 'maintenance';
}

interface ServiceWithMachine {
  id: string;
  name: string;
  duration_minutes: number;
  recovery_buffer_minutes: number;
  machine_type_id: string | null;
  price: number;
  category: string;
  description: string | null;
  is_active: boolean;
  requires_consent: boolean;
}

interface Appointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  service_id: string | null;
  staff_id: string | null;
  status: string;
}

export function useMachineAvailability(selectedDate: Date | undefined) {
  // Fetch all machines
  const { data: machines } = useQuery({
    queryKey: ['machines-availability'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      return data as Machine[];
    },
  });

  // Fetch services with machine associations
  const { data: services } = useQuery({
    queryKey: ['services-with-machines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as ServiceWithMachine[];
    },
  });

  // Fetch all appointments for the selected date
  const { data: dayAppointments } = useQuery({
    queryKey: ['day-appointments', selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const dayStart = startOfDay(selectedDate);
      const dayEnd = addDays(dayStart, 1);
      const { data, error } = await supabase
        .from('appointments')
        .select('id, scheduled_at, duration_minutes, service_id, staff_id, status')
        .gte('scheduled_at', dayStart.toISOString())
        .lt('scheduled_at', dayEnd.toISOString())
        .not('status', 'in', '("cancelled","no_show")');
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!selectedDate,
  });

  // Check if a specific service is available at a given time slot
  const isServiceAvailableAtSlot = (
    serviceId: string,
    slot: { hour: number; minute: number },
    staffId?: string
  ): boolean => {
    if (!selectedDate || !services || !machines) return false;

    const service = services.find(s => s.id === serviceId);
    if (!service) return false;

    // If service doesn't require a machine, it's available
    if (!service.machine_type_id) return true;

    const machine = machines.find(m => m.id === service.machine_type_id);
    if (!machine) return false;

    const slotTime = setMinutes(setHours(selectedDate, slot.hour), slot.minute);
    const slotEnd = new Date(slotTime.getTime() + (service.duration_minutes + service.recovery_buffer_minutes) * 60000);

    // Count how many machines of this type are in use during this time slot
    const machinesInUse = dayAppointments?.filter(apt => {
      const aptService = services.find(s => s.id === apt.service_id);
      if (!aptService?.machine_type_id || aptService.machine_type_id !== service.machine_type_id) return false;

      const aptStart = new Date(apt.scheduled_at);
      const aptEnd = new Date(aptStart.getTime() + (aptService.duration_minutes + aptService.recovery_buffer_minutes) * 60000);

      // Check for time overlap
      return (
        (slotTime >= aptStart && slotTime < aptEnd) ||
        (slotEnd > aptStart && slotEnd <= aptEnd) ||
        (slotTime <= aptStart && slotEnd >= aptEnd)
      );
    }).length || 0;

    // Available if machines in use is less than total quantity
    return machinesInUse < machine.quantity;
  };

  // Get available services for a time slot (hide services whose machines are fully booked)
  const getAvailableServicesAtSlot = (slot: { hour: number; minute: number }): string[] => {
    if (!services) return [];
    
    return services
      .filter(service => isServiceAvailableAtSlot(service.id, slot))
      .map(s => s.id);
  };

  // Check if a time slot is available for a specific service and provider
  const isSlotAvailableForBooking = (
    serviceId: string,
    staffId: string,
    slot: { hour: number; minute: number }
  ): boolean => {
    if (!selectedDate || !services) return false;

    const service = services.find(s => s.id === serviceId);
    if (!service) return false;

    const slotTime = setMinutes(setHours(selectedDate, slot.hour), slot.minute);
    const slotEnd = new Date(slotTime.getTime() + (service.duration_minutes + service.recovery_buffer_minutes) * 60000);

    // Check if slot is in the past
    if (slotTime < new Date()) return false;

    // Check staff availability
    const staffBusy = dayAppointments?.some(apt => {
      if (apt.staff_id !== staffId) return false;
      const aptService = services.find(s => s.id === apt.service_id);
      const aptDuration = aptService ? aptService.duration_minutes + aptService.recovery_buffer_minutes : apt.duration_minutes;
      const aptStart = new Date(apt.scheduled_at);
      const aptEnd = new Date(aptStart.getTime() + aptDuration * 60000);

      return (
        (slotTime >= aptStart && slotTime < aptEnd) ||
        (slotEnd > aptStart && slotEnd <= aptEnd) ||
        (slotTime <= aptStart && slotEnd >= aptEnd)
      );
    });

    if (staffBusy) return false;

    // Check machine availability
    return isServiceAvailableAtSlot(serviceId, slot, staffId);
  };

  return {
    machines,
    services,
    dayAppointments,
    isServiceAvailableAtSlot,
    getAvailableServicesAtSlot,
    isSlotAvailableForBooking,
  };
}
