import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import {
  Bell, Calendar, CalendarX, FileText, Sparkles,
  Package, UserPlus, CreditCard, AlertTriangle,
  CheckCircle2, X, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const ICON_MAP: Record<string, React.ElementType> = {
  calendar: Calendar,
  'calendar-x': CalendarX,
  'file-text': FileText,
  sparkles: Sparkles,
  package: Package,
  'user-plus': UserPlus,
  'credit-card': CreditCard,
  'alert-triangle': AlertTriangle,
  'message-square': MessageSquare,
  bell: Bell,
};

const ICON_COLOR_MAP: Record<string, string> = {
  appointment: 'text-primary',
  form: 'text-info',
  skin_analysis: 'text-warning',
  inventory: 'text-destructive',
  client: 'text-success',
  membership: 'text-destructive',
  package: 'text-warning',
  message: 'text-blue-500',
  general: 'text-muted-foreground',
};

export function StaffNotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session } = useUnifiedAuth();
  const userId = session?.user?.id;
  const [open, setOpen] = useState(false);
  const [hasNewFlash, setHasNewFlash] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['staff-notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('recipient_type', 'staff')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });

  // Realtime listener
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('staff-notif-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'in_app_notifications',
        filter: `recipient_type=eq.staff`,
      }, (payload: any) => {
        if (payload.new?.user_id === userId) {
          setHasNewFlash(true);
          queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('in_app_notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await supabase.from('in_app_notifications').update({ is_read: true })
        .eq('user_id', userId).eq('recipient_type', 'staff').eq('is_read', false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-notifications'] }),
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;
  const displayCount = unreadCount > 9 ? '9+' : unreadCount;

  const handleClick = (n: any) => {
    if (!n.is_read) markReadMutation.mutate(n.id);
    if (n.action_url) {
      navigate(n.action_url);
      setOpen(false);
    }
  };

  const getIcon = (n: any) => {
    const Icon = ICON_MAP[n.icon] || Bell;
    const colorClass = ICON_COLOR_MAP[n.category] || 'text-muted-foreground';
    return <Icon className={cn("h-4 w-4", colorClass)} />;
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (val) setHasNewFlash(false); }}>
      <SheetTrigger asChild>
        <button className={cn("relative p-2 rounded-lg transition-colors hover:bg-accent", hasNewFlash && "animate-pulse")}>
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
              {displayCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAllReadMutation.mutate()} className="text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-120px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No notifications</p>
            </div>
          ) : (
            <div className="px-2 py-2">
              <AnimatePresence mode="popLayout">
                {notifications.map((n: any) => (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex items-start gap-3 px-3 py-3 mx-1 mb-1 rounded-lg transition-colors cursor-pointer hover:bg-accent/50 group",
                      !n.is_read && "border-l-2 border-l-warning bg-warning/5"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{getIcon(n)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", !n.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-warning shrink-0 mt-2" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
