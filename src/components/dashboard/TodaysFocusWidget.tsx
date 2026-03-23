import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Lightbulb, UserX, Clock, CalendarX, ArrowRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FocusItem {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  type: 'action' | 'insight' | 'alert';
  actionLabel?: string;
  actionHref?: string;
}

export function TodaysFocusWidget() {
  const { data: focusItems = [] } = useQuery({
    queryKey: ['todays-focus'],
    queryFn: async (): Promise<FocusItem[]> => {
      const items: FocusItem[] = [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
      const now = new Date();

      const { data: completedToday } = await supabase.from('appointments').select('client_id')
        .eq('status', 'completed').gte('completed_at', today.toISOString()).lte('completed_at', todayEnd.toISOString());

      if (completedToday && completedToday.length > 0) {
        const clientIds = [...new Set(completedToday.map(a => a.client_id).filter(Boolean))];
        const { data: futureApts } = await supabase.from('appointments').select('client_id')
          .in('client_id', clientIds as string[]).gt('scheduled_at', todayEnd.toISOString()).in('status', ['scheduled', 'confirmed']);
        const rebookedIds = new Set((futureApts || []).map(a => a.client_id));
        const notRebooked = clientIds.filter(id => !rebookedIds.has(id));
        if (notRebooked.length > 0) {
          items.push({ id: 'no-rebook', icon: UserX, title: `${notRebooked.length} client${notRebooked.length > 1 ? 's' : ''} without a follow-up`, description: 'Reach out to maintain their schedule', type: 'alert', actionLabel: 'View Clients', actionHref: '/clients' });
        }
      }

      if (now.getHours() < 17) {
        const { count: remaining } = await supabase.from('appointments').select('id', { count: 'exact', head: true })
          .gte('scheduled_at', now.toISOString()).lte('scheduled_at', todayEnd.toISOString()).in('status', ['scheduled', 'confirmed']);
        if ((remaining || 0) < 3) {
          items.push({ id: 'open-slots', icon: Clock, title: 'Open slots available', description: 'Fill from waitlist or reach out to clients', type: 'insight', actionLabel: 'View Waitlist', actionHref: '/waitlist' });
        }
      }

      const { count: cancelledCount } = await supabase.from('appointments').select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled').gte('updated_at', today.toISOString()).lte('updated_at', todayEnd.toISOString());
      if (cancelledCount && cancelledCount > 0) {
        items.push({ id: 'cancellations', icon: CalendarX, title: `${cancelledCount} cancellation${cancelledCount > 1 ? 's' : ''} today`, description: 'Fill these slots from the waitlist', type: 'alert', actionLabel: 'View Schedule', actionHref: '/schedule' });
      }

      const { data: todaysServices } = await supabase.from('appointments').select('services(name)')
        .gte('scheduled_at', today.toISOString()).lte('scheduled_at', todayEnd.toISOString())
        .in('status', ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed']);
      if (todaysServices && todaysServices.length > 0) {
        const serviceCounts: Record<string, number> = {};
        todaysServices.forEach((a: any) => { const name = a.services?.name; if (name) serviceCounts[name] = (serviceCounts[name] || 0) + 1; });
        const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];
        if (topService) {
          items.push({ id: 'top-service', icon: TrendingUp, title: `Top treatment: ${topService[0]}`, description: `${topService[1]} session${topService[1] > 1 ? 's' : ''} today`, type: 'insight' });
        }
      }

      return items.slice(0, 4);
    },
    refetchInterval: 60000,
  });

  if (focusItems.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-elita-camel/10 flex items-center justify-center">
          <Lightbulb className="w-3.5 h-3.5 text-elita-camel" />
        </div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.25em]">Today's Action Items</p>
      </div>

      <div className="space-y-2.5">
        {focusItems.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Card className={cn(
              'overflow-hidden',
              item.type === 'alert' && 'border-warning/20',
            )}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  item.type === 'alert' ? 'bg-warning/10' : 'bg-elita-camel/10'
                )}>
                  <item.icon className={cn(
                    'w-4 h-4',
                    item.type === 'alert' ? 'text-warning' : 'text-elita-camel'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  {item.actionLabel && item.actionHref && (
                    <Link to={item.actionHref}>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-0 mt-2 gap-1 text-elita-camel hover:text-elita-camel/80 hover:bg-transparent">
                        {item.actionLabel} <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
