import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, Square, Clock, Users, CalendarPlus, MessageCircle,
  ClipboardList, UserCheck, LayoutDashboard, Receipt, Search,
  ChevronRight, Bell, Package, ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared/StatusBadge';

interface TodaySummary {
  total: number;
  confirmed: number;
  checkedIn: number;
  completed: number;
  unconfirmed: number;
}

interface UpcomingAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  client_name: string;
  client_id: string | null;
  client_avatar: string | null;
  service_name: string;
  staff_name: string;
  is_new: boolean;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export function FrontDeskHome() {
  const { staff, clockStatus, clockIn, clockOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<TodaySummary>({ total: 0, confirmed: 0, checkedIn: 0, completed: 0, unconfirmed: 0 });
  const [upcoming, setUpcoming] = useState<UpcomingAppointment[]>([]);
  const [pendingForms, setPendingForms] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [elapsed, setElapsed] = useState('');

  // Clock elapsed timer
  useEffect(() => {
    if (!clockStatus?.is_clocked_in || !clockStatus.clock_entry?.clock_in) return;
    const update = () => {
      const diff = Date.now() - new Date(clockStatus.clock_entry!.clock_in).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${h}h ${m}m`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [clockStatus]);

  // Fetch today data
  useEffect(() => {
    if (!staff) return;
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const fetchAll = async () => {
      // Appointments summary
      const { data: apts } = await supabase
        .from('appointments')
        .select('id, scheduled_at, status, client_id, staff_id, clients(first_name, last_name, avatar_url, visit_count), services(name), staff(first_name, last_name)')
        .gte('scheduled_at', today.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .neq('status', 'cancelled')
        .neq('status', 'no_show')
        .order('scheduled_at', { ascending: true });

      if (apts) {
        const mapped: UpcomingAppointment[] = apts.map((a: any) => ({
          id: a.id,
          scheduled_at: a.scheduled_at,
          status: a.status,
          client_name: a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : 'Walk-in',
          client_id: a.client_id,
          client_avatar: a.clients?.avatar_url || null,
          service_name: a.services?.name || 'Service',
          staff_name: a.staff ? `${a.staff.first_name} ${a.staff.last_name}` : '',
          is_new: a.clients?.visit_count != null && a.clients.visit_count <= 1,
        }));

        setSummary({
          total: mapped.length,
          confirmed: mapped.filter(a => a.status === 'confirmed').length,
          checkedIn: mapped.filter(a => a.status === 'checked_in').length,
          completed: mapped.filter(a => a.status === 'completed').length,
          unconfirmed: mapped.filter(a => a.status === 'scheduled').length,
        });

        // Next 5 upcoming (not completed)
        const now = new Date();
        setUpcoming(
          mapped
            .filter(a => a.status !== 'completed' && new Date(a.scheduled_at) >= new Date(now.getTime() - 30 * 60000))
            .slice(0, 5)
        );
      }

      // Pending forms count
      const { count: formsCount } = await supabase
        .from('client_forms')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingForms(formsCount || 0);

      // Unread messages
      const { count: msgCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_type', 'client')
        .eq('is_read', false);
      setUnreadMessages(msgCount || 0);
    };

    fetchAll();
  }, [staff]);

  const handleClockToggle = async () => {
    if (clockStatus?.is_clocked_in) {
      const success = await clockOut();
      if (success) toast.success('Clocked out');
    } else {
      const success = await clockIn();
      if (success) toast.success('Clocked in — have a great shift!');
    }
  };

  const quickActions = [
    { label: 'Front Desk Board', href: '/front-desk', icon: LayoutDashboard, accent: true, description: 'Kanban view' },
    { label: 'New Appointment', href: '/schedule', icon: CalendarPlus, accent: true, description: 'Book a client' },
    { label: 'Check-In Kiosk', href: '/check-in', icon: UserCheck, description: 'Self-service kiosk' },
    { label: 'Clients', href: '/clients', icon: Users, description: 'Search & manage' },
    { label: 'Messages', href: '/admin/messages', icon: MessageCircle, badge: unreadMessages, description: 'Client messages' },
    { label: 'Forms', href: '/admin/forms', icon: ClipboardList, badge: pendingForms, description: 'Pending forms' },
    { label: 'Checkout / POS', href: '/pos', icon: Receipt, description: 'Process payments' },
    { label: 'Schedule', href: '/schedule', icon: Clock, description: 'Full calendar' },
  ];

  const statCards = [
    { label: 'Total Today', value: summary.total, icon: CalendarPlus, color: 'text-primary' },
    { label: 'Unconfirmed', value: summary.unconfirmed, icon: Bell, color: 'text-amber-500' },
    { label: 'Checked In', value: summary.checkedIn, icon: UserCheck, color: 'text-sky-500' },
    { label: 'Completed', value: summary.completed, icon: Package, color: 'text-emerald-500' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header + Clock */}
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <Card className="border-border/60 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Front Desk</p>
                <h1 className="font-heading text-xl md:text-2xl text-foreground">
                  Welcome, {staff?.first_name || 'Team'} 👋
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {format(new Date(), 'EEEE, MMMM d')} — {summary.total} appointments today
                </p>
              </div>

              <div className="flex items-center gap-3">
                {clockStatus?.is_clocked_in && (
                  <div className="text-right mr-2">
                    <p className="text-xs text-muted-foreground">Shift time</p>
                    <p className="text-lg font-mono font-semibold text-foreground">{elapsed}</p>
                  </div>
                )}
                <Button
                  size="lg"
                  variant={clockStatus?.is_clocked_in ? 'destructive' : 'default'}
                  className="gap-2 min-w-[140px]"
                  onClick={handleClockToggle}
                  disabled={isLoading}
                >
                  {clockStatus?.is_clocked_in ? (
                    <>
                      <Square className="h-4 w-4" />
                      Clock Out
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Clock In
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-muted')}>
                  <Icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href + action.label} to={action.href}>
                <Card className={cn(
                  'border-border/60 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group h-full',
                  action.accent && 'border-primary/20 bg-primary/[0.03]'
                )}>
                  <CardContent className="p-3.5 flex flex-col gap-2 relative">
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                        action.accent ? 'bg-primary/10 group-hover:bg-primary/20' : 'bg-muted group-hover:bg-primary/10'
                      )}>
                        <Icon className={cn('h-4.5 w-4.5', action.accent ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
                      </div>
                      {action.badge && action.badge > 0 ? (
                        <Badge className="h-5 px-1.5 text-[10px] bg-destructive text-destructive-foreground">
                          {action.badge}
                        </Badge>
                      ) : null}
                    </div>
                    <div>
                      <p className={cn('text-sm font-medium', action.accent ? 'text-primary' : 'text-foreground')}>{action.label}</p>
                      <p className="text-[11px] text-muted-foreground">{action.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Upcoming Appointments */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.15 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-widest">Coming Up Next</h2>
          <Link to="/front-desk" className="text-xs text-primary hover:underline flex items-center gap-1">
            Open Board <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No upcoming appointments — all caught up! 🎉
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((apt) => (
              <Card
                key={apt.id}
                className="border-border/60 hover:border-primary/20 transition-colors cursor-pointer"
                onClick={() => apt.client_id && navigate(`/clients/${apt.client_id}`)}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={apt.client_avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {apt.client_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">{apt.client_name}</span>
                      {apt.is_new && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-300 text-amber-600 dark:text-amber-400 shrink-0">
                          ⭐ New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{apt.service_name} · {apt.staff_name}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(apt.scheduled_at), 'h:mm a')}
                    </p>
                    <StatusBadge status={apt.status as any} size="sm" />
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
