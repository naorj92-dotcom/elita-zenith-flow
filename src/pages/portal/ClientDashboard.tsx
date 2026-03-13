import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { History, Flag } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

// Widgets
import { WelcomeBackBanner } from '@/components/portal/WelcomeBackBanner';
import { AppointmentCountdownWidget } from '@/components/portal/AppointmentCountdownWidget';
import { QuickActionsGrid } from '@/components/portal/QuickActionsGrid';
import { DashboardStatsRow } from '@/components/portal/DashboardStatsRow';
import { LoyaltyPointsWidget } from '@/components/portal/LoyaltyPointsWidget';
import { MembershipStatusWidget } from '@/components/portal/MembershipStatusWidget';
import { VisitStreakWidget } from '@/components/portal/VisitStreakWidget';
import { ExclusiveDealsWidget } from '@/components/portal/ExclusiveDealsWidget';
import { AftercareTipsWidget } from '@/components/portal/AftercareTipsWidget';
import { ReferralWidget } from '@/components/portal/ReferralWidget';
import { ProgressTimelineWidget } from '@/components/portal/ProgressTimelineWidget';
import { AchievementBadgesWidget } from '@/components/portal/AchievementBadgesWidget';
import { ClientTimeline } from '@/components/portal/ClientTimeline';
import { ClientNotesFlags } from '@/components/portal/ClientNotesFlags';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export function ClientDashboard() {
  const { client } = useClientAuth();

  // Pending forms count
  const { data: pendingFormsCount = 0 } = useQuery({
    queryKey: ['client-pending-forms-count', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { count } = await supabase
        .from('client_forms')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: !!client?.id,
  });

  // Loyalty points for stats row
  const { data: totalPoints = 0 } = useQuery({
    queryKey: ['client-loyalty-total', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { data } = await supabase
        .from('loyalty_points')
        .select('points, transaction_type')
        .eq('client_id', client.id);
      if (!data) return 0;
      return data.reduce((sum, entry) => {
        return entry.transaction_type === 'redeemed' ? sum - entry.points : sum + entry.points;
      }, 0);
    },
    enabled: !!client?.id,
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 1. Welcome Banner */}
      <WelcomeBackBanner
        firstName={client?.first_name || 'there'}
        lastVisitDate={client?.last_visit_date}
        visitCount={client?.visit_count || 0}
        isVip={client?.is_vip || false}
      />

      {/* 2. Next Appointment - Most important */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <AppointmentCountdownWidget />
      </motion.div>

      {/* 3. Quick Actions Grid */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <QuickActionsGrid pendingFormsCount={pendingFormsCount} />
      </motion.div>

      {/* 4. Stats Summary */}
      <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
        <DashboardStatsRow
          visitCount={client?.visit_count || 0}
          totalSpent={client?.total_spent || 0}
          lastVisitDate={client?.last_visit_date}
          loyaltyPoints={totalPoints}
        />
      </motion.div>

      {/* 5. Visit Streak (conditional) */}
      <motion.div {...fadeUp} transition={{ delay: 0.18 }}>
        <VisitStreakWidget />
      </motion.div>

      {/* 6. Aftercare Tips (conditional - shows only within 14 days of treatment) */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <AftercareTipsWidget />
      </motion.div>

      {/* 7. Exclusive Deals (conditional) */}
      <motion.div {...fadeUp} transition={{ delay: 0.22 }}>
        <ExclusiveDealsWidget />
      </motion.div>

      {/* 8. Two-column: Membership + Loyalty */}
      <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="grid gap-4 md:grid-cols-2">
        <MembershipStatusWidget />
        <LoyaltyPointsWidget />
      </motion.div>

      {/* 9. Two-column: Referral + Progress */}
      <motion.div {...fadeUp} transition={{ delay: 0.28 }} className="grid gap-4 md:grid-cols-2">
        <ReferralWidget />
        <ProgressTimelineWidget />
      </motion.div>

      {/* 10. Achievements */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <AchievementBadgesWidget />
      </motion.div>

      {/* 11. Timeline & Notes Tabs */}
      <motion.div {...fadeUp} transition={{ delay: 0.32 }}>
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline" className="gap-2">
              <History className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <Flag className="h-4 w-4" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Activity Timeline
                </CardTitle>
                <CardDescription className="text-xs">Your recent visits, packages, and photos</CardDescription>
              </CardHeader>
              <CardContent>
                <ClientTimeline />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <ClientNotesFlags />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
