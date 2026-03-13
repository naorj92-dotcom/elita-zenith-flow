import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, ShoppingCart, MessageSquare, CalendarClock, 
  Package, AlertTriangle, Megaphone, CheckCircle2, X,
  Filter
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

type NotificationType = 'purchase_request' | 'message' | 'reschedule' | 'inventory' | 'announcement';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  time: string;
  read: boolean;
  priority?: 'high' | 'normal' | 'low';
  actionLabel?: string;
  actionHref?: string;
}

export function StaffNotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hasNewFlash, setHasNewFlash] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('elita-dismissed-notifs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  // Fetch purchase requests
  const { data: purchaseRequests } = useQuery({
    queryKey: ['staff-notif-purchases'],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchase_requests' as any)
        .select('*, clients(first_name, last_name)')
        .eq('status', 'interested')
        .order('created_at', { ascending: false })
        .limit(15);
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
        .limit(15);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch recent cancelled/no-show appointments (last 24h)
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
        .limit(15);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch low inventory products
  const { data: lowInventory } = useQuery({
    queryKey: ['staff-notif-inventory'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, quantity_in_stock, reorder_level')
        .eq('is_active', true)
        .limit(50);
      return (data || []).filter((p: any) => p.quantity_in_stock <= p.reorder_level);
    },
    refetchInterval: 60000,
  });

  // Fetch recent announcements
  const { data: announcements } = useQuery({
    queryKey: ['staff-notif-announcements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_announcements')
        .select('*')
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: 60000,
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
  const allNotifications: NotificationItem[] = [
    ...(purchaseRequests || []).map((r: any) => ({
      id: `pr-${r.id}`,
      type: 'purchase_request' as const,
      title: `${r.clients?.first_name} ${r.clients?.last_name}`,
      subtitle: r.notes?.replace('PURCHASE REQUEST: ', '📦 ').replace('INTEREST: ', '💬 ') || 'Package/Membership interest',
      time: r.created_at,
      read: false,
      priority: 'high' as const,
      actionLabel: 'View Request',
      actionHref: '/admin/packages',
    })),
    ...(unreadMessages || []).map((m: any) => ({
      id: `msg-${m.id}`,
      type: 'message' as const,
      title: `${m.clients?.first_name} ${m.clients?.last_name}`,
      subtitle: m.body?.slice(0, 80) + (m.body?.length > 80 ? '…' : '') || 'New message',
      time: m.created_at,
      read: false,
      priority: 'normal' as const,
      actionLabel: 'Reply',
      actionHref: '/admin/messages',
    })),
    ...(recentChanges || []).map((a: any) => ({
      id: `appt-${a.id}`,
      type: 'reschedule' as const,
      title: `${a.clients?.first_name} ${a.clients?.last_name}`,
      subtitle: `${a.status === 'cancelled' ? 'Cancelled' : 'No-show'}: ${a.services?.name || 'Appointment'}`,
      time: a.updated_at,
      read: false,
      priority: a.status === 'no_show' ? 'high' as const : 'normal' as const,
    })),
    ...(lowInventory || []).map((p: any) => ({
      id: `inv-${p.id}`,
      type: 'inventory' as const,
      title: p.name,
      subtitle: `${p.quantity_in_stock} remaining (reorder at ${p.reorder_level})`,
      time: new Date().toISOString(),
      read: false,
      priority: p.quantity_in_stock === 0 ? 'high' as const : 'normal' as const,
      actionLabel: 'Manage',
      actionHref: '/admin/products',
    })),
    ...(announcements || []).map((a: any) => ({
      id: `ann-${a.id}`,
      type: 'announcement' as const,
      title: a.title,
      subtitle: a.body?.slice(0, 100) + (a.body?.length > 100 ? '…' : ''),
      time: a.created_at,
      read: false,
      priority: a.priority === 'urgent' ? 'high' as const : 'normal' as const,
    })),
  ]
    .filter(n => !dismissedIds.has(n.id))
    .sort((a, b) => {
      // High priority first, then by time
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

  const totalCount = allNotifications.length;
  const highPriorityCount = allNotifications.filter(n => n.priority === 'high').length;

  const dismiss = (id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('elita-dismissed-notifs', JSON.stringify([...next]));
      return next;
    });
  };

  const clearAll = () => {
    const allIds = allNotifications.map(n => n.id);
    setDismissedIds(prev => {
      const next = new Set([...prev, ...allIds]);
      localStorage.setItem('elita-dismissed-notifs', JSON.stringify([...next]));
      return next;
    });
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'purchase_request': return <ShoppingCart className="h-4 w-4 text-primary" />;
      case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'reschedule': return <CalendarClock className="h-4 w-4 text-warning" />;
      case 'inventory': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'announcement': return <Megaphone className="h-4 w-4 text-primary" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'purchase_request': return 'Purchase';
      case 'message': return 'Message';
      case 'reschedule': return 'Schedule';
      case 'inventory': return 'Inventory';
      case 'announcement': return 'Announcement';
    }
  };

  const filterByType = (items: NotificationItem[], type?: NotificationType) => {
    return type ? items.filter(n => n.type === type) : items;
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (val) setHasNewFlash(false); }}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-lg transition-colors hover:bg-accent",
            hasNewFlash && "animate-pulse"
          )}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {totalCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1",
              highPriorityCount > 0 
                ? "bg-destructive text-destructive-foreground" 
                : "bg-primary text-primary-foreground"
            )}>
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Notifications</SheetTitle>
            {totalCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          {highPriorityCount > 0 && (
            <p className="text-xs text-destructive font-medium">
              {highPriorityCount} urgent {highPriorityCount === 1 ? 'alert' : 'alerts'}
            </p>
          )}
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-4 h-9">
            <TabsTrigger value="all" className="text-xs">
              All
              {totalCount > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{totalCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs">Schedule</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 m-0 mt-2">
            <NotificationList 
              items={allNotifications} 
              getIcon={getIcon} 
              getTypeLabel={getTypeLabel}
              onDismiss={dismiss} 
            />
          </TabsContent>
          <TabsContent value="messages" className="flex-1 m-0 mt-2">
            <NotificationList 
              items={filterByType(allNotifications, 'message')} 
              getIcon={getIcon}
              getTypeLabel={getTypeLabel}
              onDismiss={dismiss} 
            />
          </TabsContent>
          <TabsContent value="schedule" className="flex-1 m-0 mt-2">
            <NotificationList 
              items={allNotifications.filter(n => ['reschedule', 'purchase_request'].includes(n.type))} 
              getIcon={getIcon}
              getTypeLabel={getTypeLabel}
              onDismiss={dismiss} 
            />
          </TabsContent>
          <TabsContent value="alerts" className="flex-1 m-0 mt-2">
            <NotificationList 
              items={allNotifications.filter(n => ['inventory', 'announcement'].includes(n.type))} 
              getIcon={getIcon}
              getTypeLabel={getTypeLabel}
              onDismiss={dismiss} 
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function NotificationList({ 
  items, 
  getIcon, 
  getTypeLabel,
  onDismiss 
}: { 
  items: NotificationItem[]; 
  getIcon: (type: NotificationType) => React.ReactNode;
  getTypeLabel: (type: NotificationType) => string;
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">All caught up!</p>
        <p className="text-xs text-muted-foreground mt-1">No notifications in this category</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
      <div className="px-2">
        <AnimatePresence mode="popLayout">
          {items.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-start gap-3 px-3 py-3 mx-1 mb-1 rounded-lg transition-colors hover:bg-accent/50 group",
                n.priority === 'high' && "bg-destructive/5 border border-destructive/10"
              )}
            >
              <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                    {getTypeLabel(n.type)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.subtitle}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={() => onDismiss(n.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
