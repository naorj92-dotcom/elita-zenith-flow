import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { 
  Bell, Calendar, Tag, Gift, MessageSquare, 
  Clock, CheckCircle2, X, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isAfter, addHours } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ClientNotification {
  id: string;
  type: 'appointment' | 'deal' | 'message' | 'membership' | 'form';
  title: string;
  subtitle: string;
  time: string;
  icon: React.ElementType;
  iconClass: string;
}

export function ClientNotificationBell() {
  const { client } = useClientAuth();
  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('elita-client-dismissed-notifs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  // Upcoming appointments (next 48 hours)
  const { data: upcomingAppts } = useQuery({
    queryKey: ['client-notif-appts', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const now = new Date().toISOString();
      const in48h = addHours(new Date(), 48).toISOString();
      const { data } = await supabase
        .from('appointments')
        .select('id, scheduled_at, services(name)')
        .eq('client_id', client.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', now)
        .lte('scheduled_at', in48h)
        .order('scheduled_at', { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: !!client?.id,
    refetchInterval: 60000,
  });

  // Active deals
  const { data: activeDeals } = useQuery({
    queryKey: ['client-notif-deals'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('exclusive_deals')
        .select('id, title, expires_at')
        .eq('is_active', true)
        .lte('starts_at', now)
        .gte('expires_at', now)
        .order('expires_at', { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: !!client?.id,
    refetchInterval: 120000,
  });

  // Unread messages from staff
  const { data: unreadMsgs } = useQuery({
    queryKey: ['client-notif-msgs', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('messages')
        .select('id, body, created_at')
        .eq('client_id', client.id)
        .eq('sender_type', 'staff')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!client?.id,
    refetchInterval: 30000,
  });

  // Pending forms
  const { data: pendingForms } = useQuery({
    queryKey: ['client-notif-forms', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('client_forms')
        .select('id, created_at, forms(name)')
        .eq('client_id', client.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!client?.id,
    refetchInterval: 60000,
  });

  const notifications: ClientNotification[] = [
    ...(upcomingAppts || []).map((a: any) => ({
      id: `appt-${a.id}`,
      type: 'appointment' as const,
      title: 'Upcoming Appointment',
      subtitle: `${a.services?.name || 'Treatment'} — ${new Date(a.scheduled_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(a.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      time: a.scheduled_at,
      icon: Calendar,
      iconClass: 'text-primary',
    })),
    ...(activeDeals || []).map((d: any) => ({
      id: `deal-${d.id}`,
      type: 'deal' as const,
      title: '🔥 Exclusive Deal',
      subtitle: `${d.title} — Expires ${formatDistanceToNow(new Date(d.expires_at), { addSuffix: true })}`,
      time: d.expires_at,
      icon: Tag,
      iconClass: 'text-warning',
    })),
    ...(unreadMsgs || []).map((m: any) => ({
      id: `msg-${m.id}`,
      type: 'message' as const,
      title: 'New Message',
      subtitle: m.body?.slice(0, 80) + (m.body?.length > 80 ? '…' : ''),
      time: m.created_at,
      icon: MessageSquare,
      iconClass: 'text-blue-500',
    })),
    ...(pendingForms || []).map((f: any) => ({
      id: `form-${f.id}`,
      type: 'form' as const,
      title: 'Form Required',
      subtitle: `Please complete: ${(f as any).forms?.name || 'Required Form'}`,
      time: f.created_at,
      icon: Sparkles,
      iconClass: 'text-primary',
    })),
  ]
    .filter(n => !dismissedIds.has(n.id))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const totalCount = notifications.length;

  const dismiss = (id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('elita-client-dismissed-notifs', JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-lg transition-colors hover:bg-accent">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-lg">Notifications</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">You're all set!</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications</p>
            </div>
          ) : (
            <div className="px-2 py-2">
              <AnimatePresence mode="popLayout">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      className="flex items-start gap-3 px-3 py-3 mx-1 mb-1 rounded-lg hover:bg-accent/50 transition-colors group"
                    >
                      <div className="mt-0.5 shrink-0">
                        <Icon className={cn("h-4 w-4", n.iconClass)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.subtitle}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                        </p>
                      </div>
                      <button
                        onClick={() => dismiss(n.id)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all shrink-0"
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
