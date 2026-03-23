import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, Sparkles, ArrowRight, Clock, ChevronRight, Target, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { GOALS, CATEGORIES, getSimpleRecommendation, getRecommendations, type ClientGoal, type ProgressData, type TreatmentCategory } from '@/lib/elitaMethod';
import { cn } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
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

  // ── Last completed session (for urgency) ──
  const { data: lastCompleted } = useQuery({
    queryKey: ['client-last-completed', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data } = await supabase
        .from('appointments')
        .select('completed_at, services(name)')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!client?.id,
  });

  const firstName = client?.first_name || 'there';
  const hasGoals = clientGoals.length > 0;
  const recommendation = hasGoals ? getSimpleRecommendation(clientGoals, treatmentProgress) : null;
  const allRecs = hasGoals ? getRecommendations(clientGoals, treatmentProgress) : [];

  // Overall progress percentage
  const totalCompleted = treatmentProgress.reduce((s, p) => s + p.sessions_completed, 0);
  const totalTarget = treatmentProgress.reduce((s, p) => s + p.sessions_target, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  // Urgency: days since last session
  const daysSinceLastSession = lastCompleted?.completed_at
    ? differenceInDays(new Date(), new Date((lastCompleted as any).completed_at))
    : null;

  const getUrgencyMessage = () => {
    if (daysSinceLastSession === null) return null;
    if (daysSinceLastSession <= 7) return { text: 'You\'re on track — great consistency!', tone: 'success' as const };
    if (daysSinceLastSession <= 14) return { text: 'Time to schedule your next session for best results', tone: 'info' as const };
    if (daysSinceLastSession <= 30) return { text: 'Don\'t lose momentum — book your next session soon', tone: 'warning' as const };
    return { text: 'It\'s been a while — let\'s get back on track!', tone: 'warning' as const };
  };
  const urgency = getUrgencyMessage();

  return (
    <div className="space-y-8 max-w-xl mx-auto pb-16 px-2">
      {/* Hero */}
      <motion.div {...fadeUp} className="text-center pt-8 pb-2">
        <h1 className="text-4xl md:text-[2.75rem] font-heading font-semibold text-foreground tracking-tight leading-tight">
          Your Elita Journey
        </h1>
        <p className="text-muted-foreground mt-3 text-base">
          Personalized treatments designed for your results, {firstName}.
        </p>
      </motion.div>

      {/* Primary CTA */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <Button asChild size="lg" className="w-full h-16 text-lg font-semibold gap-3 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
          <Link to="/portal/book">
            <CalendarPlus className="h-5 w-5" />
            Book Your Next Session
          </Link>
        </Button>
      </motion.div>

      {/* ── Goal Selection (if no goals set) ── */}
      {!hasGoals && (
        <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
          <h2 className="text-sm font-heading font-semibold text-foreground mb-4">
            What's Your Goal?
          </h2>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-5">
                Select your primary goal and we'll create a personalized treatment plan.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {GOALS.map((goal) => (
                  <button
                    key={goal.key}
                    onClick={() => saveGoalMutation.mutate(goal.key)}
                    disabled={saveGoalMutation.isPending}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/40 hover:bg-accent/30 hover:shadow-sm transition-all text-left group"
                  >
                    <span className="text-3xl">{goal.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{goal.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── YOUR PERSONALIZED PLAN (visually dominant) ── */}
      {recommendation && (
        <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
          <h2 className="text-sm font-heading font-semibold text-foreground mb-4">
            Your Personalized Plan
          </h2>
          <Card className="border-primary/20 bg-gradient-to-br from-accent/40 to-accent/10 shadow-md overflow-hidden">
            <CardContent className="p-6">
              {/* Focus + Progress % */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Current Focus</p>
                    <p className="text-sm font-semibold text-foreground">{GOALS.find(g => g.key === clientGoals[0])?.label}</p>
                  </div>
                </div>
                {totalTarget > 0 && (
                  <div className="text-right">
                    <p className="text-2xl font-heading font-bold text-primary leading-none">{overallPct}%</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Complete</p>
                  </div>
                )}
              </div>

              {/* Overall progress bar */}
              {totalTarget > 0 && (
                <div className="mb-5">
                  <div className="h-3 bg-muted/80 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${overallPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {totalCompleted} of {totalTarget} total sessions completed
                  </p>
                </div>
              )}

              {/* Urgency message */}
              {urgency && (
                <div className={cn(
                  'flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm',
                  urgency.tone === 'success' && 'bg-success/10 text-success',
                  urgency.tone === 'info' && 'bg-primary/10 text-primary',
                  urgency.tone === 'warning' && 'bg-warning/10 text-warning',
                )}>
                  <Zap className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{urgency.text}</span>
                </div>
              )}

              {/* Next Step */}
              <div className="bg-background/60 rounded-2xl p-4 border border-border/50">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Recommended Next Step</p>
                <div className="flex items-start gap-3">
                  <span className="text-3xl mt-0.5">{CATEGORIES[recommendation.category].emoji}</span>
                  <div className="flex-1">
                    <p className="text-lg font-heading font-semibold text-foreground leading-tight">
                      {recommendation.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {recommendation.subtitle}
                    </p>
                    <Button asChild size="sm" className="mt-4 gap-2 rounded-xl h-10 px-5">
                      <Link to="/portal/book">
                        Book Recommended Treatment <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Category progress breakdown */}
              {treatmentProgress.length > 0 && (
                <div className="mt-5 pt-5 border-t border-border/40 space-y-3">
                  {treatmentProgress.map((p) => {
                    const cat = CATEGORIES[p.category as TreatmentCategory];
                    const pct = p.sessions_target > 0 ? Math.round((p.sessions_completed / p.sessions_target) * 100) : 0;
                    return (
                      <div key={p.category} className="flex items-center gap-3">
                        <span className="text-lg">{cat?.emoji}</span>
                        <span className="text-xs font-semibold text-foreground w-14">{cat?.label}</span>
                        <div className="flex-1 h-2 bg-muted/80 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-primary w-10 text-right">{p.sessions_completed}/{p.sessions_target}</span>
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
      <motion.div {...fadeUp} transition={{ delay: 0.14 }}>
        <h2 className="text-sm font-heading font-semibold text-foreground mb-4">
          Your Next Transformation Session
        </h2>
        {nextAppointment ? (
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-foreground text-xl leading-tight">
                    {(nextAppointment as any).services?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {format(new Date((nextAppointment as any).scheduled_at), 'EEEE, MMMM d · h:mm a')}
                  </p>
                  {(nextAppointment as any).staff && (
                    <p className="text-xs text-muted-foreground mt-1">
                      with {(nextAppointment as any).staff.first_name} {(nextAppointment as any).staff.last_name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">No upcoming sessions scheduled</p>
              <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-xl">
                <Link to="/portal/book">Schedule Now <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* ── My Progress (packages) ── */}
      {activePackages.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.18 }}>
          <h2 className="text-sm font-heading font-semibold text-foreground mb-4">My Progress</h2>
          <div className="space-y-4">
            {activePackages.map((pkg: any) => {
              const pct = pkg.sessions_total > 0 ? Math.round((pkg.sessions_used / pkg.sessions_total) * 100) : 0;
              return (
                <Card key={pkg.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-foreground">{pkg.packages?.name || 'Treatment Package'}</p>
                      <div className="text-right">
                        <span className="text-lg font-heading font-bold text-primary">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{pkg.sessions_used} of {pkg.sessions_total} sessions · {pkg.sessions_total - pkg.sessions_used} remaining</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Quick Actions ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.22 }}>
        <h2 className="text-sm font-heading font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Messages', href: '/portal/messages', icon: '💬' },
            { label: 'My Photos', href: '/portal/photos', icon: '📸' },
            { label: 'Forms', href: '/portal/forms', icon: '📋' },
            { label: 'Skin Analysis', href: '/portal/skin-analysis', icon: '✨' },
          ].map((item) => (
            <Link key={item.href} to={item.href} className="flex items-center gap-3 p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all group">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
