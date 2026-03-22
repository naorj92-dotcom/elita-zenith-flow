import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, ChevronRight, Clock, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

import { AppointmentCountdownWidget } from '@/components/portal/AppointmentCountdownWidget';
import { LoyaltyPointsWidget } from '@/components/portal/LoyaltyPointsWidget';
import { MembershipStatusWidget } from '@/components/portal/MembershipStatusWidget';
import { ExclusiveDealsWidget } from '@/components/portal/ExclusiveDealsWidget';
import { AftercareTipsWidget } from '@/components/portal/AftercareTipsWidget';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export function ClientDashboard() {
  const { client } = useClientAuth();

  // Upcoming appointments
  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ['client-upcoming-apts', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('appointments')
        .select('id, scheduled_at, duration_minutes, status, services(name), staff(first_name, last_name)')
        .eq('client_id', client.id)
        .gte('scheduled_at', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_at', { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: !!client?.id,
  });

  // Completed sessions
  const { data: completedSessions = [] } = useQuery({
    queryKey: ['client-completed-sessions', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('appointments')
        .select('id, scheduled_at, completed_at, services(name), staff(first_name, last_name)')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!client?.id,
  });

  // Last completed for recommendation
  const lastService = completedSessions[0]?.services?.name;

  // Simple recommendation map
  const recommendationMap: Record<string, string> = {
    'Hydrafacial': 'Chemical Peel',
    'Chemical Peel': 'Microneedling',
    'Microneedling': 'PRP Facial',
    'PRP Facial': 'Skin Tightening',
    'Botox': 'Dermal Fillers',
    'Dermal Fillers': 'Skin Tightening',
    'Laser Hair Removal': 'Skin Rejuvenation',
  };
  const recommendedTreatment = lastService ? (recommendationMap[lastService] || 'Skin Tightening') : null;

  const firstName = client?.first_name || 'there';

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Hero Welcome */}
      <motion.div {...fadeUp} className="text-center pt-4 pb-2">
        <p className="text-sm text-muted-foreground tracking-wide uppercase">Welcome to</p>
        <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mt-1">
          Your Elita Journey
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Hello, {firstName}. Here's what's next for you.
        </p>
      </motion.div>

      {/* Primary CTA */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <Button asChild size="lg" className="w-full h-14 text-base font-semibold gap-2 rounded-xl">
          <Link to="/portal/book">
            <CalendarPlus className="h-5 w-5" />
            Book Appointment
          </Link>
        </Button>
      </motion.div>

      {/* Next Appointment */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <AppointmentCountdownWidget />
      </motion.div>

      {/* Recommendation Card */}
      {recommendedTreatment && (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <Card className="border-dashed border-2 border-primary/20 bg-accent/30">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Recommended for You</p>
                  <p className="text-lg font-heading font-semibold text-foreground mt-1">
                    {recommendedTreatment}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on your last session ({lastService}), we recommend this as your next step.
                  </p>
                  <Button asChild size="sm" className="mt-3 gap-1.5">
                    <Link to="/portal/book">
                      Book Next Session
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* My Journey Section */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-heading font-semibold text-foreground">My Journey</h2>
        </div>

        <div className="space-y-3">
          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-2">
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No upcoming appointments</p>
              ) : (
                upcomingAppointments.map((apt: any) => (
                  <div key={apt.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{apt.services?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(apt.scheduled_at), 'MMM d, yyyy · h:mm a')}
                        {apt.staff && ` · ${apt.staff.first_name} ${apt.staff.last_name}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
              {upcomingAppointments.length > 0 && (
                <Link to="/portal/history" className="text-xs text-primary font-medium flex items-center gap-1 pt-1">
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Completed */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Completed Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-2">
              {completedSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No completed sessions yet</p>
              ) : (
                completedSessions.slice(0, 3).map((apt: any) => (
                  <div key={apt.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{apt.services?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {apt.completed_at ? format(new Date(apt.completed_at), 'MMM d, yyyy') : 'Completed'}
                        {apt.staff && ` · ${apt.staff.first_name}`}
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-success/40" />
                  </div>
                ))
              )}
              {completedSessions.length > 3 && (
                <Link to="/portal/history" className="text-xs text-primary font-medium flex items-center gap-1 pt-1">
                  View all {completedSessions.length} sessions <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Quick Links */}
      <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="grid grid-cols-2 gap-3">
        {[
          { label: 'Messages', href: '/portal/messages', icon: '💬' },
          { label: 'My Photos', href: '/portal/photos', icon: '📸' },
          { label: 'Forms', href: '/portal/forms', icon: '📋' },
          { label: 'Skin AI', href: '/portal/skin-analysis', icon: '✨' },
        ].map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-premium-md transition-all"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm font-medium text-foreground">{item.label}</span>
          </Link>
        ))}
      </motion.div>

      {/* Membership + Loyalty */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="grid gap-3 md:grid-cols-2">
        <MembershipStatusWidget />
        <LoyaltyPointsWidget />
      </motion.div>

      {/* Deals & Aftercare */}
      <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
        <ExclusiveDealsWidget />
      </motion.div>
      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <AftercareTipsWidget />
      </motion.div>
    </div>
  );
}
