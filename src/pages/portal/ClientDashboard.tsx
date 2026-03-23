import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Target, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { GOALS, CATEGORIES, getSimpleRecommendation, type ClientGoal, type ProgressData, type TreatmentCategory } from '@/lib/elitaMethod';
import { cn } from '@/lib/utils';
import { JourneyHero } from '@/components/portal/JourneyHero';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
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

  const bookingHref = recommendation
    ? `/portal/book?category=${recommendation.category}`
    : '/portal/book';

  return (
    <div className="max-w-xl mx-auto pb-32 page-atmosphere">

      {/* ═══ HERO — LUXURY JOURNEY SECTION ═══ */}
      <div className="mt-4 sm:mt-8">
        <JourneyHero
          firstName={firstName}
          hasGoals={hasGoals}
          treatmentProgress={treatmentProgress}
          nextAppointment={nextAppointment}
          recommendation={recommendation}
          bookingHref={bookingHref}
        />
      </div>

      {/* ═══ URGENCY MESSAGE ═══ */}
      {urgency && hasGoals && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="mt-6 relative z-10">
          <div className={cn(
            'flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-xs font-medium',
            urgency.tone === 'success' && 'bg-success/6 text-success',
            urgency.tone === 'info' && 'bg-elita-camel/6 text-elita-camel',
            urgency.tone === 'warning' && 'bg-warning/6 text-warning',
          )}>
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {urgency.text}
          </div>
        </motion.div>
      )}

      {/* ═══ GOAL SELECTION (onboarding) ═══ */}
      {!hasGoals && (
        <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="mt-14 relative z-10">
          <SectionLabel>What's Your Goal?</SectionLabel>
          <div className="card-elevated p-7 sm:p-8">
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Select your primary goal and we'll create your personalized plan.
            </p>
            <div className="space-y-3">
              {GOALS.map((goal) => (
                <button
                  key={goal.key}
                  onClick={() => saveGoalMutation.mutate(goal.key)}
                  disabled={saveGoalMutation.isPending}
                  className="flex items-center gap-4 w-full p-5 rounded-2xl border border-border/50 hover:border-elita-camel/20 hover:bg-accent/30 hover:shadow-sm transition-all duration-300 text-left active:scale-[0.98]"
                  style={{ boxShadow: 'inset 0 1px 0 hsl(36 28% 100% / 0.3)' }}
                >
                  <div className="w-11 h-11 rounded-2xl bg-accent/40 flex items-center justify-center text-xl shrink-0">
                    {goal.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{goal.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{goal.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ TREATMENT PLAN — offset left for editorial feel ═══ */}
      {treatmentProgress.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="mt-16 relative z-10 sm:-ml-2">
          <SectionLabel>Your Personalized Plan</SectionLabel>
          <div className="card-minimal p-5 space-y-3">
            <div className="flex items-center gap-2.5 mb-1">
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
                  <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-elita-camel/40 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.15 }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground w-7 text-right">{p.sessions_completed}/{p.sessions_target}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ PACKAGES — offset right ═══ */}
      {activePackages.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.14 }} className="mt-16 relative z-10 sm:mr-[-4px] sm:ml-4">
          <SectionLabel>Session Progress</SectionLabel>
          <div className="space-y-3">
            {activePackages.map((pkg: any) => {
              const pct = pkg.sessions_total > 0 ? Math.round((pkg.sessions_used / pkg.sessions_total) * 100) : 0;
              return (
                <div key={pkg.id} className="card-premium p-6 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-medium text-foreground">{pkg.packages?.name || 'Treatment Package'}</p>
                    <span className="text-lg font-heading font-bold text-elita-camel">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full progress-glow" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2.5">{pkg.sessions_total - pkg.sessions_used} sessions remaining</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ QUICK ACTIONS — asymmetric layout ═══ */}
      <motion.div {...fadeUp} transition={{ delay: 0.18 }} className="mt-14 relative z-10">
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Messages', href: '/portal/messages', icon: '💬', span: 'col-span-2' },
            { label: 'Photos', href: '/portal/photos', icon: '📸', span: '' },
            { label: 'Care Tips', href: '/portal/skin-analysis', icon: '✨', span: '' },
            { label: 'Visit History', href: '/portal/history', icon: '📋', span: 'col-span-2' },
          ].map((item) => (
            <Link key={item.href} to={item.href} className={cn(
              'flex items-center gap-3 p-4 rounded-xl bg-card border border-border/40 hover:border-elita-camel/15 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]',
              item.span
            )}
            style={{ boxShadow: 'inset 0 1px 0 hsl(36 28% 100% / 0.4)' }}>
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
    <p className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-[0.45em] mb-5">
      {children}
    </p>
  );
}

export default ClientDashboard;
