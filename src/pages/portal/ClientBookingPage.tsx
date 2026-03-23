import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, setHours, setMinutes, isBefore, isAfter, startOfDay } from 'date-fns';
import { CalendarIcon, Clock, User, Check, ArrowLeft, ArrowRight, Loader2, Cpu, AlertCircle, Sparkles, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useMachineAvailability } from '@/hooks/useMachineAvailability';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { CelebrationOverlay } from '@/components/shared/CelebrationOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

type BookingStep = 'service' | 'provider' | 'datetime' | 'confirm';
const STEPS: BookingStep[] = ['service', 'provider', 'datetime', 'confirm'];
const STEP_LABELS = ['Treatment', 'Provider', 'Date & Time', 'Confirm'];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

export function ClientBookingPage() {
  const { client } = useClientAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<BookingStep>('service');
  const [direction, setDirection] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<{ hour: number; minute: number } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const { isSlotAvailableForBooking, machines } = useMachineAvailability(selectedDate);
  const { syncAppointment } = useCalendarSync();

  const currentStepIndex = STEPS.indexOf(step);

  const goToStep = (newStep: BookingStep) => {
    const newIndex = STEPS.indexOf(newStep);
    setDirection(newIndex > currentStepIndex ? 1 : -1);
    setStep(newStep);
  };

  // Fetch services
  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['booking-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });
      return data || [];
    },
  });

  // Fetch providers
  const { data: providers, isLoading: loadingProviders } = useQuery({
    queryKey: ['booking-providers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .in('role', ['provider', 'admin']);
      return data || [];
    },
    enabled: step === 'provider' || step === 'datetime' || step === 'confirm',
  });

  // Fetch existing appointments for availability check
  const { data: existingAppointments } = useQuery({
    queryKey: ['existing-appointments', selectedProvider?.id, selectedDate],
    queryFn: async () => {
      if (!selectedProvider?.id || !selectedDate) return [];
      const dayStart = startOfDay(selectedDate);
      const dayEnd = addDays(dayStart, 1);
      const { data } = await supabase
        .from('appointments')
        .select('scheduled_at, duration_minutes')
        .eq('staff_id', selectedProvider.id)
        .gte('scheduled_at', dayStart.toISOString())
        .lt('scheduled_at', dayEnd.toISOString())
        .not('status', 'in', '("cancelled","no_show")');
      return data || [];
    },
    enabled: !!selectedProvider?.id && !!selectedDate,
  });

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async () => {
      if (!client?.id || !selectedService || !selectedProvider || !selectedDate || !selectedTime) {
        throw new Error('Missing required booking information');
      }
      const scheduledAt = setMinutes(setHours(selectedDate, selectedTime.hour), selectedTime.minute);
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_id: client.id,
          service_id: selectedService.id,
          staff_id: selectedProvider.id,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: selectedService.duration_minutes,
          total_amount: selectedService.price,
          status: 'scheduled',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.id) syncAppointment(data.id);
      setShowCelebration(true);
      toast({ title: 'Appointment Booked! 🎉', description: 'We look forward to seeing you.' });
      queryClient.invalidateQueries({ queryKey: ['client-next-appointment'] });
      queryClient.invalidateQueries({ queryKey: ['client-history'] });
      setTimeout(() => navigate('/portal'), 2500);
    },
    onError: () => {
      toast({ title: 'Booking Failed', description: 'Please try again or contact us.', variant: 'destructive' });
    },
  });

  const isSlotAvailable = (slot: { hour: number; minute: number }) => {
    if (!selectedDate || !selectedService || !selectedProvider) return false;
    const slotTime = setMinutes(setHours(selectedDate, slot.hour), slot.minute);
    const serviceDuration = selectedService.duration_minutes + (selectedService.recovery_buffer_minutes || 0);
    const slotEnd = new Date(slotTime.getTime() + serviceDuration * 60000);
    if (isBefore(slotTime, new Date())) return false;
    const staffBusy = existingAppointments?.some(apt => {
      const aptStart = new Date(apt.scheduled_at);
      const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000);
      return (
        (isAfter(slotTime, aptStart) && isBefore(slotTime, aptEnd)) ||
        (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
        (isBefore(slotTime, aptStart) && isAfter(slotEnd, aptEnd)) ||
        slotTime.getTime() === aptStart.getTime()
      );
    });
    if (staffBusy) return false;
    return isSlotAvailableForBooking(selectedService.id, selectedProvider.id, slot);
  };

  const getMachineForService = (serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    if (!service?.machine_type_id) return null;
    return machines?.find(m => m.id === service.machine_type_id);
  };

  const servicesByCategory = services?.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  // Selection summary chip
  const SelectionSummary = () => {
    if (!selectedService && currentStepIndex < 1) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2 mb-4"
      >
        {selectedService && (
          <Badge variant="secondary" className="gap-1 px-3 py-1.5 text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            {selectedService.name}
          </Badge>
        )}
        {selectedProvider && currentStepIndex >= 2 && (
          <Badge variant="secondary" className="gap-1 px-3 py-1.5 text-xs font-medium">
            <User className="h-3 w-3" />
            {selectedProvider.first_name} {selectedProvider.last_name}
          </Badge>
        )}
        {selectedDate && selectedTime && currentStepIndex >= 3 && (
          <Badge variant="secondary" className="gap-1 px-3 py-1.5 text-xs font-medium">
            <CalendarIcon className="h-3 w-3" />
            {format(selectedDate, 'MMM d')} · {format(setMinutes(setHours(new Date(), selectedTime.hour), selectedTime.minute), 'h:mm a')}
          </Badge>
        )}
      </motion.div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 'service':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-heading font-semibold text-foreground">Choose Your Treatment</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Select the treatment that's right for you</p>
            </div>
            {loadingServices ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              Object.entries(servicesByCategory || {}).map(([category, categoryServices]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{category}</h3>
                  <div className="space-y-2">
                    {categoryServices?.map((service: any) => {
                      const isSelected = selectedService?.id === service.id;
                      return (
                        <button
                          key={service.id}
                          onClick={() => { setSelectedService(service); goToStep('provider'); }}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all group",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1 min-w-0">
                              <p className="font-medium text-foreground">{service.name}</p>
                              {service.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{service.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {service.duration_minutes} min
                                </span>
                                {getMachineForService(service.id) && (
                                  <span className="flex items-center gap-1 text-primary/70">
                                    <Cpu className="h-3 w-3" />
                                    {getMachineForService(service.id)?.machine_type}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-lg font-semibold text-primary">${service.price}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'provider':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-heading font-semibold text-foreground">Choose Your Provider</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Select who you'd like to see</p>
            </div>
            {loadingProviders ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {providers?.map((provider: any) => {
                  const isSelected = selectedProvider?.id === provider.id;
                  const initials = `${provider.first_name?.[0] || ''}${provider.last_name?.[0] || ''}`;
                  return (
                    <button
                      key={provider.id}
                      onClick={() => { setSelectedProvider(provider); goToStep('datetime'); }}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                      )}
                    >
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">{initials}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{provider.first_name} {provider.last_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{provider.role === 'admin' ? 'Lead Provider' : 'Provider'}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'datetime':
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-heading font-semibold text-foreground">Pick Date & Time</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Choose your preferred session time</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Date</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) =>
                      isBefore(date, startOfDay(new Date())) || date.getDay() === 0
                    }
                    className={cn("p-3 pointer-events-auto")}
                  />
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Time</CardTitle>
                  {selectedService?.machine_type_id && getMachineForService(selectedService.id) && (
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Cpu className="h-3 w-3" />
                      Requires {getMachineForService(selectedService.id)?.machine_type}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="px-4">
                  {selectedDate ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {TIME_SLOTS.map((slot) => {
                          const available = isSlotAvailable(slot);
                          const isSelected = selectedTime?.hour === slot.hour && selectedTime?.minute === slot.minute;
                          return (
                            <Button
                              key={`${slot.hour}-${slot.minute}`}
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              disabled={!available}
                              onClick={() => setSelectedTime(slot)}
                              className={cn(
                                "text-xs",
                                !available && 'opacity-40 line-through',
                                isSelected && 'ring-2 ring-primary/30'
                              )}
                            >
                              {format(setMinutes(setHours(new Date(), slot.hour), slot.minute), 'h:mm a')}
                            </Button>
                          );
                        })}
                      </div>
                      {TIME_SLOTS.every(slot => !isSlotAvailable(slot)) && (
                        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <p className="text-xs text-destructive">
                            No slots available on this date. Try a different day.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <CalendarIcon className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">Select a date first</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {selectedDate && selectedTime && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Button className="w-full" size="lg" onClick={() => goToStep('confirm')}>
                  Continue to Confirm
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            )}
          </div>
        );

      case 'confirm': {
        const appointmentDateTime = selectedDate && selectedTime
          ? setMinutes(setHours(selectedDate, selectedTime.hour), selectedTime.minute)
          : null;

        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Review & Confirm</h2>
              <p className="text-sm text-muted-foreground mt-1">Double-check your appointment details</p>
            </div>

            <Card className="border-border overflow-hidden">
              {/* Accent bar */}
              <div className="h-1 bg-gradient-to-r from-primary to-primary/60" />
              <CardContent className="p-5 space-y-0 divide-y divide-border">
                {[
                  { label: 'Service', value: selectedService?.name, icon: Sparkles },
                  { label: 'Provider', value: `${selectedProvider?.first_name} ${selectedProvider?.last_name}`, icon: User },
                  { label: 'Date', value: appointmentDateTime ? format(appointmentDateTime, 'EEEE, MMMM d, yyyy') : '', icon: CalendarIcon },
                  { label: 'Time', value: appointmentDateTime ? format(appointmentDateTime, 'h:mm a') : '', icon: Clock },
                  { label: 'Duration', value: `${selectedService?.duration_minutes} minutes`, icon: Clock },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <row.icon className="h-3.5 w-3.5" />
                      {row.label}
                    </span>
                    <span className="text-sm font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5" />
                    Total
                  </span>
                  <span className="text-xl font-bold text-primary">${selectedService?.price}</span>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={() => createAppointment.mutate()}
              disabled={createAppointment.isPending}
            >
              {createAppointment.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        );
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <CelebrationOverlay show={showCelebration} onComplete={() => setShowCelebration(false)} />

      {/* Stepper */}
      <div className="flex items-center justify-between mb-6 px-2">
        {STEPS.map((s, index) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{
                  scale: step === s ? 1.1 : 1,
                  backgroundColor: currentStepIndex > index
                    ? 'hsl(var(--primary))'
                    : step === s
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--muted))',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{
                  color: currentStepIndex >= index ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                }}
              >
                {currentStepIndex > index ? <Check className="h-4 w-4" /> : index + 1}
              </motion.div>
              <span className={cn(
                "text-[10px] hidden sm:block transition-colors",
                currentStepIndex >= index ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>
                {STEP_LABELS[index]}
              </span>
            </div>
            {index < 3 && (
              <div className="flex-1 h-0.5 mx-1.5 rounded-full overflow-hidden bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: currentStepIndex > index ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Back button */}
      {currentStepIndex > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToStep(STEPS[currentStepIndex - 1])}
          className="mb-3 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}

      {/* Selection summary */}
      <SelectionSummary />

      {/* Animated step content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
