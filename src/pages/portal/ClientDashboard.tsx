import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, ArrowRight, Clock, Target, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { GOALS, CATEGORIES, getSimpleRecommendation, type ClientGoal, type ProgressData, type TreatmentCategory } from '@/lib/elitaMethod';
import { cn } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 10 },
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
    if (daysSinceLastSession <= 14) return { text: 'Time for your next session to stay on track', tone: 'info' as const };
    return { text: 'Let\'s get back on track — book your next session', tone: 'warning' as const };
  };
  const urgency = getUrgencyMessage();

  // Build quick-book link with recommendation pre-fill if available
  const bookingHref = recommendation
    ? `/portal/book?category=${recommendation.category}`
    : '/portal/book';

  return (
    <div className="space-y-12 max-w-xl mx-auto pb-32">

      {/* ═══ UNIFIED HERO BLOCK ═══ */}
      <motion.div {...fadeUp}>
        <Card className="card-hero overflow-hidden border-elita-camel/10 mt-8 sm:mt-12">
          <div className="h-1 bg-gradient-to-r from-elita-camel/40 via-elita-camel/15 to-transparent" />
          <CardContent className="p-8 sm:p-10 space-y-8">

            {/* Title */}
            <div>
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-[0.35em] mb-3">
                Welcome back, {firstName}
              </p>
              <h1 className="text-4xl sm:text-5xl font-heading font-semibold text-foreground tracking-tight leading-[1]">
                Your Elita Journey
              </h1>
            </div>

            {/* Next Visit — prominent */}
            {nextAppointment ? (
              <div className="p-7 rounded-2xl bg-accent/50 border border-border/40">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-[0.25em] mb-3">Your Next Visit</p>
                <p className="text-2xl font-heading font-semibold text-foreground leading-snug">
                  {(nextAppointment as any).services?.name}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {format(new Date((nextAppointment as any).scheduled_at), 'EEEE, MMMM d · h:mm a')}
                </p>
                {(nextAppointment as any).staff && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    with {(nextAppointment as any).staff.first_name} {(nextAppointment as any).staff.last_name}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-muted/30 text-center">
                <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2.5" />
                <p className="text-sm text-muted-foreground">No upcoming visits</p>
              </div>
            )}

            {/* Progress + Urgency (only when goals exist) */}
            {hasGoals && totalTarget > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <p className="text-[10px] font-semibold text-foreground tracking-widest uppercase">Your Progress</p>
                  <p className="text-3xl font-heading font-bold text-elita-camel leading-none">{overallPct}%</p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-elita-camel rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${overallPct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {totalCompleted} of {totalTarget} sessions completed
                </p>

                {urgency && (
                  <div className={cn(
                    'flex items-center gap-2.5 mt-5 px-4 py-3 rounded-2xl text-xs font-medium',
                    urgency.tone === 'success' && 'bg-success/8 text-success',
                    urgency.tone === 'info' && 'bg-elita-camel/8 text-elita-camel',
                    urgency.tone === 'warning' && 'bg-warning/8 text-warning',
                  )}>
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    {urgency.text}
                  </div>
                )}
              </div>
            )}

            {/* Recommended Next Step (inline) */}
            {recommendation && (
              <div className="bg-accent/30 rounded-2xl p-5 border border-border/30">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em] mb-3">Recommended Next Step</p>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{CATEGORIES[recommendation.category].emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading font-semibold text-foreground leading-snug">
                      {recommendation.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {recommendation.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Primary CTA */}
            <Button asChild size="lg" className="w-full h-14 text-sm font-semibold gap-2.5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-md transition-all duration-300 hover:shadow-lg">
              <Link to={bookingHref}>
                <CalendarPlus className="h-4.5 w-4.5" />
                {recommendation ? 'Book Recommended Session' : 'Book Your Next Session'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ GOAL SELECTION (onboarding only) ═══ */}
      {!hasGoals && (
        <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
          <SectionLabel>What's Your Goal?</SectionLabel>
          <Card className="shadow-md">
            <CardContent className="p-7">
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Select your primary goal and we'll create your personalized plan.
              </p>
              <div className="space-y-3">
                {GOALS.map((goal) => (
                  <button
                    key={goal.key}
                    onClick={() => saveGoalMutation.mutate(goal.key)}
                    disabled={saveGoalMutation.isPending}
                    className="flex items-center gap-4 w-full p-5 rounded-2xl border border-border hover:border-elita-camel/25 hover:bg-accent/40 hover:shadow-sm transition-all duration-300 text-left"
                  >
                    <span className="text-2xl">{goal.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{goal.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{goal.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══ CATEGORY PROGRESS (compact) ═══ */}
      {treatmentProgress.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <SectionLabel>Your Personalized Plan</SectionLabel>
          <Card className="shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <Target className="w-4 h-4 text-elita-camel" />
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  {GOALS.find(g => g.key === clientGoals[0])?.label}
                </p>
              </div>
              {treatmentProgress.map((p) => {
                const cat = CATEGORIES[p.category as TreatmentCategory];
                const pct = p.sessions_target > 0 ? Math.round((p.sessions_completed / p.sessions_target) * 100) : 0;
                return (
                  <div key={p.category} className="flex items-center gap-3">
                    <span className="text-sm w-5 text-center">{cat?.emoji}</span>
                    <span className="text-xs text-muted-foreground w-14">{cat?.label}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-elita-camel/60 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.15 }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{p.sessions_completed}/{p.sessions_target}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══ PACKAGE PROGRESS ═══ */}
      {activePackages.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.14 }}>
          <SectionLabel>Session Progress</SectionLabel>
          <div className="space-y-4">
            {activePackages.map((pkg: any) => {
              const pct = pkg.sessions_total > 0 ? Math.round((pkg.sessions_used / pkg.sessions_total) * 100) : 0;
              return (
                <Card key={pkg.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-foreground">{pkg.packages?.name || 'Treatment Package'}</p>
                      <span className="text-xl font-heading font-bold text-elita-camel">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-elita-camel rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2.5">{pkg.sessions_total - pkg.sessions_used} sessions remaining</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <motion.div {...fadeUp} transition={{ delay: 0.18 }}>
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Messages', href: '/portal/messages', icon: '💬' },
            { label: 'My Photos', href: '/portal/photos', icon: '📸' },
            { label: 'Care Tips', href: '/portal/skin-analysis', icon: '✨' },
            { label: 'Visit History', href: '/portal/history', icon: '📋' },
          ].map((item) => (
            <Link key={item.href} to={item.href} className="flex items-center gap-3.5 p-5 rounded-2xl bg-card border border-border hover:border-elita-camel/20 hover:shadow-md transition-all duration-300">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.25em] mb-4">
      {children}
    </p>
  );
}

export default ClientDashboard;
