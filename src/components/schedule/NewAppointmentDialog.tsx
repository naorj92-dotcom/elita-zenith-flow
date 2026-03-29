import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Calendar, User, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  defaultClientId?: string | null;
  defaultDate?: Date | null;
  defaultStaffId?: string | null;
}

interface ClientOption { id: string; first_name: string; last_name: string; }
interface ServiceOption { id: string; name: string; duration_minutes: number; price: number; category: string; machine_type_id: string | null; required_room_type: string | null; }
interface StaffOption { id: string; first_name: string; last_name: string; role: string; }
interface RoomOption { id: string; name: string; }

export function NewAppointmentDialog({ open, onOpenChange, onCreated, defaultClientId, defaultDate, defaultStaffId }: NewAppointmentDialogProps) {
  const { staff: currentStaff, isOwner, isProvider } = useUnifiedAuth();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Load options when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      supabase.from('clients').select('id, first_name, last_name').order('first_name').limit(500),
      supabase.from('services').select('id, name, duration_minutes, price, category, machine_type_id, required_room_type').eq('is_active', true).order('name'),
      supabase.rpc('get_staff_public_info'),
      supabase.from('rooms').select('id, name').eq('is_active', true).order('name'),
    ]).then(([cRes, sRes, stRes, rRes]) => {
      setClients(cRes.data || []);
      setServices(sRes.data || []);
      setStaffList(stRes.data || []);
      setRooms(rRes.data || []);
      setLoading(false);
    });

    // Set defaults
    const d = defaultDate || new Date();
    setDate(d.toISOString().split('T')[0]);
    setClientId(defaultClientId || '');
    // Providers auto-select themselves
    if (isProvider && currentStaff) {
      setStaffId(currentStaff.id);
    } else {
      setStaffId(defaultStaffId || '');
    }
    setServiceId('');
    setRoomId('');
    setTime('10:00');
    setNotes('');
    setClientSearch('');
  }, [open, defaultClientId, defaultDate, defaultStaffId, isProvider, currentStaff]);

  const selectedService = services.find(s => s.id === serviceId);

  const filteredClients = clientSearch.length > 0
    ? clients.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearch.toLowerCase())
      ).slice(0, 50)
    : clients.slice(0, 50);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !serviceId || !staffId || !date || !time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    const scheduledAt = new Date(`${date}T${time}:00`);
    const service = services.find(s => s.id === serviceId);

    const { data: newApt, error } = await supabase.from('appointments').insert({
      client_id: clientId,
      service_id: serviceId,
      staff_id: staffId,
      room_id: roomId || null,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: service?.duration_minutes || 60,
      total_amount: service?.price || 0,
      status: 'scheduled',
      notes: notes || null,
    }).select('id').single();

    if (error) {
      toast.error('Failed to create appointment: ' + error.message);
    } else {
      toast.success('Appointment created successfully');
      // Fire confirmation notification (non-blocking)
      if (newApt?.id) {
        supabase.functions.invoke('send-appointment-confirmation', {
          body: { appointment_id: newApt.id },
        }).catch(err => console.error('Confirmation send error:', err));
      }
      onOpenChange(false);
      onCreated?.();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            New Appointment
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Client *
              </Label>
              <Input
                placeholder="Search clients..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="mb-1"
              />
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {filteredClients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" /> Service *
              </Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes}min — ${s.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedService && (
                <p className="text-xs text-muted-foreground">
                  Duration: {selectedService.duration_minutes}min · Price: ${selectedService.price}
                </p>
              )}
            </div>

            {/* Provider */}
            <div className="space-y-2">
              <Label>Provider *</Label>
              {isProvider && currentStaff ? (
                <Input
                  value={`${currentStaff.first_name} ${currentStaff.last_name}`}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList
                      .filter(s => s.role === 'provider' || s.role === 'admin')
                      .map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} required step="900" />
              </div>
            </div>

            {/* Room */}
            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-assign / Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Appointment'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}