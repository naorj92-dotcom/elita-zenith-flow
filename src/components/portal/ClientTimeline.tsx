import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar, CheckCircle2, Clock, XCircle, AlertCircle, Star, Package, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DEMO_APPOINTMENTS, DEMO_PACKAGES, DEMO_PHOTOS } from '@/hooks/useDemoData';

interface TimelineEvent {
  id: string;
  type: 'appointment' | 'package' | 'photo';
  date: string;
  title: string;
  subtitle?: string;
  status?: string;
  icon: React.ReactNode;
  iconBg: string;
}

export function ClientTimeline() {
  const { client, isDemo } = useClientAuth();

  const { data: appointments } = useQuery({
    queryKey: ['client-timeline-appointments', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_APPOINTMENTS;
      if (!client?.id) return [];
      const { data } = await supabase
        .from('appointments')
        .select('*, services(*), staff(*)')
        .eq('client_id', client.id)
        .order('scheduled_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!client?.id || isDemo,
  });

  const { data: packages } = useQuery({
    queryKey: ['client-timeline-packages', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_PACKAGES;
      if (!client?.id) return [];
      const { data } = await supabase
        .from('client_packages')
        .select('*, packages(*)')
        .eq('client_id', client.id)
        .order('purchase_date', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!client?.id || isDemo,
  });

  const { data: photos } = useQuery({
    queryKey: ['client-timeline-photos', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_PHOTOS;
      if (!client?.id) return [];
      const { data } = await supabase
        .from('before_after_photos')
        .select('*, services(*)')
        .eq('client_id', client.id)
        .eq('is_visible_to_client', true)
        .order('taken_date', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!client?.id || isDemo,
  });

  // Build timeline events
  const events: TimelineEvent[] = [];

  // Add appointments
  appointments?.forEach((apt) => {
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'completed':
          return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        case 'cancelled':
        case 'no_show':
          return <XCircle className="h-4 w-4 text-red-500" />;
        case 'confirmed':
          return <Star className="h-4 w-4 text-blue-500" />;
        default:
          return <Clock className="h-4 w-4 text-muted-foreground" />;
      }
    };

    events.push({
      id: apt.id,
      type: 'appointment',
      date: apt.scheduled_at,
      title: apt.services?.name || 'Appointment',
      subtitle: apt.staff ? `with ${apt.staff.first_name} ${apt.staff.last_name}` : undefined,
      status: apt.status,
      icon: getStatusIcon(apt.status),
      iconBg: apt.status === 'completed' ? 'bg-green-100' : apt.status === 'cancelled' ? 'bg-red-100' : 'bg-primary/10',
    });
  });

  // Add packages
  packages?.forEach((pkg) => {
    events.push({
      id: pkg.id,
      type: 'package',
      date: pkg.purchase_date,
      title: `Purchased: ${pkg.packages?.name || 'Package'}`,
      subtitle: `${pkg.sessions_total} sessions`,
      icon: <Package className="h-4 w-4 text-primary" />,
      iconBg: 'bg-primary/10',
    });
  });

  // Add photos
  photos?.forEach((photo) => {
    events.push({
      id: photo.id,
      type: 'photo',
      date: photo.taken_date,
      title: 'Progress Photo Added',
      subtitle: photo.services?.name || 'Treatment',
      icon: <Image className="h-4 w-4 text-primary" />,
      iconBg: 'bg-primary/10',
    });
  });

  // Sort by date (newest first)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Completed</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Confirmed</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="text-muted-foreground">Scheduled</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">Cancelled</Badge>;
      case 'no_show':
        return <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!events.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {events.slice(0, 15).map((event, index) => (
          <div key={event.id} className="relative flex gap-4 pl-2">
            {/* Icon */}
            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${event.iconBg} border bg-background`}>
              {event.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{event.title}</p>
                  {event.subtitle && (
                    <p className="text-sm text-muted-foreground">{event.subtitle}</p>
                  )}
                </div>
                {getStatusBadge(event.status)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(event.date), 'EEEE, MMM d, yyyy')} at {format(new Date(event.date), 'h:mm a')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}