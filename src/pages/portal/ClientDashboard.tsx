import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isValid } from 'date-fns';
import { Calendar, Package, Image, ShoppingBag, Sparkles, Clock, ChevronRight, Eye, History, Crown, Flag, Gift, TrendingUp, FileText, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  DEMO_PACKAGES, 
  DEMO_APPOINTMENTS, 
  DEMO_PHOTOS, 
  DEMO_PRODUCT_RECOMMENDATIONS, 
  DEMO_SERVICE_RECOMMENDATIONS 
} from '@/hooks/useDemoData';
import { LoyaltyPointsWidget } from '@/components/portal/LoyaltyPointsWidget';
import { MembershipStatusWidget } from '@/components/portal/MembershipStatusWidget';
import { ClientTimeline } from '@/components/portal/ClientTimeline';
import { ClientNotesFlags } from '@/components/portal/ClientNotesFlags';
import { MembershipBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';

export function ClientDashboard() {
  const { client, isDemo } = useClientAuth();

  // Fetch next appointment
  const { data: nextAppointment } = useQuery({
    queryKey: ['client-next-appointment', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        const upcoming = DEMO_APPOINTMENTS.filter(
          a => new Date(a.scheduled_at) > new Date() && ['scheduled', 'confirmed'].includes(a.status)
        );
        return upcoming[0] || null;
      }
      if (!client?.id) return null;
      const { data } = await supabase
        .from('appointments')
        .select('*, services(*), staff(*)')
        .eq('client_id', client.id)
        .gte('scheduled_at', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!client?.id || isDemo,
  });

  // Fetch active packages count
  const { data: packagesCount } = useQuery({
    queryKey: ['client-packages-count', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return DEMO_PACKAGES.filter(p => p.status === 'active').length;
      }
      if (!client?.id) return 0;
      const { count } = await supabase
        .from('client_packages')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!client?.id || isDemo,
  });

  // Fetch photos count
  const { data: photosCount } = useQuery({
    queryKey: ['client-photos-count', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return DEMO_PHOTOS.length;
      }
      if (!client?.id) return 0;
      const { count } = await supabase
        .from('before_after_photos')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('is_visible_to_client', true);
      return count || 0;
    },
    enabled: !!client?.id || isDemo,
  });

  // Fetch recommendations count
  const { data: recommendationsCount } = useQuery({
    queryKey: ['client-recommendations-count', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        const productRecs = DEMO_PRODUCT_RECOMMENDATIONS.filter(r => !r.is_purchased).length;
        const serviceRecs = DEMO_SERVICE_RECOMMENDATIONS.filter(r => !r.is_booked).length;
        return productRecs + serviceRecs;
      }
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
    enabled: !!client?.id || isDemo,
  });

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <Eye className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-sm">Demo Mode</p>
            <p className="text-xs text-muted-foreground">You're viewing sample data. Sign up to access your real account.</p>
          </div>
        </div>
      )}

      {/* Welcome Header */}
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

      {/* Next Appointment */}
      <Card className="card-luxury">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-heading">Next Appointment</CardTitle>
            <CardDescription>Your upcoming treatment</CardDescription>
          </div>
          <Link to="/portal/book">
            <Button size="sm">Book New</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {nextAppointment ? (
            <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{nextAppointment.services?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    try {
                      const date = new Date(nextAppointment.scheduled_at);
                      return isValid(date) 
                        ? `${format(date, 'EEEE, MMMM d, yyyy')} at ${format(date, 'h:mm a')}`
                        : 'Date pending';
                    } catch {
                      return 'Date pending';
                    }
                  })()}
                </p>
                <p className="text-sm text-muted-foreground">
                  with {nextAppointment.staff?.first_name} {nextAppointment.staff?.last_name}
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info border border-info/20 capitalize">
                {nextAppointment.status}
              </span>
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No upcoming appointments"
              description="Book your next treatment to continue your journey with us."
              actionLabel="Schedule Your Next Visit"
              actionHref="/portal/book"
              compact
            />
          )}
        </CardContent>
      </Card>

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
          {/* Quick Links Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link to="/portal/packages">
              <Card className="card-luxury group cursor-pointer h-full">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">My Packages</h3>
                    <p className="text-sm text-muted-foreground">{packagesCount} active package{packagesCount !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/portal/photos">
              <Card className="card-luxury group cursor-pointer h-full">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Image className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Progress Photos</h3>
                    <p className="text-sm text-muted-foreground">{photosCount} photo{photosCount !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/portal/recommendations">
              <Card className="card-luxury group cursor-pointer h-full">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Recommendations</h3>
                    <p className="text-sm text-muted-foreground">{recommendationsCount} new recommendation{recommendationsCount !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/portal/history">
              <Card className="card-luxury group cursor-pointer h-full">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Treatment History</h3>
                    <p className="text-sm text-muted-foreground">{client?.visit_count || 0} visit{(client?.visit_count || 0) !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Membership & Loyalty Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <MembershipStatusWidget />
            <LoyaltyPointsWidget />
          </div>

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
