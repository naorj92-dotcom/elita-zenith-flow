import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, Sparkles, ArrowRight, Clock, ChevronRight, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { GOALS, CATEGORIES, getSimpleRecommendation, type ClientGoal, type ProgressData, type TreatmentCategory } from '@/lib/elitaMethod';
import { cn } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export function ClientDashboard() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();

  // ── Client Goals ──
  const { data: clientGoals = [] } = useQuery({
    queryKey: ['client-goals', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('client_goals')
        .select('goal, is_active')
        .eq('client_id', client.id)
        .eq('is_active', true);
      return (data || []).map((g: any) => g.goal as ClientGoal);
    },
    enabled: !!client?.id,
  });

  // ── Treatment Progress ──
  const { data: treatmentProgress = [] } = useQuery({
    queryKey: ['client-treatment-progress', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('client_treatment_progress')
        .select('category, sessions_completed, sessions_target')
        .eq('client_id', client.id);
      return (data || []) as ProgressData[];
    },
    enabled: !!client?.id,
  });

  // ── Save Goal ──
  const saveGoalMutation = useMutation({
    mutationFn: async (goal: ClientGoal) => {
      if (!client?.id) throw new Error('No client');
      const { error } = await supabase
        .from('client_goals')
        .upsert({ client_id: client.id, goal, is_active: true }, { onConflict: 'client_id,goal' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-goals', client?.id] });
    },
  });

  // ── Next Appointment ──
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

  // ── Active Packages ──
  const { data: activePackages = [] } = useQuery({
    queryKey: ['client-active-packages', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('client_packages')
        .select('id, sessions_used, sessions_total, packages(name)')
        .eq('client_id', client.id)
        .eq('status', 'active')
        .limit(3);
      return data || [];
    },
    enabled: !!client?.id,
  });

  // ── Completed Sessions ──
  const { data: completedSessions = [] } = useQuery({
    queryKey: ['client-completed-recent', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('appointments')
        .select('id, completed_at, services(name), staff(first_name)')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!client?.id,
  });

  const firstName = client?.first_name || 'there';
  const hasGoals = clientGoals.length > 0;
  const recommendation = hasGoals ? getSimpleRecommendation(clientGoals, treatmentProgress) : null;

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

      {/* ── Goal Selection (if no goals set) ── */}
      {!hasGoals && (
        <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            What's Your Goal?
          </h2>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-4">
                Select your primary goal and we'll create a personalized treatment plan for you.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {GOALS.map((goal) => (
                  <button
                    key={goal.key}
                    onClick={() => saveGoalMutation.mutate(goal.key)}
                    disabled={saveGoalMutation.isPending}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-border hover:border-primary/40 hover:bg-accent/30 transition-all text-left group"
                  >
                    <span className="text-2xl">{goal.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{goal.label}</p>
                      <p className="text-xs text-muted-foreground">{goal.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Elita Method Recommendation ── */}
      {recommendation && (
        <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Your Treatment Plan
          </h2>
          <Card className="border-primary/15 bg-accent/20 overflow-hidden">
            <CardContent className="p-5">
              {/* Current focus */}
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Focus: {GOALS.find(g => g.key === clientGoals[0])?.label}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-3xl">{CATEGORIES[recommendation.category].emoji}</span>
                <div className="flex-1">
                  <p className="text-lg font-heading font-semibold text-foreground">
                    {recommendation.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {recommendation.subtitle}
                  </p>
                  <Button asChild size="sm" className="mt-3 gap-1.5">
                    <Link to="/portal/book">
                      Book Recommended Treatment <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Progress bars */}
              {treatmentProgress.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  {treatmentProgress.map((p) => {
                    const cat = CATEGORIES[p.category as TreatmentCategory];
                    const pct = p.sessions_target > 0 ? Math.round((p.sessions_completed / p.sessions_target) * 100) : 0;
                    return (
                      <div key={p.category} className="flex items-center gap-3">
                        <span className="text-sm">{cat?.emoji}</span>
                        <span className="text-xs font-medium text-foreground w-12">{cat?.label}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground w-8 text-right">{p.sessions_completed}/{p.sessions_target}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Next Transformation Session ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.12 }}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Your Next Transformation Session
        </h2>
        {nextAppointment ? (
          <Card>
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
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">No upcoming sessions scheduled</p>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* ── My Progress (packages) ── */}
      {activePackages.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.16 }}>
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
                      <span className="text-xs font-semibold text-primary">{pkg.sessions_used}/{pkg.sessions_total}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{pkg.sessions_total - pkg.sessions_used} sessions remaining</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Quick Actions ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Messages', href: '/portal/messages', icon: '💬' },
            { label: 'My Photos', href: '/portal/photos', icon: '📸' },
            { label: 'Forms', href: '/portal/forms', icon: '📋' },
            { label: 'Skin Analysis', href: '/portal/skin-analysis', icon: '✨' },
          ].map((item) => (
            <Link key={item.href} to={item.href} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Recent Sessions ── */}
      {completedSessions.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent Sessions</h2>
            <Link to="/portal/history" className="text-xs text-primary font-medium flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <Card>
            <CardContent className="p-4 space-y-1">
              {completedSessions.map((apt: any) => (
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
