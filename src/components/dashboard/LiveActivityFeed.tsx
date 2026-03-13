import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  UserCheck, 
  CalendarPlus, 
  CheckCircle2, 
  DollarSign,
  Clock,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'check_in' | 'completed' | 'booked' | 'cancelled' | 'transaction';
  description: string;
  timestamp: string;
  meta?: string;
}

const activityConfig = {
  check_in: { icon: UserCheck, color: 'text-info', bg: 'bg-info/10' },
  completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  booked: { icon: CalendarPlus, color: 'text-primary', bg: 'bg-primary/10' },
  cancelled: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  transaction: { icon: DollarSign, color: 'text-warning', bg: 'bg-warning/10' },
};

export function LiveActivityFeed() {
  const [liveItems, setLiveItems] = useState<ActivityItem[]>([]);

  const { data: initialItems = [] } = useQuery({
    queryKey: ['live-activity-feed'],
    queryFn: async (): Promise<ActivityItem[]> => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const items: ActivityItem[] = [];

      // Recent appointment status changes
      const { data: recentAppts } = await supabase
        .from('appointments')
        .select(`
          id, status, updated_at, checked_in_at, completed_at,
          clients (first_name, last_name),
          services (name)
        `)
        .gte('updated_at', twoHoursAgo)
        .in('status', ['checked_in', 'completed', 'cancelled', 'scheduled'])
        .order('updated_at', { ascending: false })
        .limit(15);

      (recentAppts || []).forEach((apt: any) => {
        const clientName = apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'Client';
        const serviceName = apt.services?.name || 'Service';

        if (apt.status === 'checked_in' && apt.checked_in_at) {
          items.push({
            id: `ci-${apt.id}`,
            type: 'check_in',
            description: `${clientName} checked in`,
            timestamp: apt.checked_in_at,
            meta: serviceName,
          });
        } else if (apt.status === 'completed' && apt.completed_at) {
          items.push({
            id: `co-${apt.id}`,
            type: 'completed',
            description: `${clientName}'s treatment completed`,
            timestamp: apt.completed_at,
            meta: serviceName,
          });
        } else if (apt.status === 'cancelled') {
          items.push({
            id: `ca-${apt.id}`,
            type: 'cancelled',
            description: `${clientName} cancelled`,
            timestamp: apt.updated_at,
            meta: serviceName,
          });
        }
      });

      // Recent transactions
      const { data: recentTxns } = await supabase
        .from('transactions')
        .select('id, amount, transaction_type, created_at, description')
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      (recentTxns || []).forEach(txn => {
        items.push({
          id: `tx-${txn.id}`,
          type: 'transaction',
          description: `$${Number(txn.amount).toLocaleString()} ${txn.transaction_type} sale`,
          timestamp: txn.created_at,
          meta: txn.description || undefined,
        });
      });

      return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    setLiveItems(initialItems);
  }, [initialItems]);

  // Realtime: listen for new appointment changes
  useEffect(() => {
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
      }, async (payload) => {
        const apt = payload.new as any;
        if (!['checked_in', 'completed', 'cancelled'].includes(apt.status)) return;

        // Fetch client name
        const { data: client } = await supabase
          .from('clients')
          .select('first_name, last_name')
          .eq('id', apt.client_id)
          .single();

        const clientName = client ? `${client.first_name} ${client.last_name}` : 'Client';
        const typeMap: Record<string, ActivityItem['type']> = {
          checked_in: 'check_in',
          completed: 'completed',
          cancelled: 'cancelled',
        };

        const newItem: ActivityItem = {
          id: `live-${apt.id}-${Date.now()}`,
          type: typeMap[apt.status] || 'check_in',
          description: apt.status === 'checked_in' 
            ? `${clientName} checked in`
            : apt.status === 'completed'
              ? `${clientName}'s treatment completed`
              : `${clientName} cancelled`,
          timestamp: new Date().toISOString(),
        };

        setLiveItems(prev => [newItem, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Live Activity
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-2 h-2 rounded-full bg-success"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {liveItems.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">Activity will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {liveItems.map((item, index) => {
                const config = activityConfig[item.type];
                const Icon = config.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", config.bg)}>
                      <Icon className={cn("w-3.5 h-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{item.description}</p>
                      {item.meta && (
                        <p className="text-xs text-muted-foreground truncate">{item.meta}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
