import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isBefore, startOfDay, addDays, setHours, setMinutes, isAfter } from 'date-fns';
import { Calendar, Clock, User, Eye, X, CalendarClock, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DEMO_APPOINTMENTS } from '@/hooks/useDemoData';
import { VisitTimeline } from '@/components/portal/VisitTimeline';
import { EmptyState } from '@/components/shared/EmptyState';
import { useNavigate } from 'react-router-dom';

const TIME_SLOTS = [
  { hour: 9, minute: 0 },
  { hour: 10, minute: 0 },
  { hour: 11, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 13, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 15, minute: 0 },
  { hour: 16, minute: 0 },
  { hour: 17, minute: 0 },
];

export function ClientHistoryPage({ defaultTab = 'visits' }: { defaultTab?: 'visits' | 'payments' }) {
  const { client } = useClientAuth();
  const isDemo = false;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [cancelApt, setCancelApt] = useState<any>(null);
  const [rescheduleApt, setRescheduleApt] = useState<any>(null);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newTime, setNewTime] = useState<{ hour: number; minute: number } | null>(null);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['client-history', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_APPOINTMENTS;
      if (!client?.id) return [];
      const { data } = await supabase
        .from('appointments')
        .select('*, services(*), staff(*)')
        .eq('client_id', client.id)
        .order('scheduled_at', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id || isDemo,
  });

  // Fetch chart notes for completed visits
  const completedIds = appointments?.filter(a => a.status === 'completed').map(a => a.id) || [];
  const { data: chartNotes } = useQuery({
    queryKey: ['client-chart-notes', completedIds],
    queryFn: async () => {
      if (completedIds.length === 0) return [];
      const { data } = await supabase
        .from('treatment_chart_notes')
        .select('appointment_id, followup_instructions, before_photo_url, after_photo_url')
        .in('appointment_id', completedIds);
      return data || [];
    },
    enabled: completedIds.length > 0,
  });

  // Fetch loyalty points for completed visits
  const { data: pointsData } = useQuery({
    queryKey: ['client-visit-points', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('loyalty_points')
        .select('related_appointment_id, points')
        .eq('client_id', client.id)
        .eq('transaction_type', 'earn');
      return data || [];
    },
    enabled: !!client?.id,
  });

  const { data: providerAppointments } = useQuery({
    queryKey: ['reschedule-availability', rescheduleApt?.staff_id, newDate],
    queryFn: async () => {
      if (!rescheduleApt?.staff_id || !newDate) return [];
      const dayStart = startOfDay(newDate);
      const dayEnd = addDays(dayStart, 1);
      const { data } = await supabase
        .from('appointments')
        .select('id, scheduled_at, duration_minutes')
        .eq('staff_id', rescheduleApt.staff_id)
        .gte('scheduled_at', dayStart.toISOString())
        .lt('scheduled_at', dayEnd.toISOString())
        .not('status', 'in', '("cancelled","no_show")')
        .neq('id', rescheduleApt.id);
      return data || [];
    },
    enabled: !!rescheduleApt?.staff_id && !!newDate,
  });

  const cancelMutation = useMutation({
    mutationFn: async (aptId: string) => {
      const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', aptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-history'] });
      queryClient.invalidateQueries({ queryKey: ['client-next-appointment'] });
      toast.success('Appointment cancelled successfully');
      setCancelApt(null);
    },
    onError: () => toast.error('Failed to cancel appointment'),
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!rescheduleApt || !newDate || !newTime) return;
      const scheduledAt = setMinutes(setHours(newDate, newTime.hour), newTime.minute);
      const { error } = await supabase
        .from('appointments')
        .update({ scheduled_at: scheduledAt.toISOString() })
        .eq('id', rescheduleApt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-history'] });
      queryClient.invalidateQueries({ queryKey: ['client-next-appointment'] });
      toast.success('Appointment rescheduled successfully');
      closeReschedule();
    },
    onError: () => toast.error('Failed to reschedule appointment'),
  });

  const closeReschedule = () => {
    setRescheduleApt(null);
    setNewDate(undefined);
    setNewTime(null);
  };

  const isSlotAvailable = (slot: { hour: number; minute: number }) => {
    if (!newDate || !rescheduleApt) return false;
    const slotTime = setMinutes(setHours(newDate, slot.hour), slot.minute);
    const duration = rescheduleApt.services?.duration_minutes || rescheduleApt.duration_minutes || 60;
    const slotEnd = new Date(slotTime.getTime() + duration * 60000);
    if (isBefore(slotTime, new Date())) return false;
    return !providerAppointments?.some(apt => {
      const aptStart = new Date(apt.scheduled_at);
      const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000);
      return (
        (isAfter(slotTime, aptStart) && isBefore(slotTime, aptEnd)) ||
        (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
        (isBefore(slotTime, aptStart) && isAfter(slotEnd, aptEnd)) ||
        slotTime.getTime() === aptStart.getTime()
      );
    });
  };

  const pastAppointments = appointments?.filter(a =>
    new Date(a.scheduled_at) < new Date() || a.status === 'completed'
  ) || [];

  const upcomingAppointments = appointments?.filter(a =>
    new Date(a.scheduled_at) >= new Date() &&
    !['completed', 'cancelled', 'no_show'].includes(a.status)
  ) || [];

  // Build chart note map
  const chartNoteMap = new Map(
    (chartNotes || []).map(n => [n.appointment_id, n])
  );
  const pointsMap = new Map(
    (pointsData || []).map(p => [p.related_appointment_id, p.points])
  );

  // Enrich past visits for timeline
  const timelineVisits = pastAppointments.map(apt => ({
    ...apt,
    chartNote: chartNoteMap.get(apt.id) || null,
    pointsEarned: pointsMap.get(apt.id) || 0,
    journeyStage: null as string | null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Treatment History</h1>
        <p className="text-muted-foreground mt-1">Your complete appointment history</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-6">
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* ===== VISITS TAB ===== */}
        <TabsContent value="visits" className="space-y-8">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="card-luxury">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-5 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Upcoming appointments */}
              {upcomingAppointments.length > 0 && (
                <section>
                  <h2 className="text-xl font-heading font-medium mb-4">Upcoming</h2>
                  <div className="space-y-3">
                    {upcomingAppointments.map((apt) => (
                      <Card key={apt.id} className="card-luxury border-primary/20">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Calendar className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{apt.services?.name || 'Appointment'}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(apt.scheduled_at), 'EEE, MMM d, yyyy')}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    {format(new Date(apt.scheduled_at), 'h:mm a')}
                                  </span>
                                  {apt.staff && (
                                    <span className="flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5" />
                                      {apt.staff.first_name} {apt.staff.last_name}
                                    </span>
                                  )}
                                </div>
                                {!isDemo && (
                                  <div className="flex items-center gap-2 mt-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5 text-xs"
                                      onClick={() => {
                                        setRescheduleApt(apt);
                                        setNewDate(undefined);
                                        setNewTime(null);
                                      }}
                                    >
                                      <CalendarClock className="h-3.5 w-3.5" />
                                      Reschedule
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setCancelApt(apt)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge variant="default" className="shrink-0">{apt.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Past visits timeline */}
              {timelineVisits.length > 0 ? (
                <section>
                  <h2 className="text-xl font-heading font-medium mb-5">Past Visits</h2>
                  <VisitTimeline visits={timelineVisits} />
                </section>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary/40" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-foreground">
                    Your Elita journey starts here.
                  </h3>
                  <Button
                    onClick={() => navigate('/portal/book')}
                    className="mt-2"
                  >
                    Book Your First Appointment →
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </TabsContent>

        {/* ===== PACKAGES TAB ===== */}
        <TabsContent value="packages">
          <Card className="card-luxury">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Packages</h3>
              <p className="text-muted-foreground">View your treatment packages in the dedicated packages page.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/portal/packages')}>
                View Packages
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PAYMENTS TAB ===== */}
        <TabsContent value="payments">
          <PaymentsTab clientId={client?.id} />
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelApt} onOpenChange={(open) => { if (!open) setCancelApt(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Cancel Appointment
            </DialogTitle>
            <DialogDescription>Are you sure you want to cancel this appointment?</DialogDescription>
          </DialogHeader>
          {cancelApt && (
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <p className="font-medium">{cancelApt.services?.name || 'Appointment'}</p>
              <p className="text-muted-foreground">
                {format(new Date(cancelApt.scheduled_at), 'EEEE, MMMM d, yyyy · h:mm a')}
              </p>
              {cancelApt.staff && (
                <p className="text-muted-foreground">
                  with {cancelApt.staff.first_name} {cancelApt.staff.last_name}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelApt(null)}>Keep Appointment</Button>
            <Button
              variant="destructive"
              onClick={() => cancelApt && cancelMutation.mutate(cancelApt.id)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelling...</> : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleApt} onOpenChange={(open) => { if (!open) closeReschedule(); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription>
              {rescheduleApt?.services?.name} — currently on{' '}
              {rescheduleApt && format(new Date(rescheduleApt.scheduled_at), 'MMM d · h:mm a')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">New Date</p>
              <CalendarPicker
                mode="single"
                selected={newDate}
                onSelect={(d) => { setNewDate(d); setNewTime(null); }}
                disabled={(date) => isBefore(date, startOfDay(new Date())) || date.getDay() === 0}
                className={cn("rounded-md border pointer-events-auto")}
              />
            </div>
            {newDate && (
              <div>
                <p className="text-sm font-medium mb-2">New Time</p>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const available = isSlotAvailable(slot);
                    const isSelected = newTime?.hour === slot.hour && newTime?.minute === slot.minute;
                    return (
                      <Button
                        key={`${slot.hour}-${slot.minute}`}
                        variant={isSelected ? 'default' : 'outline'}
                        disabled={!available}
                        onClick={() => setNewTime(slot)}
                        className={!available ? 'opacity-50' : ''}
                        size="sm"
                      >
                        {format(setMinutes(setHours(new Date(), slot.hour), slot.minute), 'h:mm a')}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={closeReschedule}>Cancel</Button>
            <Button
              onClick={() => rescheduleMutation.mutate()}
              disabled={!newDate || !newTime || rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rescheduling...</> : 'Confirm New Time'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Simple payments sub-tab showing completed appointment payments */
function PaymentsTab({ clientId }: { clientId?: string }) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['client-payments', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from('appointments')
        .select('id, scheduled_at, total_amount, services(name), staff(first_name, last_name)')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gt('total_amount', 0)
        .order('scheduled_at', { ascending: false });
      return data || [];
    },
    enabled: !!clientId,
  });

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />;

  if (!payments?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No payment history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((p: any) => (
        <Card key={p.id} className="card-luxury">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{p.services?.name || 'Payment'}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(p.scheduled_at), 'MMM d, yyyy')}
                {p.staff && ` · ${p.staff.first_name} ${p.staff.last_name}`}
              </p>
            </div>
            <p className="font-semibold text-foreground">${p.total_amount}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
