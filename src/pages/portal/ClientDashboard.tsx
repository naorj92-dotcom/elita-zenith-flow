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

const stagger = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export function ClientDashboard() {
  const { client } = useClientAuth();

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

  const delays = [0, 0.06, 0.1, 0.14, 0.17, 0.2, 0.23, 0.26, 0.29, 0.32, 0.35];

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-8">
      {/* 1. Welcome Banner */}
      <WelcomeBackBanner
        firstName={client?.first_name || 'there'}
        lastVisitDate={client?.last_visit_date}
        visitCount={client?.visit_count || 0}
        isVip={client?.is_vip || false}
      />

      {/* 2. Next Appointment */}
      <motion.div {...stagger} transition={{ delay: delays[1] }}>
        <AppointmentCountdownWidget />
      </motion.div>

      {/* 3. Quick Actions */}
      <motion.div {...stagger} transition={{ delay: delays[2] }}>
        <QuickActionsGrid pendingFormsCount={pendingFormsCount} />
      </motion.div>

      {/* 4. Stats */}
      <motion.div {...stagger} transition={{ delay: delays[3] }}>
        <DashboardStatsRow
          visitCount={client?.visit_count || 0}
          totalSpent={client?.total_spent || 0}
          lastVisitDate={client?.last_visit_date}
          loyaltyPoints={totalPoints}
        />
      </motion.div>

      {/* 5. Visit Streak */}
      <motion.div {...stagger} transition={{ delay: delays[4] }}>
        <VisitStreakWidget />
      </motion.div>

      {/* 6. Aftercare Tips */}
      <motion.div {...stagger} transition={{ delay: delays[5] }}>
        <AftercareTipsWidget />
      </motion.div>

      {/* 7. Exclusive Deals */}
      <motion.div {...stagger} transition={{ delay: delays[6] }}>
        <ExclusiveDealsWidget />
      </motion.div>

      {/* 8. Membership + Loyalty */}
      <motion.div {...stagger} transition={{ delay: delays[7] }} className="grid gap-3 md:grid-cols-2">
        <MembershipStatusWidget />
        <LoyaltyPointsWidget />
      </motion.div>

      {/* 9. Referral + Progress */}
      <motion.div {...stagger} transition={{ delay: delays[8] }} className="grid gap-3 md:grid-cols-2">
        <ReferralWidget />
        <ProgressTimelineWidget />
      </motion.div>

      {/* 10. Achievements */}
      <motion.div {...stagger} transition={{ delay: delays[9] }}>
        <AchievementBadgesWidget />
      </motion.div>

      {/* 11. Timeline & Notes */}
      <motion.div {...stagger} transition={{ delay: delays[10] }}>
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

          <TabsContent value="timeline" className="mt-3">
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

          <TabsContent value="notes" className="mt-3">
            <ClientNotesFlags />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
