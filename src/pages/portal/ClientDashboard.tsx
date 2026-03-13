import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isValid } from 'date-fns';
import { Package, Image, ShoppingBag, Sparkles, Clock, ChevronRight, History, Crown, Flag, Gift, FileText, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoyaltyPointsWidget } from '@/components/portal/LoyaltyPointsWidget';
import { MembershipStatusWidget } from '@/components/portal/MembershipStatusWidget';
import { ClientTimeline } from '@/components/portal/ClientTimeline';
import { ClientNotesFlags } from '@/components/portal/ClientNotesFlags';
import { MembershipBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { VisitStreakWidget } from '@/components/portal/VisitStreakWidget';
import { AppointmentCountdownWidget } from '@/components/portal/AppointmentCountdownWidget';
import { ExclusiveDealsWidget } from '@/components/portal/ExclusiveDealsWidget';
import { AftercareTipsWidget } from '@/components/portal/AftercareTipsWidget';
import { ReferralWidget } from '@/components/portal/ReferralWidget';
import { ProgressTimelineWidget } from '@/components/portal/ProgressTimelineWidget';
import { AchievementBadgesWidget } from '@/components/portal/AchievementBadgesWidget';
import { WelcomeBackBanner } from '@/components/portal/WelcomeBackBanner';

export function ClientDashboard() {
  const { client } = useClientAuth();

  // Fetch active packages count
  const { data: packagesCount } = useQuery({
    queryKey: ['client-packages-count', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { count } = await supabase
        .from('client_packages')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!client?.id,
  });

  // Fetch photos count
  const { data: photosCount } = useQuery({
    queryKey: ['client-photos-count', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { count } = await supabase
        .from('before_after_photos')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('is_visible_to_client', true);
      return count || 0;
    },
    enabled: !!client?.id,
  });

  // Fetch recommendations count
  const { data: recommendationsCount } = useQuery({
    queryKey: ['client-recommendations-count', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { count: productCount } = await supabase
        .from('product_recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('is_purchased', false);
      const { count: serviceCount } = await supabase
        .from('service_recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('is_booked', false);
      return (productCount || 0) + (serviceCount || 0);
    },
    enabled: !!client?.id,
  });

  // Fetch pending forms count
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

  return (
    <div className="space-y-6">
      {/* Welcome Header with Personalized Greeting */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Welcome back</span>
        </div>
        <h1 className="text-3xl font-heading font-semibold">
          {client?.first_name} {client?.last_name}
        </h1>
        {client?.is_vip && (
          <MembershipBadge isVip className="mt-3" />
        )}
      </div>

      {/* Visit Streak */}
      <VisitStreakWidget />

      {/* Pending Forms Alert */}
      {pendingFormsCount > 0 && (
        <Link to="/portal/forms">
          <Card className="border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {pendingFormsCount} Form{pendingFormsCount !== 1 ? 's' : ''} Require{pendingFormsCount === 1 ? 's' : ''} Your Attention
                </h3>
                <p className="text-sm text-muted-foreground">Please complete your pending forms before your appointment</p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-500" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Appointment Countdown + Aftercare Tips Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <AppointmentCountdownWidget />
        <div className="space-y-4">
          <AftercareTipsWidget />
          {/* Loyalty Balance Mini */}
          <LoyaltyPointsWidget />
        </div>
      </div>

      {/* Exclusive Deals */}
      <ExclusiveDealsWidget />

      {/* Tabs: Overview, Timeline, Notes */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="gap-2">
            <Package className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <History className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <Flag className="h-4 w-4" />
            Notes & Flags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Progress Timeline */}
          <ProgressTimelineWidget />

          {/* Quick Links Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link to="/portal/packages">
              <Card className="card-luxury group cursor-pointer h-full hover-lift">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">My Packages</h3>
                    <p className="text-sm text-muted-foreground">{packagesCount} active package{packagesCount !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/portal/photos">
              <Card className="card-luxury group cursor-pointer h-full hover-lift">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Image className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Progress Photos</h3>
                    <p className="text-sm text-muted-foreground">{photosCount} photo{photosCount !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/portal/recommendations">
              <Card className="card-luxury group cursor-pointer h-full hover-lift">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Recommendations</h3>
                    <p className="text-sm text-muted-foreground">{recommendationsCount} new recommendation{recommendationsCount !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/portal/skin-analysis">
              <Card className="card-luxury group cursor-pointer h-full border-primary/20 hover-lift hover-glow">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">AI Skin Analysis</h3>
                    <p className="text-sm text-muted-foreground">Get personalized recommendations</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Membership & Referral Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <MembershipStatusWidget />
            <ReferralWidget />
          </div>

          {/* Achievement Badges */}
          <AchievementBadgesWidget />

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="card-luxury">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-heading font-semibold text-primary">
                  ${(client?.total_spent || 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Total Investment</p>
              </CardContent>
            </Card>
            <Card className="card-luxury">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-heading font-semibold text-primary">
                  {client?.visit_count || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Total Visits</p>
              </CardContent>
            </Card>
            <Card className="card-luxury">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-heading font-semibold text-primary">
                  {client?.last_visit_date 
                    ? format(new Date(client.last_visit_date), 'MMM d')
                    : '—'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Last Visit</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card className="card-luxury">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Activity Timeline
              </CardTitle>
              <CardDescription>Your recent visits, packages, and photos</CardDescription>
            </CardHeader>
            <CardContent>
              <ClientTimeline />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <ClientNotesFlags />
        </TabsContent>
      </Tabs>
    </div>
  );
}
