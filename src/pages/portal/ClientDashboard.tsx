import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Target, Sparkles, ChevronRight, Star } from 'lucide-react';
import { addDays, startOfDay } from 'date-fns';
import { matchServiceToCategory } from '@/lib/elitaMethod';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import { GOALS, CATEGORIES, getSimpleRecommendation, type ClientGoal, type ProgressData, type TreatmentCategory } from '@/lib/elitaMethod';
import { cn } from '@/lib/utils';
import { JourneyHero } from '@/components/portal/JourneyHero';
import { PendingFormsBanner } from '@/components/portal/PendingFormsBanner';
import { BirthdayGiftBanner } from '@/components/portal/BirthdayGiftBanner';

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
      const { data } = await supabase.from('client_packages').select('id, sessions_used, sessions_total, expiry_date, packages(name)')
        .eq('client_id', client.id).eq('status', 'active');
      return data || [];
    },
    enabled: !!client?.id,
  });

  // Loyalty points
  const { data: loyaltyBalance = 0 } = useQuery({
    queryKey: ['client-loyalty-balance', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { data } = await supabase.rpc('get_client_loyalty_balance', { p_client_id: client.id });
      return data || 0;
    },
    enabled: !!client?.id,
  });

  const { data: lowestRewardCost = null } = useQuery({
    queryKey: ['lowest-reward-cost'],
    queryFn: async () => {
      const { data } = await supabase.from('loyalty_rewards').select('points_cost').eq('is_active', true).order('points_cost', { ascending: true }).limit(1);
      return data?.[0]?.points_cost || null;
    },
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

  // Fetch all client appointments for stage session tracking
  const { data: stageAppointments = {} } = useQuery({
    queryKey: ['client-stage-appointments', client?.id],
    queryFn: async () => {
      if (!client?.id) return {};
      const { data } = await supabase.from('appointments')
        .select('scheduled_at, status, services(name)')
        .eq('client_id', client.id)
        .in('status', ['completed', 'scheduled', 'confirmed']);
      if (!data) return {};
      const grouped: Record<string, { scheduled_at: string; status: string }[]> = {};
      for (const apt of data) {
        const serviceName = (apt as any).services?.name || '';
        const category = matchServiceToCategory(serviceName);
        if (category) {
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push({ scheduled_at: apt.scheduled_at, status: apt.status });
        }
      }
      return grouped;
    },
    enabled: !!client?.id,
  });

  const firstName = client?.first_name || 'there';
  const hasGoals = clientGoals.length > 0;
  const recommendation = hasGoals ? getSimpleRecommendation(clientGoals, treatmentProgress) : null;

  // Fetch recommended service details + next available slots
  const { data: recommendedServiceInfo } = useQuery({
    queryKey: ['recommended-service-info', recommendation?.category],
    queryFn: async () => {
      if (!recommendation) return null;
      const cat = CATEGORIES[recommendation.category];
      // Find a matching service by category
      const { data: services } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price, category')
        .eq('is_active', true)
        .eq('category', cat.label)
        .order('price', { ascending: true })
        .limit(1);
      const service = services?.[0];
      if (!service) return null;

      // Find next 2 available appointment slots in the next 7 days
      const now = new Date();
      const weekOut = addDays(now, 7);
      const { data: bookedSlots } = await supabase
        .from('appointments')
        .select('scheduled_at, duration_minutes, staff_id')
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', weekOut.toISOString())
        .in('status', ['scheduled', 'confirmed', 'checked_in', 'in_progress']);

      // Get active staff
      const { data: staffList } = await supabase
        .from('staff')
        .select('id')
        .eq('is_active', true)
        .in('role', ['admin', 'provider']);

      // Generate simple available slots (10am, 11am, 1pm, 2pm, 3pm for next 7 days)
      const slotHours = [10, 11, 13, 14, 15];
      const availableSlots: Date[] = [];
      for (let d = 1; d <= 7 && availableSlots.length < 2; d++) {
        const day = addDays(startOfDay(now), d);
        if (day.getDay() === 0) continue; // skip Sunday
        for (const h of slotHours) {
          if (availableSlots.length >= 2) break;
          const slot = new Date(day);
          slot.setHours(h, 0, 0, 0);
          // Check if at least one staff member is free at this time
          const isBooked = (bookedSlots || []).some(b => {
            const bStart = new Date(b.scheduled_at).getTime();
            const bEnd = bStart + (b.duration_minutes || 60) * 60000;
            const sStart = slot.getTime();
            const sEnd = sStart + service.duration_minutes * 60000;
            return sStart < bEnd && sEnd > bStart;
          });
          if (!isBooked) availableSlots.push(slot);
        }
      }

      return {
        duration: service.duration_minutes,
        price: service.price,
        slots: availableSlots,
      };
    },
    enabled: !!recommendation,
  });

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

      {/* ═══ PENDING FORMS BANNER ═══ */}
      <div className="mt-4 sm:mt-6 px-1">
        <PendingFormsBanner />
      </div>

      {/* ═══ HERO — LUXURY JOURNEY SECTION ═══ */}
      <div className="mt-4 sm:mt-8 mb-24">
        <JourneyHero
          firstName={firstName}
          hasGoals={hasGoals}
          treatmentProgress={treatmentProgress}
          nextAppointment={nextAppointment}
          recommendation={recommendation}
          recommendedServiceInfo={recommendedServiceInfo || undefined}
          bookingHref={bookingHref}
          stageAppointments={stageAppointments}
        />
      </div>

      {/* ═══ LOYALTY POINTS CARD ═══ */}
      <motion.div {...fadeUp} transition={{ delay: 0.07 }} className="mt-8 relative z-10 px-1">
        {(() => {
          const canRedeem = lowestRewardCost !== null && loyaltyBalance >= lowestRewardCost;
          const pointsToNext = lowestRewardCost !== null ? Math.max(lowestRewardCost - loyaltyBalance, 0) : null;

          return (
            <Link to="/portal/rewards" className="block">
              <div className={cn(
                'flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 hover:scale-[1.01]',
                canRedeem
                  ? 'bg-gradient-to-r from-amber-500/15 to-amber-400/10 border border-amber-500/30'
                  : 'glass'
              )}>
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  canRedeem ? 'bg-amber-500/20' : 'bg-elita-camel/10'
                )}>
                  <Star className={cn('w-4.5 h-4.5', canRedeem ? 'text-amber-500 fill-amber-500' : 'text-elita-camel')} />
                </div>
                <div className="flex-1 min-w-0">
                  {loyaltyBalance === 0 ? (
                    <p className="text-sm font-medium text-foreground">Earn points with every visit</p>
                  ) : canRedeem ? (
                    <>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        You have enough points to redeem a reward!
                      </p>
                      <p className="text-[11px] text-amber-600/70 dark:text-amber-400/60 font-medium mt-0.5">
                        {loyaltyBalance.toLocaleString()} Elita Points
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-foreground">
                        You have {loyaltyBalance.toLocaleString()} Elita Points
                      </p>
                      {pointsToNext !== null && (
                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                          {pointsToNext.toLocaleString()} points until your next reward
                        </p>
                      )}
                    </>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          );
        })()}
      </motion.div>

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
              const expiryDate = pkg.expiry_date ? new Date(pkg.expiry_date) : null;
              const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
              const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
              return (
                <motion.div
                  key={pkg.id}
                  whileHover={{ y: -3, scale: 1.008 }}
                  transition={{ duration: 0.4 }}
                  className="card-premium p-7 sm:p-8"
                >
                  <p className="text-[14px] font-heading font-semibold text-foreground mb-4">
                    {pkg.sessions_used} of {pkg.sessions_total} sessions completed
                  </p>
                  <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full progress-glow" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
                  </div>
                  <div className="mt-3.5 space-y-1">
                    {expiryDate && (
                      <p className={cn('text-[12px] font-medium', isExpiringSoon ? 'text-destructive' : 'text-muted-foreground')}>
                        Expires {format(expiryDate, 'MMM d, yyyy')}
                      </p>
                    )}
                    <p className="text-[12px] text-muted-foreground/70">{pkg.packages?.name || 'Treatment Package'}</p>
                  </div>
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
            { label: 'Gift Cards', href: '/portal/gift-cards', icon: '🎁', span: '' },
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
