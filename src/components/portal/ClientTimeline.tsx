import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isValid } from 'date-fns';
import { Calendar, CheckCircle2, Clock, XCircle, Star, Package, Image, DollarSign, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  type: 'appointment' | 'package' | 'photo' | 'payment' | 'form';
  date: string;
  title: string;
  subtitle?: string;
  status?: string;
  amount?: number;
  icon: React.ReactNode;
  iconBg: string;
  typeLabel: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  appointment: { label: 'Appointment', color: 'text-primary bg-primary/10' },
  package: { label: 'Package', color: 'text-info bg-info/10' },
  photo: { label: 'Photo', color: 'text-success bg-success/10' },
  payment: { label: 'Payment', color: 'text-warning bg-warning/10' },
  form: { label: 'Form', color: 'text-muted-foreground bg-muted' },
};

export function ClientTimeline() {
  const { client } = useClientAuth();

  const { data: appointments } = useQuery({
    queryKey: ['client-timeline-appointments', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('appointments')
        .select('*, services(*), staff(*)')
        .eq('client_id', client.id)
        .order('scheduled_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!client?.id,
  });

  const { data: packages } = useQuery({
    queryKey: ['client-timeline-packages', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('client_packages')
        .select('*, packages(*)')
        .eq('client_id', client.id)
        .order('purchase_date', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!client?.id,
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
          return <CheckCircle2 className="h-4 w-4 text-success" />;
        case 'cancelled':
        case 'no_show':
          return <XCircle className="h-4 w-4 text-destructive" />;
        case 'confirmed':
          return <Star className="h-4 w-4 text-primary" />;
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
      amount: apt.total_amount,
      icon: getStatusIcon(apt.status),
      iconBg: apt.status === 'completed' ? 'bg-success/10 border-success/20' : apt.status === 'cancelled' ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20',
      typeLabel: 'appointment',
    });
  });

  // Add packages
  packages?.forEach((pkg) => {
    events.push({
      id: pkg.id,
      type: 'package',
      date: pkg.purchase_date,
      title: pkg.packages?.name || 'Package',
      subtitle: `${pkg.sessions_used}/${pkg.sessions_total} sessions used`,
      icon: <Package className="h-4 w-4 text-info" />,
      iconBg: 'bg-info/10 border-info/20',
      typeLabel: 'package',
    });
  });

  // Add photos
  photos?.forEach((photo) => {
    events.push({
      id: photo.id,
      type: 'photo',
      date: photo.taken_date,
      title: 'Progress Photo',
      subtitle: photo.services?.name || 'Treatment',
      icon: <Image className="h-4 w-4 text-success" />,
      iconBg: 'bg-success/10 border-success/20',
      typeLabel: 'photo',
    });
  });

  // Sort by date (newest first)
  events.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (!isValid(dateA)) return 1;
    if (!isValid(dateB)) return -1;
    return dateB.getTime() - dateA.getTime();
  });

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const config: Record<string, { className: string; label: string }> = {
      completed: { className: 'bg-success/10 text-success border-success/20', label: 'Completed' },
      confirmed: { className: 'bg-primary/10 text-primary border-primary/20', label: 'Confirmed' },
      scheduled: { className: 'bg-muted text-muted-foreground border-border', label: 'Scheduled' },
      cancelled: { className: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Cancelled' },
      no_show: { className: 'bg-warning/10 text-warning border-warning/20', label: 'No Show' },
    };
    const statusConfig = config[status] || { className: 'bg-muted text-muted-foreground border-border', label: status };
    return (
      <Badge variant="outline" className={cn('text-xs rounded-full', statusConfig.className)}>
        {statusConfig.label}
      </Badge>
    );
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (!isValid(date)) return 'Date unavailable';
      return format(date, 'EEEE, MMM d, yyyy');
    } catch {
      return 'Date unavailable';
    }
  };

  const formatEventTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (!isValid(date)) return '';
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  };

  if (!events.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Calendar className="h-8 w-8 opacity-50" />
        </div>
        <h3 className="font-medium text-foreground mb-1">No activity yet</h3>
        <p className="text-sm">Your journey with us will appear here</p>
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
            <div className={cn(
              "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background",
              event.iconBg
            )}>
              {event.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  {/* Type tag */}
                  <span className={cn(
                    'inline-block text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded mb-1',
                    TYPE_CONFIG[event.type]?.color || 'bg-muted text-muted-foreground'
                  )}>
                    {TYPE_CONFIG[event.type]?.label || event.type}
                  </span>
                  <p className="font-medium text-foreground">{event.title}</p>
                  {event.subtitle && (
                    <p className="text-sm text-muted-foreground">{event.subtitle}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(event.status)}
                  {event.amount && event.amount > 0 && (
                    <span className="text-sm font-medium text-foreground">${event.amount}</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatEventDate(event.date)}
                {event.type === 'appointment' && ` at ${formatEventTime(event.date)}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}