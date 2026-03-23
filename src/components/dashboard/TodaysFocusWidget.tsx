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
          items.push({ id: 'no-rebook', icon: UserX, title: `${notRebooked.length} client${notRebooked.length > 1 ? 's' : ''} didn't rebook`, description: 'Follow up to maintain their treatment schedule', type: 'alert', actionLabel: 'View Clients', actionHref: '/clients' });
        }
      }

      if (now.getHours() < 17) {
        const { count: remaining } = await supabase.from('appointments').select('id', { count: 'exact', head: true })
          .gte('scheduled_at', now.toISOString()).lte('scheduled_at', todayEnd.toISOString()).in('status', ['scheduled', 'confirmed']);
        if ((remaining || 0) < 3) {
          items.push({ id: 'open-slots', icon: Clock, title: 'Open slots this afternoon', description: 'Consider reaching out to waitlisted clients', type: 'insight', actionLabel: 'View Waitlist', actionHref: '/waitlist' });
        }
      }

      const { count: cancelledCount } = await supabase.from('appointments').select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled').gte('updated_at', today.toISOString()).lte('updated_at', todayEnd.toISOString());
      if (cancelledCount && cancelledCount > 0) {
        items.push({ id: 'cancellations', icon: CalendarX, title: `${cancelledCount} cancellation${cancelledCount > 1 ? 's' : ''} today`, description: 'These slots can be filled from the waitlist', type: 'alert', actionLabel: 'View Schedule', actionHref: '/schedule' });
      }

      const { data: todaysServices } = await supabase.from('appointments').select('services(name)')
        .gte('scheduled_at', today.toISOString()).lte('scheduled_at', todayEnd.toISOString())
        .in('status', ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed']);
      if (todaysServices && todaysServices.length > 0) {
        const serviceCounts: Record<string, number> = {};
        todaysServices.forEach((a: any) => { const name = a.services?.name; if (name) serviceCounts[name] = (serviceCounts[name] || 0) + 1; });
        const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];
        if (topService) {
          items.push({ id: 'top-service', icon: TrendingUp, title: `Top treatment: ${topService[0]}`, description: `${topService[1]} session${topService[1] > 1 ? 's' : ''} booked today`, type: 'insight' });
        }
      }

      return items.slice(0, 4);
    },
    refetchInterval: 60000,
  });

  if (focusItems.length === 0) return null;

  const typeStyles = {
    alert: 'border-l-warning bg-warning/5',
    insight: 'border-l-primary bg-primary/5',
    action: 'border-l-success bg-success/5',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Today's Focus</h2>
            <p className="text-xs text-muted-foreground">What needs your attention right now</p>
          </div>
        </div>

        <div className="space-y-3">
          {focusItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className={cn(
                'flex items-start gap-4 p-5 rounded-2xl border-l-4 transition-all duration-300',
                typeStyles[item.type]
              )}
            >
              <item.icon className={cn(
                'w-5 h-5 shrink-0 mt-0.5',
                item.type === 'alert' ? 'text-warning' : item.type === 'insight' ? 'text-primary' : 'text-success'
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                {item.actionLabel && item.actionHref && (
                  <Link to={item.actionHref}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-0 mt-2 gap-1 text-primary hover:text-primary/80 hover:bg-transparent">
                      {item.actionLabel} <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
