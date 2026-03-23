import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, Sparkles, ArrowRight, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export function ClientDashboard() {
  const { client } = useClientAuth();

  // Next upcoming appointment
  const { data: nextAppointment } = useQuery({
    queryKey: ['client-next-apt', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data } = await supabase
        .from('appointments')
        .select('id, scheduled_at, duration_minutes, status, services(name), staff(first_name, last_name)')
        .eq('client_id', client.id)
        .gte('scheduled_at', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_at', { ascending: true })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!client?.id,
  });

  // Active packages for progress tracking
  const { data: activePackages = [] } = useQuery({
    queryKey: ['client-active-packages', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('client_packages')
        .select('id, sessions_used, sessions_total, status, packages(name)')
        .eq('client_id', client.id)
        .eq('status', 'active')
        .limit(3);
      return data || [];
    },
    enabled: !!client?.id,
  });

  // Completed sessions for recommendation
  const { data: completedSessions = [] } = useQuery({
    queryKey: ['client-completed-sessions', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('appointments')
        .select('id, scheduled_at, completed_at, services(name), staff(first_name)')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!client?.id,
  });

  const lastService = completedSessions[0]?.services?.name;
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
    <div className="space-y-6 max-w-xl mx-auto pb-12 px-1">
      {/* Hero */}
      <motion.div {...fadeUp} className="text-center pt-6 pb-1">
        <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground tracking-tight">
          Your Elita Journey
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Personalized treatments designed for your results, {firstName}.
        </p>
      </motion.div>

      {/* Primary CTA */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <Button asChild size="lg" className="w-full h-14 text-base font-semibold gap-2.5 rounded-xl shadow-lg">
          <Link to="/portal/book">
            <CalendarPlus className="h-5 w-5" />
            Book Your Next Session
          </Link>
        </Button>
      </motion.div>

      {/* ── SECTION 1: Your Next Transformation Session ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Your Next Transformation Session
        </h2>
        {nextAppointment ? (
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-foreground text-lg leading-tight">
                    {(nextAppointment as any).services?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date((nextAppointment as any).scheduled_at), 'EEEE, MMMM d · h:mm a')}
                  </p>
                  {(nextAppointment as any).staff && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      with {(nextAppointment as any).staff.first_name} {(nextAppointment as any).staff.last_name}
                    </p>
                  )}
                </div>
              </div>
              <Link
                to="/portal/history"
                className="text-xs text-primary font-medium flex items-center gap-1 mt-4"
              >
                View appointment details <ChevronRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">No upcoming sessions scheduled</p>
              <Button asChild variant="outline" size="sm" className="mt-3 gap-1.5">
                <Link to="/portal/book">
                  Schedule Now <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* ── SECTION 2: My Progress ── */}
      {activePackages.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            My Progress
          </h2>
          <div className="space-y-3">
            {activePackages.map((pkg: any) => {
              const pct = pkg.sessions_total > 0 ? Math.round((pkg.sessions_used / pkg.sessions_total) * 100) : 0;
              return (
                <Card key={pkg.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-foreground text-sm">{pkg.packages?.name || 'Treatment Package'}</p>
                      <span className="text-xs font-semibold text-primary">
                        {pkg.sessions_used} of {pkg.sessions_total} sessions
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {pkg.sessions_total - pkg.sessions_used} sessions remaining
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── SECTION 3: Recommendations ── */}
      {recommendedTreatment && (
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Recommended For You
          </h2>
          <Card className="border-primary/15 bg-accent/20">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-heading font-semibold text-foreground">
                    {recommendedTreatment}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on your last session ({lastService}), we recommend this as your next step.
                  </p>
                  <Button asChild size="sm" className="mt-3 gap-1.5">
                    <Link to="/portal/book">
                      Book Next Session <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── SECTION 4: Quick Actions (secondary) ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Messages', href: '/portal/messages', icon: '💬' },
            { label: 'My Photos', href: '/portal/photos', icon: '📸' },
            { label: 'Forms', href: '/portal/forms', icon: '📋' },
            { label: 'Skin Analysis', href: '/portal/skin-analysis', icon: '✨' },
          ].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Completed Sessions */}
      {completedSessions.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Sessions
            </h2>
            <Link to="/portal/history" className="text-xs text-primary font-medium flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <Card>
            <CardContent className="p-4 space-y-1">
              {completedSessions.slice(0, 3).map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{apt.services?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {apt.completed_at ? format(new Date(apt.completed_at), 'MMM d, yyyy') : 'Completed'}
                      {apt.staff && ` · ${apt.staff.first_name}`}
                    </p>
                  </div>
                  <span className="text-xs text-success font-medium">✓ Done</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
