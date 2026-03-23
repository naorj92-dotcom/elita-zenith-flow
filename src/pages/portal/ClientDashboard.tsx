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
    <div className="space-y-14 max-w-xl mx-auto pb-32">

      {/* ═══ HERO — LANDING-PAGE FEEL ═══ */}
      <motion.div {...fadeUp}>
        <div className="card-hero glow-accent overflow-hidden mt-8 sm:mt-12">
          <div className="h-1 bg-gradient-to-r from-elita-camel/50 via-elita-camel/20 to-transparent" />
          <div className="p-8 sm:p-11 space-y-9">

            {/* Title — large, brand-like */}
            <div className="space-y-2">
              <p className="text-[9px] font-semibold text-elita-camel/70 uppercase tracking-[0.4em]">
                Welcome back, {firstName}
              </p>
              <h1 className="text-4xl sm:text-5xl font-heading font-semibold text-foreground tracking-tight leading-[1]">
                Your Elita Journey
              </h1>
            </div>

            {/* Next Visit — dominant inner card */}
            {nextAppointment ? (
              <div className="relative p-7 rounded-2xl bg-card/80 border border-border/30 shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-elita-camel/15 to-transparent" />
                <p className="text-[9px] font-semibold text-elita-camel/60 uppercase tracking-[0.3em] mb-3">Your Next Visit</p>
                <p className="text-2xl font-heading font-semibold text-foreground leading-snug">
                  {(nextAppointment as any).services?.name}
                </p>
                <p className="text-sm text-muted-foreground mt-2.5">
                  {format(new Date((nextAppointment as any).scheduled_at), 'EEEE, MMMM d · h:mm a')}
                </p>
                {(nextAppointment as any).staff && (
                  <p className="text-xs text-muted-foreground/70 mt-1.5">
                    with {(nextAppointment as any).staff.first_name} {(nextAppointment as any).staff.last_name}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-7 rounded-2xl bg-card/60 text-center border border-border/20">
                <Clock className="w-5 h-5 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No upcoming visits</p>
              </div>
            )}

            {/* Progress */}
            {hasGoals && totalTarget > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-semibold text-foreground/70 tracking-widest uppercase">Your Progress</p>
                  <p className="text-3xl font-heading font-bold text-elita-camel leading-none">{overallPct}%</p>
                </div>
                <div className="h-2.5 bg-muted/60 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, hsl(32 38% 56%), hsl(36 52% 50%))' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${overallPct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2.5">
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

            {/* Recommended Next Step */}
            {recommendation && (
              <div className="relative bg-card/60 rounded-2xl p-6 border border-border/25">
                <p className="text-[9px] font-semibold text-elita-camel/60 uppercase tracking-[0.3em] mb-3">Recommended Next Step</p>
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
            <Button asChild size="lg" className="w-full h-14 text-sm font-semibold gap-2.5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]">
              <Link to={bookingHref}>
                <CalendarPlus className="h-4.5 w-4.5" />
                {recommendation ? 'Book Recommended Session' : 'Book Your Next Session'}
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══ GOAL SELECTION (onboarding only) ═══ */}
      {!hasGoals && (
        <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
          <SectionLabel>What's Your Goal?</SectionLabel>
          <Card className="card-elevated">
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
                    className="flex items-center gap-4 w-full p-5 rounded-2xl border border-border hover:border-elita-camel/25 hover:bg-accent/40 hover:shadow-sm transition-all duration-300 text-left active:scale-[0.98]"
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

      {/* ═══ CATEGORY PROGRESS — minimal card ═══ */}
      {treatmentProgress.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <SectionLabel>Your Personalized Plan</SectionLabel>
          <div className="card-minimal p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <Target className="w-3.5 h-3.5 text-elita-camel" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {GOALS.find(g => g.key === clientGoals[0])?.label}
              </p>
            </div>
            {treatmentProgress.map((p) => {
              const cat = CATEGORIES[p.category as TreatmentCategory];
              const pct = p.sessions_target > 0 ? Math.round((p.sessions_completed / p.sessions_target) * 100) : 0;
              return (
                <div key={p.category} className="flex items-center gap-2.5">
                  <span className="text-xs w-4 text-center">{cat?.emoji}</span>
                  <span className="text-[11px] text-muted-foreground w-12">{cat?.label}</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full bg-elita-camel/50 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.15 }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground w-7 text-right">{p.sessions_completed}/{p.sessions_target}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ PACKAGE PROGRESS — standard card ═══ */}
      {activePackages.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.14 }}>
          <SectionLabel>Session Progress</SectionLabel>
          <div className="space-y-3">
            {activePackages.map((pkg: any) => {
              const pct = pkg.sessions_total > 0 ? Math.round((pkg.sessions_used / pkg.sessions_total) * 100) : 0;
              return (
                <Card key={pkg.id} className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[13px] font-medium text-foreground">{pkg.packages?.name || 'Treatment Package'}</p>
                      <span className="text-lg font-heading font-bold text-elita-camel">{pct}%</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-elita-camel rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">{pkg.sessions_total - pkg.sessions_used} sessions remaining</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ QUICK ACTIONS — minimal ═══ */}
      <motion.div {...fadeUp} transition={{ delay: 0.18 }}>
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Messages', href: '/portal/messages', icon: '💬' },
            { label: 'My Photos', href: '/portal/photos', icon: '📸' },
            { label: 'Care Tips', href: '/portal/skin-analysis', icon: '✨' },
            { label: 'Visit History', href: '/portal/history', icon: '📋' },
          ].map((item) => (
            <Link key={item.href} to={item.href} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-elita-camel/15 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]">
              <span className="text-base">{item.icon}</span>
              <span className="text-[13px] font-medium text-muted-foreground">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-[0.35em] mb-5">
      {children}
    </p>
  );
}

export default ClientDashboard;
