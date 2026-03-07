import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, RefreshCw } from 'lucide-react';
import { format, differenceInDays, differenceInHours, differenceInMinutes, isValid } from 'date-fns';
import { Link } from 'react-router-dom';

export function AppointmentCountdownWidget() {
  const { client } = useClientAuth();

  const { data: nextAppointment } = useQuery({
    queryKey: ['client-next-appointment-countdown', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data } = await supabase
        .from('appointments')
        .select('*, services(name, duration_minutes), staff(first_name, last_name)')
        .eq('client_id', client.id)
        .gte('scheduled_at', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!client?.id,
    refetchInterval: 60000, // Update every minute
  });

  // Get last completed appointment for "Book Again"
  const { data: lastCompleted } = useQuery({
    queryKey: ['client-last-treatment', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data } = await supabase
        .from('appointments')
        .select('*, services(name)')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!client?.id,
  });

  if (!nextAppointment) {
    return (
      <Card className="card-luxury overflow-hidden">
        <CardContent className="p-6 text-center space-y-3">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-heading font-semibold">No Upcoming Appointment</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {lastCompleted 
                ? `Your last treatment was ${lastCompleted.services?.name}. Ready to book again?`
                : "Ready to start your wellness journey?"
              }
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button asChild>
              <Link to="/portal/book">Book Now</Link>
            </Button>
            {lastCompleted && (
              <Button variant="outline" asChild>
                <Link to="/portal/book">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Book {lastCompleted.services?.name} Again
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const scheduledDate = new Date(nextAppointment.scheduled_at);
  if (!isValid(scheduledDate)) return null;

  const now = new Date();
  const days = differenceInDays(scheduledDate, now);
  const hours = differenceInHours(scheduledDate, now) % 24;
  const minutes = differenceInMinutes(scheduledDate, now) % 60;

  return (
    <Card className="card-luxury overflow-hidden border-primary/30">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
        <p className="text-xs font-medium text-primary uppercase tracking-wider">Your Next Appointment</p>
        <h3 className="font-heading font-semibold text-lg mt-1">{nextAppointment.services?.name}</h3>
      </div>
      <CardContent className="p-4 space-y-4">
        {/* Countdown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="text-2xl font-heading font-bold text-primary">{Math.max(0, days)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Days</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="text-2xl font-heading font-bold text-primary">{Math.max(0, hours)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Hours</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="text-2xl font-heading font-bold text-primary">{Math.max(0, minutes)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Minutes</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(scheduledDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(scheduledDate, 'h:mm a')} · {nextAppointment.services?.duration_minutes} min</span>
          </div>
          {nextAppointment.staff && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>with {nextAppointment.staff.first_name} {nextAppointment.staff.last_name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
