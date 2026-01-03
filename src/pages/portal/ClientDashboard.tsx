import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar, Package, Image, ShoppingBag, Sparkles, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ClientDashboard() {
  const { client } = useClientAuth();

  // Fetch next appointment
  const { data: nextAppointment } = useQuery({
    queryKey: ['client-next-appointment', client?.id],
    queryFn: async () => {
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
    enabled: !!client?.id,
  });

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

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-sage rounded-2xl p-8 text-primary-foreground">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-6 w-6" />
          <span className="text-sm font-medium opacity-90">Welcome back</span>
        </div>
        <h1 className="text-3xl font-heading font-semibold">
          {client?.first_name} {client?.last_name}
        </h1>
        {client?.is_vip && (
          <Badge className="mt-3 bg-elita-gold/20 text-primary-foreground border-elita-gold/30">
            VIP Member
          </Badge>
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
                  {format(new Date(nextAppointment.scheduled_at), 'EEEE, MMMM d, yyyy')} at{' '}
                  {format(new Date(nextAppointment.scheduled_at), 'h:mm a')}
                </p>
                <p className="text-sm text-muted-foreground">
                  with {nextAppointment.staff?.first_name} {nextAppointment.staff?.last_name}
                </p>
              </div>
              <Badge className="status-confirmed">{nextAppointment.status}</Badge>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No upcoming appointments</p>
              <Link to="/portal/book">
                <Button>Schedule Your Next Visit</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
