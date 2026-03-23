import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, ArrowRight, Clock, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { GOALS, CATEGORIES, getSimpleRecommendation, getRecommendations, type ClientGoal, type ProgressData, type TreatmentCategory } from '@/lib/elitaMethod';
import { cn } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
};

export function ClientDashboard() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();

  const { data: clientGoals = [] } = useQuery({
    queryKey: ['client-goals', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase.from('client_goals').select('goal, is_active').eq('client_id', client.id).eq('is_active', true);
      return (data || []).map((g: any) => g.goal as ClientGoal);
    },
    enabled: !!client?.id,
  });

  const { data: treatmentProgress = [] } = useQuery({
    queryKey: ['client-treatment-progress', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase.from('client_treatment_progress').select('category, sessions_completed, sessions_target').eq('client_id', client.id);
      return (data || []) as ProgressData[];
    },
    enabled: !!client?.id,
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (goal: ClientGoal) => {
      if (!client?.id) throw new Error('No client');
      const { error } = await supabase.from('client_goals').upsert({ client_id: client.id, goal, is_active: true }, { onConflict: 'client_id,goal' });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-goals', client?.id] }); },
  });

  const { data: nextAppointment } = useQuery({
    queryKey: ['client-next-apt', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data } = await supabase.from('appointments')
        .select('id, scheduled_at, duration_minutes, status, services(name), staff(first_name, last_name)')
        .eq('client_id', client.id).gte('scheduled_at', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed']).order('scheduled_at', { ascending: true }).limit(1);
      return data?.[0] || null;
    },
    enabled: !!client?.id,
  });

  const { data: activePackages = [] } = useQuery({
    queryKey: ['client-active-packages', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase.from('client_packages').select('id, sessions_used, sessions_total, packages(name)')
        .eq('client_id', client.id).eq('status', 'active').limit(3);
      return data || [];
    },
    enabled: !!client?.id,
  });

  const { data: lastCompleted } = useQuery({
    queryKey: ['client-last-completed', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data } = await supabase.from('appointments').select('completed_at, services(name)')
        .eq('client_id', client.id).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1);
      return data?.[0] || null;
    },
    enabled: !!client?.id,
  });

  const firstName = client?.first_name || 'there';
  const hasGoals = clientGoals.length > 0;
  const recommendation = hasGoals ? getSimpleRecommendation(clientGoals, treatmentProgress) : null;

  const totalCompleted = treatmentProgress.reduce((s, p) => s + p.sessions_completed, 0);
  const totalTarget = treatmentProgress.reduce((s, p) => s + p.sessions_target, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  const daysSinceLastSession = lastCompleted?.completed_at
    ? differenceInDays(new Date(), new Date((lastCompleted as any).completed_at))
    : null;

  const getUrgencyMessage = () => {
    if (daysSinceLastSession === null) return null;
    if (daysSinceLastSession <= 7) return { text: 'You\'re on track — great consistency', tone: 'success' as const };
    if (daysSinceLastSession <= 14) return { text: 'Time for your next session', tone: 'info' as const };
    if (daysSinceLastSession <= 30) return { text: 'Don\'t lose your momentum', tone: 'warning' as const };
    return { text: 'Let\'s get back on track', tone: 'warning' as const };
  };
  const urgency = getUrgencyMessage();

  return (
    <div className="space-y-10 max-w-xl mx-auto pb-20 px-1">
      {/* Hero — brand statement */}
      <motion.div {...fadeUp} className="text-center pt-12 pb-4">
        <h1 className="text-4xl md:text-5xl font-heading font-semibold text-foreground tracking-tight leading-[1.1]">
          Your Elita Journey
        </h1>
        <p className="text-muted-foreground mt-4 text-base leading-relaxed max-w-sm mx-auto">
          Personalized treatments designed for your results, {firstName}.
        </p>
      </motion.div>

      {/* Primary CTA */}
      <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.5 }}>
        <Button asChild size="lg" className="w-full h-16 text-base font-semibold gap-3 rounded-2xl">
          <Link to="/portal/book">
            <CalendarPlus className="h-5 w-5" />
            Book Your Next Session
          </Link>
        </Button>
      </motion.div>

      {/* Goal Selection */}
      {!hasGoals && (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.15em] mb-5">
            What's Your Goal?
          </p>
          <Card>
            <CardContent className="p-7">
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Select your primary goal and we'll create your personalized treatment plan.
              </p>
              <div className="space-y-3">
                {GOALS.map((goal) => (
                  <button
                    key={goal.key}
                    onClick={() => saveGoalMutation.mutate(goal.key)}
                    disabled={saveGoalMutation.isPending}
                    className="flex items-center gap-5 w-full p-5 rounded-2xl border border-border hover:border-primary/30 hover:bg-accent/40 transition-all text-left group"
                  >
                    <span className="text-3xl">{goal.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{goal.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{goal.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Your Personalized Plan */}
      {recommendation && (
        <motion.div {...fadeUp} transition={{ delay: 0.12 }}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.15em] mb-5">
            Your Personalized Plan
          </p>
          <Card className="border-primary/15 overflow-hidden">
            <CardContent className="p-7">
              {/* Focus + Progress */}
              <div className="flex items-center justify-between mb-7">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">Current Focus</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{GOALS.find(g => g.key === clientGoals[0])?.label}</p>
                  </div>
                </div>
                {totalTarget > 0 && (
                  <div className="text-right">
                    <p className="text-3xl font-heading font-bold text-primary leading-none">{overallPct}%</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Complete</p>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {totalTarget > 0 && (
                <div className="mb-7">
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${overallPct}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {totalCompleted} of {totalTarget} sessions completed
                  </p>
                </div>
              )}

              {/* Urgency */}
              {urgency && (
                <div className={cn(
                  'flex items-center gap-3 px-5 py-3.5 rounded-2xl mb-7 text-sm',
                  urgency.tone === 'success' && 'bg-success/10 text-success',
                  urgency.tone === 'info' && 'bg-primary/10 text-primary',
                  urgency.tone === 'warning' && 'bg-warning/10 text-warning',
                )}>
                  <Zap className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{urgency.text}</span>
                </div>
              )}

              {/* Recommended Next Step */}
              <div className="bg-accent/50 rounded-2xl p-5 border border-border/50">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em] mb-3">Recommended Next Step</p>
                <div className="flex items-start gap-4">
                  <span className="text-3xl mt-0.5">{CATEGORIES[recommendation.category].emoji}</span>
                  <div className="flex-1">
                    <p className="text-lg font-heading font-semibold text-foreground leading-tight">
                      {recommendation.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {recommendation.subtitle}
                    </p>
                    <Button asChild size="sm" className="mt-5 gap-2 rounded-xl h-10 px-5">
                      <Link to="/portal/book">
                        Book Treatment <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Category breakdown */}
              {treatmentProgress.length > 0 && (
                <div className="mt-7 pt-7 border-t border-border/40 space-y-4">
                  {treatmentProgress.map((p) => {
                    const cat = CATEGORIES[p.category as TreatmentCategory];
                    const pct = p.sessions_target > 0 ? Math.round((p.sessions_completed / p.sessions_target) * 100) : 0;
                    return (
                      <div key={p.category} className="flex items-center gap-3">
                        <span className="text-lg">{cat?.emoji}</span>
                        <span className="text-xs font-semibold text-foreground w-16">{cat?.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
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

      {/* Next Visit */}
      <motion.div {...fadeUp} transition={{ delay: 0.18 }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.15em] mb-5">
          Your Next Visit
        </p>
        {nextAppointment ? (
          <Card>
            <CardContent className="p-7">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-foreground text-xl leading-tight">
                    {(nextAppointment as any).services?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
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
          <Card>
            <CardContent className="p-7 text-center">
              <p className="text-sm text-muted-foreground mb-4">No upcoming visits scheduled</p>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/portal/book">Schedule Now <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* My Progress */}
      {activePackages.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.22 }}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.15em] mb-5">My Progress</p>
          <div className="space-y-4">
            {activePackages.map((pkg: any) => {
              const pct = pkg.sessions_total > 0 ? Math.round((pkg.sessions_used / pkg.sessions_total) * 100) : 0;
              return (
                <Card key={pkg.id}>
                  <CardContent className="p-7">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-semibold text-foreground">{pkg.packages?.name || 'Treatment Package'}</p>
                      <span className="text-2xl font-heading font-bold text-primary">{pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2.5">{pkg.sessions_used} of {pkg.sessions_total} sessions · {pkg.sessions_total - pkg.sessions_used} remaining</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div {...fadeUp} transition={{ delay: 0.26 }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.15em] mb-5">Quick Actions</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Messages', href: '/portal/messages', icon: '💬' },
            { label: 'My Photos', href: '/portal/photos', icon: '📸' },
            { label: 'Forms', href: '/portal/forms', icon: '📋' },
            { label: 'Skin Analysis', href: '/portal/skin-analysis', icon: '✨' },
          ].map((item) => (
            <Link key={item.href} to={item.href} className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-premium-md transition-all duration-300 group">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default ClientDashboard;
