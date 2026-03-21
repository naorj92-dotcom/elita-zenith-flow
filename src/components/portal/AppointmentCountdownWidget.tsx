import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, RefreshCw, ArrowRight } from 'lucide-react';
import { format, differenceInDays, differenceInHours, differenceInMinutes, isValid } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="p-3 bg-secondary/60 rounded-xl text-center"
    >
      <motion.p
        key={value}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-2xl font-heading font-bold text-primary tabular-nums"
      >
        {Math.max(0, value)}
      </motion.p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">{label}</p>
    </motion.div>
  );
}

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
    refetchInterval: 60000,
  });

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
      <Card className="overflow-hidden border-dashed border-2 border-primary/20">
        <CardContent className="p-6 text-center space-y-4">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Calendar className="h-10 w-10 text-primary/40 mx-auto" />
          </motion.div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">No Upcoming Appointment</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
              {lastCompleted
                ? `Your last treatment was ${lastCompleted.services?.name}. Ready to book again?`
                : "Ready to start your wellness journey?"
              }
            </p>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button asChild size="default">
              <Link to="/portal/book">
                Book Now
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            {lastCompleted && (
              <Button variant="outline" asChild size="default">
                <Link to="/portal/book">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Rebook {lastCompleted.services?.name}
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

  const isToday = days === 0;
  const isTomorrow = days === 1;

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isToday ? "border-primary/40 shadow-md shadow-primary/5" : "border-primary/25"
    )}>
      <div className={cn(
        "px-4 py-3 flex items-center justify-between",
        isToday 
          ? "bg-gradient-to-r from-primary/15 to-primary/5" 
          : "bg-gradient-to-r from-primary/10 to-transparent"
      )}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
            {isToday ? '🔥 Today' : isTomorrow ? 'Tomorrow' : 'Upcoming'}
          </p>
          <h3 className="font-heading font-semibold text-base mt-0.5 text-foreground">{nextAppointment.services?.name}</h3>
        </div>
        {isToday && (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase"
          >
            Today!
          </motion.div>
        )}
      </div>
      <CardContent className="p-4 space-y-3.5">
        <div className="grid grid-cols-3 gap-2">
          <CountdownUnit value={days} label="Days" />
          <CountdownUnit value={hours} label="Hours" />
          <CountdownUnit value={minutes} label="Min" />
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{format(scheduledDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{format(scheduledDate, 'h:mm a')} · {nextAppointment.services?.duration_minutes} min</span>
          </div>
          {nextAppointment.staff && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>with {nextAppointment.staff.first_name} {nextAppointment.staff.last_name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
