import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar, Clock, User, CheckCircle2, Eye } from 'lucide-react';
import { DEMO_APPOINTMENTS } from '@/hooks/useDemoData';

export function ClientHistoryPage() {
  const { client, isDemo } = useClientAuth();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['client-history', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return DEMO_APPOINTMENTS;
      }
      if (!client?.id) return [];
      const { data } = await supabase
        .from('appointments')
        .select('*, services(*), staff(*)')
        .eq('client_id', client.id)
        .order('scheduled_at', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id || isDemo,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="status-completed">Completed</Badge>;
      case 'confirmed':
      case 'scheduled':
        return <Badge className="status-confirmed">{status}</Badge>;
      case 'cancelled':
      case 'no_show':
        return <Badge className="status-cancelled">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pastAppointments = appointments?.filter(a => 
    new Date(a.scheduled_at) < new Date() || a.status === 'completed'
  ) || [];
  
  const upcomingAppointments = appointments?.filter(a => 
    new Date(a.scheduled_at) >= new Date() && 
    !['completed', 'cancelled', 'no_show'].includes(a.status)
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Treatment History</h1>
        <p className="text-muted-foreground mt-1">Your complete appointment history</p>
      </div>

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <Eye className="h-5 w-5 text-primary" />
          <p className="text-sm">Viewing demo appointment history</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="card-luxury">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : appointments?.length === 0 ? (
        <Card className="card-luxury">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Appointments Yet</h3>
            <p className="text-muted-foreground">
              Your treatment history will appear here after your first visit
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming Appointments */}
          {upcomingAppointments.length > 0 && (
            <section>
              <h2 className="text-xl font-heading font-medium mb-4">Upcoming</h2>
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => (
                  <Card key={apt.id} className="card-luxury border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{apt.services?.name || 'Appointment'}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(apt.scheduled_at), 'EEEE, MMMM d, yyyy')}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                <span>{format(new Date(apt.scheduled_at), 'h:mm a')}</span>
                              </div>
                              {apt.staff && (
                                <div className="flex items-center gap-1.5">
                                  <User className="h-4 w-4" />
                                  <span>{apt.staff.first_name} {apt.staff.last_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Past Appointments */}
          {pastAppointments.length > 0 && (
            <section>
              <h2 className="text-xl font-heading font-medium mb-4">Past Visits</h2>
              <div className="space-y-3">
                {pastAppointments.map((apt) => (
                  <Card key={apt.id} className="card-luxury">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                            {apt.status === 'completed' ? (
                              <CheckCircle2 className="h-6 w-6 text-success" />
                            ) : (
                              <Calendar className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{apt.services?.name || 'Appointment'}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(apt.scheduled_at), 'MMMM d, yyyy')}</span>
                              </div>
                              {apt.staff && (
                                <div className="flex items-center gap-1.5">
                                  <User className="h-4 w-4" />
                                  <span>{apt.staff.first_name} {apt.staff.last_name}</span>
                                </div>
                              )}
                              {apt.total_amount > 0 && (
                                <span className="font-medium text-foreground">${apt.total_amount}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
