import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CalendarX, UserX, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  icon: React.ElementType;
  message: string;
  type: 'warning' | 'info';
}

export function BusinessAlertsWidget() {
  const { data: alerts = [] } = useQuery({
    queryKey: ['business-alerts'],
    queryFn: async (): Promise<Alert[]> => {
      const items: Alert[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Clients who completed today but don't have a future appointment
      const { data: completedToday } = await supabase
        .from('appointments')
        .select('client_id')
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString())
        .lte('completed_at', todayEnd.toISOString());

      if (completedToday && completedToday.length > 0) {
        const clientIds = [...new Set(completedToday.map(a => a.client_id).filter(Boolean))];
        // Check which have future appointments
        const { data: futureApts } = await supabase
          .from('appointments')
          .select('client_id')
          .in('client_id', clientIds as string[])
          .gt('scheduled_at', todayEnd.toISOString())
          .in('status', ['scheduled', 'confirmed']);

        const rebookedIds = new Set((futureApts || []).map(a => a.client_id));
        const notRebooked = clientIds.filter(id => !rebookedIds.has(id));
        if (notRebooked.length > 0) {
          items.push({
            id: 'no-rebook',
            icon: UserX,
            message: `${notRebooked.length} client${notRebooked.length > 1 ? 's' : ''} did not rebook today`,
            type: 'warning',
          });
        }
      }

      // Open slots this afternoon
      const now = new Date();
      if (now.getHours() < 17) {
        const { count: totalAfternoon } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .gte('scheduled_at', now.toISOString())
          .lte('scheduled_at', todayEnd.toISOString())
          .in('status', ['scheduled', 'confirmed']);

        // Simple heuristic: if fewer than 3 appointments remaining today
        if ((totalAfternoon || 0) < 3) {
          items.push({
            id: 'open-slots',
            icon: Clock,
            message: 'Open slots available this afternoon',
            type: 'info',
          });
        }
      }

      // Cancelled today
      const { count: cancelledCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('updated_at', today.toISOString())
        .lte('updated_at', todayEnd.toISOString());

      if (cancelledCount && cancelledCount > 0) {
        items.push({
          id: 'cancellations',
          icon: CalendarX,
          message: `${cancelledCount} cancellation${cancelledCount > 1 ? 's' : ''} today`,
          type: 'warning',
        });
      }

      return items;
    },
    refetchInterval: 60000,
  });

  if (alerts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg text-sm',
              alert.type === 'warning' ? 'bg-warning/10 text-warning-foreground' : 'bg-info/10 text-info-foreground'
            )}
          >
            <alert.icon className={cn('w-4 h-4 shrink-0', alert.type === 'warning' ? 'text-warning' : 'text-info')} />
            <span className="text-foreground">{alert.message}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
