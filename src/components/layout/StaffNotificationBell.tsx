import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bell, ShoppingCart, MessageSquare, CalendarClock, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItem {
  id: string;
  type: 'purchase_request' | 'message' | 'reschedule';
  title: string;
  subtitle: string;
  time: string;
  read: boolean;
}

export function StaffNotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hasNewFlash, setHasNewFlash] = useState(false);

  // Fetch purchase requests
  const { data: purchaseRequests } = useQuery({
    queryKey: ['staff-notif-purchases'],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchase_requests' as any)
        .select('*, clients(first_name, last_name)')
        .eq('status', 'interested')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch unread client messages
  const { data: unreadMessages } = useQuery({
    queryKey: ['staff-notif-messages'],
    queryFn: async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, clients(first_name, last_name)')
        .eq('sender_type', 'client')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch recent rescheduled/cancelled appointments (last 24h)
  const { data: recentChanges } = useQuery({
    queryKey: ['staff-notif-appt-changes'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('appointments')
        .select('*, clients(first_name, last_name), services(name)')
        .in('status', ['cancelled', 'no_show'])
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Realtime listeners
  useEffect(() => {
    const channels = [
      supabase
        .channel('notif-purchases')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'purchase_requests' }, () => {
          setHasNewFlash(true);
          queryClient.invalidateQueries({ queryKey: ['staff-notif-purchases'] });
        })
        .subscribe(),
      supabase
        .channel('notif-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          if (payload.new?.sender_type === 'client') {
            setHasNewFlash(true);
            queryClient.invalidateQueries({ queryKey: ['staff-notif-messages'] });
          }
        })
        .subscribe(),
      supabase
        .channel('notif-appts')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, (payload: any) => {
          if (['cancelled', 'no_show'].includes(payload.new?.status)) {
            setHasNewFlash(true);
            queryClient.invalidateQueries({ queryKey: ['staff-notif-appt-changes'] });
          }
        })
        .subscribe(),
    ];
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [queryClient]);

  // Build unified notification list
  const notifications: NotificationItem[] = [
    ...(purchaseRequests || []).map((r: any) => ({
      id: `pr-${r.id}`,
      type: 'purchase_request' as const,
      title: `${r.clients?.first_name} ${r.clients?.last_name}`,
      subtitle: r.notes?.replace('PURCHASE REQUEST: ', '📦 ').replace('INTEREST: ', '💬 ') || 'Package/Membership interest',
      time: r.created_at,
      read: false,
    })),
    ...(unreadMessages || []).map((m: any) => ({
      id: `msg-${m.id}`,
      type: 'message' as const,
      title: `${m.clients?.first_name} ${m.clients?.last_name}`,
      subtitle: m.body?.slice(0, 80) + (m.body?.length > 80 ? '…' : '') || 'New message',
      time: m.created_at,
      read: false,
    })),
    ...(recentChanges || []).map((a: any) => ({
      id: `appt-${a.id}`,
      type: 'reschedule' as const,
      title: `${a.clients?.first_name} ${a.clients?.last_name}`,
      subtitle: `${a.status === 'cancelled' ? 'Cancelled' : 'No-show'}: ${a.services?.name || 'Appointment'}`,
      time: a.updated_at,
      read: false,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const totalCount = notifications.length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'purchase_request': return <ShoppingCart className="h-4 w-4 text-primary" />;
      case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'reschedule': return <CalendarClock className="h-4 w-4 text-warning" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={(val) => { setOpen(val); if (val) setHasNewFlash(false); }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-lg transition-colors hover:bg-accent",
            hasNewFlash && "animate-pulse"
          )}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <span className="text-xs text-muted-foreground">{totalCount} active</span>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              All caught up! 🎉
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.subtitle}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
