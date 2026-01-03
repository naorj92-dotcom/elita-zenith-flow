import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, setHours, setMinutes, isBefore, isAfter, startOfDay } from 'date-fns';
import { CalendarIcon, Clock, User, Check, ArrowLeft, ArrowRight, Loader2, Cpu, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useMachineAvailability } from '@/hooks/useMachineAvailability';

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

export function ClientBookingPage() {
  const { client } = useClientAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<BookingStep>('service');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<{ hour: number; minute: number } | null>(null);

  // Machine availability hook
  const { isSlotAvailableForBooking, machines } = useMachineAvailability(selectedDate);
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
    enabled: step === 'provider',
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
    onSuccess: () => {
      toast({
        title: 'Appointment Booked!',
        description: 'We look forward to seeing you.',
      });
      queryClient.invalidateQueries({ queryKey: ['client-next-appointment'] });
      queryClient.invalidateQueries({ queryKey: ['client-history'] });
      navigate('/portal');
    },
    onError: (error) => {
      toast({
        title: 'Booking Failed',
        description: 'Please try again or contact us.',
        variant: 'destructive',
      });
    },
  });

  // Check if a time slot is available (staff + machine)
  const isSlotAvailable = (slot: { hour: number; minute: number }) => {
    if (!selectedDate || !selectedService || !selectedProvider) return false;
    
    const slotTime = setMinutes(setHours(selectedDate, slot.hour), slot.minute);
    const serviceDuration = selectedService.duration_minutes + (selectedService.recovery_buffer_minutes || 0);
    const slotEnd = new Date(slotTime.getTime() + serviceDuration * 60000);
    
    // Can't book in the past
    if (isBefore(slotTime, new Date())) return false;

    // Check staff availability against existing appointments
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

    // Check machine availability using the hook
    return isSlotAvailableForBooking(selectedService.id, selectedProvider.id, slot);
  };

  // Get machine name for a service
  const getMachineForService = (serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    if (!service?.machine_type_id) return null;
    return machines?.find(m => m.id === service.machine_type_id);
  };

  // Group services by category
  const servicesByCategory = services?.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  const renderStep = () => {
    switch (step) {
      case 'service':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-heading font-semibold">Select a Service</h2>
              <p className="text-muted-foreground">Choose the treatment you'd like to book</p>
            </div>
            
            {loadingServices ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              Object.entries(servicesByCategory || {}).map(([category, categoryServices]) => (
                <div key={category}>
                  <h3 className="text-lg font-medium mb-3">{category}</h3>
                  <div className="grid gap-3">
                    {categoryServices?.map((service: any) => (
                      <Card 
                        key={service.id} 
                        className={`card-luxury cursor-pointer transition-all ${
                          selectedService?.id === service.id 
                            ? 'ring-2 ring-primary' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedService(service);
                          setStep('provider');
                        }}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{service.name}</h4>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {service.duration_minutes} min
                                {service.recovery_buffer_minutes > 0 && (
                                  <span className="text-muted-foreground">(+{service.recovery_buffer_minutes} buffer)</span>
                                )}
                              </span>
                              {getMachineForService(service.id) && (
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                                  <Cpu className="h-3 w-3 mr-1" />
                                  {getMachineForService(service.id)?.machine_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-primary">${service.price}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'provider':
        return (
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => setStep('service')} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Button>
            
            <div>
              <h2 className="text-2xl font-heading font-semibold">Choose Provider</h2>
              <p className="text-muted-foreground">Select your preferred provider</p>
            </div>
            
            <Card className="card-luxury p-4 bg-secondary/50">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{selectedService?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedService?.duration_minutes} min · ${selectedService?.price}
                  </p>
                </div>
              </div>
            </Card>

            {loadingProviders ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-3">
                {providers?.map((provider: any) => (
                  <Card 
                    key={provider.id}
                    className={`card-luxury cursor-pointer transition-all ${
                      selectedProvider?.id === provider.id 
                        ? 'ring-2 ring-primary' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setSelectedProvider(provider);
                      setStep('datetime');
                    }}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{provider.first_name} {provider.last_name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{provider.role}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'datetime':
        return (
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => setStep('provider')} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Providers
            </Button>

            <div>
              <h2 className="text-2xl font-heading font-semibold">Pick Date & Time</h2>
              <p className="text-muted-foreground">Choose your preferred appointment slot</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="card-luxury">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Select Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => 
                      isBefore(date, startOfDay(new Date())) || 
                      date.getDay() === 0
                    }
                    className="rounded-md"
                  />
                </CardContent>
              </Card>

              <Card className="card-luxury">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Select Time</CardTitle>
                  {selectedService?.machine_type_id && getMachineForService(selectedService.id) && (
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Cpu className="h-3 w-3" />
                      Requires {getMachineForService(selectedService.id)?.machine_type} machine
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
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
                              disabled={!available}
                              onClick={() => setSelectedTime(slot)}
                              className={!available ? 'opacity-50' : ''}
                            >
                              {format(setMinutes(setHours(new Date(), slot.hour), slot.minute), 'h:mm a')}
                            </Button>
                          );
                        })}
                      </div>
                      {TIME_SLOTS.every(slot => !isSlotAvailable(slot)) && (
                        <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                          <p className="text-sm text-warning">
                            No available slots for this date. All machines or providers may be fully booked.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Please select a date first
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {selectedDate && selectedTime && (
              <Button className="w-full" onClick={() => setStep('confirm')}>
                Continue to Confirm
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        );

      case 'confirm':
        const appointmentDateTime = selectedDate && selectedTime 
          ? setMinutes(setHours(selectedDate, selectedTime.hour), selectedTime.minute)
          : null;

        return (
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => setStep('datetime')} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Date & Time
            </Button>

            <div>
              <h2 className="text-2xl font-heading font-semibold">Confirm Booking</h2>
              <p className="text-muted-foreground">Review your appointment details</p>
            </div>

            <Card className="card-luxury">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium">
                    {selectedProvider?.first_name} {selectedProvider?.last_name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {appointmentDateTime && format(appointmentDateTime, 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {appointmentDateTime && format(appointmentDateTime, 'h:mm a')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{selectedService?.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl font-semibold text-primary">${selectedService?.price}</span>
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
                'Confirm Booking'
              )}
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {(['service', 'provider', 'datetime', 'confirm'] as BookingStep[]).map((s, index) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s 
                  ? 'bg-primary text-primary-foreground' 
                  : (['service', 'provider', 'datetime', 'confirm'].indexOf(step) > index)
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {(['service', 'provider', 'datetime', 'confirm'].indexOf(step) > index) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-xs mt-1 capitalize hidden sm:block">{s}</span>
            </div>
            {index < 3 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                (['service', 'provider', 'datetime', 'confirm'].indexOf(step) > index)
                  ? 'bg-success'
                  : 'bg-muted'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {renderStep()}
    </div>
  );
}
