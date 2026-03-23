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
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
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
    <div className="max-w-xl mx-auto pb-36 page-atmosphere">

      {/* ═══ HERO — LUXURY JOURNEY SECTION ═══ */}
      <div className="mt-4 sm:mt-8 mb-24">
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
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="mt-8 relative z-10 sm:ml-2">
          <div className={cn(
            'glass flex items-center gap-3 px-6 py-4 rounded-2xl text-xs font-medium',
            urgency.tone === 'success' && 'text-success',
            urgency.tone === 'info' && 'text-elita-camel',
            urgency.tone === 'warning' && 'text-warning',
          )}>
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {urgency.text}
          </div>
        </motion.div>
      )}

      {/* ═══ GOAL SELECTION (onboarding) ═══ */}
      {!hasGoals && (
        <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="mt-20 relative z-10">
          <SectionLabel>What's Your Goal?</SectionLabel>
          <div className="card-elevated p-7 sm:p-9">
            <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
              Select your primary goal and we'll create your personalized plan.
            </p>
            <div className="space-y-3.5">
              {GOALS.map((goal) => (
                <motion.button
                  key={goal.key}
                  onClick={() => saveGoalMutation.mutate(goal.key)}
                  disabled={saveGoalMutation.isPending}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 w-full p-5 rounded-2xl border border-border/40 hover:border-elita-camel/20 hover:bg-accent/30 transition-all duration-400 text-left glass"
                >
                  <div className="w-12 h-12 rounded-2xl bg-accent/50 flex items-center justify-center text-xl shrink-0"
                       style={{ boxShadow: '0 0 20px hsl(34 48% 60% / 0.06)' }}>
                    {goal.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{goal.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{goal.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ TREATMENT PLAN — offset left, elevated ═══ */}
      {treatmentProgress.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="mt-24 relative z-10 sm:-ml-3">
          <SectionLabel>Your Personalized Plan</SectionLabel>
          <div className="card-premium p-7 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-elita-camel/10 flex items-center justify-center"
                   style={{ boxShadow: '0 0 16px hsl(34 48% 60% / 0.08)' }}>
                <Target className="w-4 h-4 text-elita-camel" />
              </div>
              <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                {GOALS.find(g => g.key === clientGoals[0])?.label}
              </p>
            </div>
            {treatmentProgress.map((p) => {
              const cat = CATEGORIES[p.category as TreatmentCategory];
              const pct = p.sessions_target > 0 ? Math.round((p.sessions_completed / p.sessions_target) * 100) : 0;
              return (
                <div key={p.category} className="flex items-center gap-3.5">
                  <span className="text-sm w-5 text-center">{cat?.emoji}</span>
                  <span className="text-[12px] text-muted-foreground font-medium w-14">{cat?.label}</span>
                  <div className="flex-1 h-2.5 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div className="h-full progress-glow rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.2 }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-8 text-right">{p.sessions_completed}/{p.sessions_target}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ PACKAGES — offset right, stronger cards ═══ */}
      {activePackages.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.14 }} className="mt-24 relative z-10 sm:ml-5">
          <SectionLabel>Session Progress</SectionLabel>
          <div className="space-y-5">
            {activePackages.map((pkg: any) => {
              const pct = pkg.sessions_total > 0 ? Math.round((pkg.sessions_used / pkg.sessions_total) * 100) : 0;
              return (
                <motion.div
                  key={pkg.id}
                  whileHover={{ y: -3, scale: 1.008 }}
                  transition={{ duration: 0.4 }}
                  className="card-premium p-7 sm:p-8"
                >
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-[14px] font-heading font-medium text-foreground">{pkg.packages?.name || 'Treatment Package'}</p>
                    <span className="text-2xl font-heading font-bold text-elita-camel"
                          style={{ textShadow: '0 0 20px hsl(34 48% 60% / 0.15)' }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full progress-glow" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-3.5">{pkg.sessions_total - pkg.sessions_used} sessions remaining</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ QUICK ACTIONS — subdued, asymmetric grid ═══ */}
      <motion.div {...fadeUp} transition={{ delay: 0.18 }} className="mt-24 relative z-10 sm:-ml-1">
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Messages', href: '/portal/messages', icon: '💬', span: 'col-span-2' },
            { label: 'Photos', href: '/portal/photos', icon: '📸', span: '' },
            { label: 'Care Tips', href: '/portal/skin-analysis', icon: '✨', span: '' },
            { label: 'Visit History', href: '/portal/history', icon: '📋', span: 'col-span-2' },
          ].map((item) => (
            <Link key={item.href} to={item.href} className={cn(
              'flex items-center gap-3 p-4 rounded-xl card-minimal hover:shadow-sm transition-all duration-400 active:scale-[0.98]',
              item.span
            )}>
              <span className="text-sm">{item.icon}</span>
              <span className="text-[12px] font-medium text-muted-foreground">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="divider-luxe mb-5" />
      <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.55em]">
        {children}
      </p>
    </div>
  );
}

export default ClientDashboard;
