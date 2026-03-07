import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle2, Clock, User, Sparkles, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import elitaLogo from '@/assets/elita-logo.png';

interface KioskAppointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  client_name: string;
  service_name: string;
  staff_name: string;
}

export default function CheckInKioskPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<KioskAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState<string | null>(null);

  useEffect(() => {
    fetchTodayAppointments();
    const interval = setInterval(fetchTodayAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodayAppointments = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, scheduled_at, duration_minutes, status,
        clients (first_name, last_name),
        services (name),
        staff (first_name, last_name)
      `)
      .gte('scheduled_at', today.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_at', { ascending: true });

    if (!error && data) {
      setAppointments(data.map((apt: any) => ({
        id: apt.id,
        scheduled_at: apt.scheduled_at,
        duration_minutes: apt.duration_minutes,
        status: apt.status,
        client_name: apt.clients
          ? `${apt.clients.first_name} ${apt.clients.last_name}`
          : 'Walk-in',
        service_name: apt.services?.name || 'Service',
        staff_name: apt.staff
          ? `${apt.staff.first_name} ${apt.staff.last_name}`
          : 'Any Provider',
      })));
    }
    setLoading(false);
  };

  const handleCheckIn = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (error) {
      toast.error('Check-in failed. Please see the front desk.');
      return;
    }

    setCheckedIn(appointmentId);
    toast.success('Successfully checked in!');

    // Reset after 5 seconds
    setTimeout(() => {
      setCheckedIn(null);
      setSearchQuery('');
      fetchTodayAppointments();
    }, 5000);
  };

  const filteredAppointments = appointments.filter(apt => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return apt.client_name.toLowerCase().includes(q);
  });

  // Success screen after check-in
  if (checkedIn) {
    const apt = appointments.find(a => a.id === checkedIn);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground">You're Checked In!</h1>
          <p className="text-lg text-muted-foreground">
            Welcome, {apt?.client_name}. Please have a seat — your provider will be with you shortly.
          </p>
          <div className="p-4 rounded-xl bg-muted text-sm">
            <p className="font-medium">{apt?.service_name}</p>
            <p className="text-muted-foreground">with {apt?.staff_name}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      {/* Header */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Exit Kiosk</span>
          </Link>
          <img src={elitaLogo} alt="Logo" className="h-10 object-contain" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome!</h1>
          <p className="text-lg text-muted-foreground">
            Find your name below to check in for your appointment
          </p>
        </motion.div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search your name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-12 h-14 text-lg rounded-xl"
            autoFocus
          />
        </div>

        {/* Appointments List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredAppointments.map((apt, i) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground">{apt.client_name}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(apt.scheduled_at), 'h:mm a')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          {apt.service_name}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="gap-2 px-6 text-base"
                      onClick={() => handleCheckIn(apt.id)}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Check In
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {!loading && filteredAppointments.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">No matching appointments found</p>
              <p className="text-sm mt-1">Please check with the front desk for assistance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
