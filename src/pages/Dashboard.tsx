import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, DollarSign, Users, ChevronRight,
  Play, Square, ArrowUpRight, ArrowDownRight, Target, Flame, Trophy,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppointmentStatus } from '@/types';
import { TodayOpsWidget } from '@/components/dashboard/TodayOpsWidget';
import { TodaysFocusWidget } from '@/components/dashboard/TodaysFocusWidget';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { RebookRemindersWidget } from '@/components/dashboard/RebookRemindersWidget';
import { cn } from '@/lib/utils';

interface TodayAppointment {
  id: string;
  time: string;
  client_name: string;
  service_name: string;
  status: AppointmentStatus;
  duration: number;
}

type MetricPeriod = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<MetricPeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
};

export function Dashboard() {
  const { staff, clockStatus, clockIn, clockOut, isLoading } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [metricPeriod, setMetricPeriod] = useState<MetricPeriod>('today');
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [allMetrics, setAllMetrics] = useState<Record<MetricPeriod, { bookings: number; revenue: number; newClients: number; prevBookings: number; prevRevenue: number; prevClients: number }>>({
    today: { bookings: 0, revenue: 0, newClients: 0, prevBookings: 0, prevRevenue: 0, prevClients: 0 },
    week: { bookings: 0, revenue: 0, newClients: 0, prevBookings: 0, prevRevenue: 0, prevClients: 0 },
    month: { bookings: 0, revenue: 0, newClients: 0, prevBookings: 0, prevRevenue: 0, prevClients: 0 },
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!staff) return;

      // Fetch admin-configured daily goal
      const { data: goalSetting } = await supabase
        .from('business_settings')
        .select('value')
        .eq('key', 'daily_revenue_goal')
        .single();
      if (goalSetting) setDailyGoal(Number(goalSetting.value) || 2000);

      const now = new Date();
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEnd = new Date(yesterday); yesterdayEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
      const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(monthStart); lastMonthEnd.setMilliseconds(-1);

      // Fetch all appointments for the month (covers all periods)
      const { data: monthApts } = await supabase
        .from('appointments')
        .select('id, scheduled_at, duration_minutes, status, total_amount, clients (first_name, last_name), services (name)')
        .eq('staff_id', staff.id)
        .gte('scheduled_at', monthStart.toISOString())
        .order('scheduled_at', { ascending: true });

      // Previous month appointments for comparison
      const { data: prevMonthApts } = await supabase
        .from('appointments')
        .select('id, scheduled_at, status, total_amount')
        .eq('staff_id', staff.id)
        .gte('scheduled_at', lastMonthStart.toISOString())
        .lt('scheduled_at', monthStart.toISOString());

      // Yesterday appointments for today comparison
      const { data: yesterdayApts } = await supabase
        .from('appointments')
        .select('id, status, total_amount')
        .eq('staff_id', staff.id)
        .gte('scheduled_at', yesterday.toISOString())
        .lte('scheduled_at', yesterdayEnd.toISOString());

      // Last week appointments for week comparison
      const { data: lastWeekApts } = await supabase
        .from('appointments')
        .select('id, status, total_amount')
        .eq('staff_id', staff.id)
        .gte('scheduled_at', lastWeekStart.toISOString())
        .lt('scheduled_at', weekStart.toISOString());

      // Clients
      const [todayClients, weekClients, monthClients, yesterdayClients, lastWeekClients, lastMonthClients] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()).lte('created_at', todayEnd.toISOString()),
        supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
        supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
        supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()).lte('created_at', yesterdayEnd.toISOString()),
        supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', lastWeekStart.toISOString()).lt('created_at', weekStart.toISOString()),
        supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', lastMonthStart.toISOString()).lt('created_at', monthStart.toISOString()),
      ]);

      const allApts = monthApts || [];
      const calcMetrics = (apts: any[], start: Date, end: Date) => ({
        bookings: apts.filter(a => { const d = new Date(a.scheduled_at); return d >= start && d <= end; }).length,
        revenue: apts.filter(a => { const d = new Date(a.scheduled_at); return d >= start && d <= end && a.status === 'completed'; }).reduce((s: number, a: any) => s + Number(a.total_amount || 0), 0),
      });
      const calcPrevMetrics = (apts: any[]) => ({
        prevBookings: (apts || []).length,
        prevRevenue: (apts || []).filter((a: any) => a.status === 'completed').reduce((s: number, a: any) => s + Number(a.total_amount || 0), 0),
      });

      const todayM = calcMetrics(allApts, today, todayEnd);
      const weekM = calcMetrics(allApts, weekStart, todayEnd);
      const monthM = calcMetrics(allApts, monthStart, todayEnd);
      const prevToday = calcPrevMetrics(yesterdayApts);
      const prevWeek = calcPrevMetrics(lastWeekApts);
      const prevMonth = calcPrevMetrics(prevMonthApts);

      setAllMetrics({
        today: { ...todayM, newClients: todayClients.count || 0, ...prevToday, prevClients: yesterdayClients.count || 0 },
        week: { ...weekM, newClients: weekClients.count || 0, ...prevWeek, prevClients: lastWeekClients.count || 0 },
        month: { ...monthM, newClients: monthClients.count || 0, ...prevMonth, prevClients: lastMonthClients.count || 0 },
      });

      // Today's appointments for schedule display
      const todayFormatted: TodayAppointment[] = allApts
        .filter(a => { const d = new Date(a.scheduled_at); return d >= today && d <= todayEnd; })
        .map((apt: any) => ({
          id: apt.id, time: new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          client_name: apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'Unknown',
          service_name: apt.services?.name || 'Unknown', status: apt.status as AppointmentStatus, duration: apt.duration_minutes,
        }));
      setAppointments(todayFormatted);
    };
    fetchDashboardData();
  }, [staff]);

  const firstName = staff?.first_name || 'there';
  const m = allMetrics[metricPeriod];
  const revChange = m.prevRevenue > 0 ? Math.round(((m.revenue - m.prevRevenue) / m.prevRevenue) * 100) : 0;
  const clientsChange = m.prevClients > 0 ? Math.round(((m.newClients - m.prevClients) / m.prevClients) * 100) : 0;
  const bookingsChange = m.prevBookings > 0 ? Math.round(((m.bookings - m.prevBookings) / m.prevBookings) * 100) : 0;

  const periodSuffix = PERIOD_LABELS[metricPeriod];
  const prevLabel = metricPeriod === 'today' ? 'yesterday' : metricPeriod === 'week' ? 'last week' : 'last month';

  const kpiCards = [
    { label: `Bookings ${periodSuffix}`, value: m.bookings, sub: bookingsChange !== 0 ? `${bookingsChange > 0 ? '+' : ''}${bookingsChange}% vs ${prevLabel}` : periodSuffix, change: bookingsChange },
    { label: `Revenue ${periodSuffix}`, value: `$${m.revenue.toLocaleString()}`, sub: revChange !== 0 ? `${revChange > 0 ? '+' : ''}${revChange}% vs ${prevLabel}` : periodSuffix, change: revChange },
    { label: `New Clients ${periodSuffix}`, value: m.newClients, sub: clientsChange !== 0 ? `${clientsChange > 0 ? '+' : ''}${clientsChange}% vs ${prevLabel}` : periodSuffix, change: clientsChange },
  ];

  return (
    <div className="p-6 sm:p-10 md:p-14 max-w-5xl mx-auto page-atmosphere">
      <OnboardingTour />

      {/* ═══ HERO HEADER ═══ */}
      <motion.div {...fadeUp} className="card-hero glow-accent relative mb-20 mt-2 sm:mt-4">
        <div className="accent-line" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[1.25rem]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[160%] h-[75%] bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,hsl(34_48%_60%/0.12)_0%,transparent_55%)]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[130%] h-[40%] bg-[radial-gradient(ellipse_70%_50%_at_50%_100%,hsl(22_20%_18%/0.04)_0%,transparent_60%)]" />
          <motion.div
            className="absolute top-[8%] right-[5%] w-[55%] h-[65%] bg-[radial-gradient(circle_at_center,hsl(34_48%_60%/0.09)_0%,transparent_55%)]"
            animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.1, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="relative p-10 sm:p-14 md:p-16">
           <div>
              <p className="text-[10px] font-semibold text-elita-camel uppercase tracking-[0.4em] mb-5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="font-heading font-semibold text-foreground tracking-[-0.04em] leading-[0.88]"
                  style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
                Welcome back,
                <br />
                <span className="italic font-normal">{firstName}</span>
              </h1>
            </div>

            {/* Clock Status Row */}
            <ClockStatusRow
              clockStatus={clockStatus}
              isLoading={isLoading}
              onClockIn={async () => { const ok = await clockIn(); if (ok) toast({ title: "Clocked In", description: "Welcome. Have a productive day." }); }}
              onClockOut={async () => { const ok = await clockOut(); if (ok) toast({ title: "Clocked Out", description: "Have a great rest of your day." }); }}
            />

          <div className="divider-luxe mt-12 mb-10" />

          {/* Period Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-muted/30 border border-border/30">
              {(['today', 'week', 'month'] as MetricPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setMetricPeriod(period)}
                  className={cn(
                    'px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-300',
                    metricPeriod === period
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground/70'
                  )}
                >
                  {PERIOD_LABELS[period]}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-5">
            {kpiCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -4, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="glass p-6 sm:p-7 rounded-2xl"
                style={i === 1 ? { transform: 'translateY(-4px)' } : undefined}
              >
                <p className="text-3xl sm:text-[2.5rem] font-heading font-bold text-foreground leading-none tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-4 flex items-center gap-1 font-light">
                  {stat.change !== null && stat.change !== 0 && (
                    stat.change > 0
                      ? <ArrowUpRight className="w-3 h-3 text-success" />
                      : <ArrowDownRight className="w-3 h-3 text-destructive" />
                  )}
                  {stat.sub}
                </p>
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.3em] mt-3">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Daily Revenue Goal */}
          {(() => {
            const todayRev = allMetrics.today.revenue;
            const progress = dailyGoal > 0 ? Math.min((todayRev / dailyGoal) * 100, 100) : 0;
            const remaining = Math.max(dailyGoal - todayRev, 0);
            const goalHit = todayRev >= dailyGoal;
            return (
              <div className="mt-10 glass rounded-2xl p-6 sm:p-7">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <Target className="w-4.5 h-4.5 text-primary" />
                    <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-[0.25em]">Today's Goal</span>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground/50">
                    {Math.round(progress)}% to goal
                  </span>
                </div>
                <div className="flex items-end justify-between mb-3">
                  <p className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight">
                    ${todayRev.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    <span className="text-base font-normal text-muted-foreground/40 ml-1">
                      of ${dailyGoal.toLocaleString()}
                    </span>
                  </p>
                </div>
                <Progress value={progress} className={cn("h-2.5", goalHit ? "[&>div]:bg-success" : "")} />
                {goalHit ? (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-[12px] text-success font-semibold mt-3"
                  >
                    🎯 Goal reached! Great work today.
                  </motion.p>
                ) : (
                  <p className="text-[11px] text-muted-foreground/60 font-medium mt-3">
                    You're <span className="text-foreground font-semibold">${remaining.toLocaleString()}</span> away from today's goal
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </motion.div>

      <div className="space-y-20 relative z-10">
        {/* Today's Action Items */}
        <motion.div {...fadeUp} transition={{ delay: 0.09 }}>
          <TodaysFocusWidget />
        </motion.div>

        {/* Today's Schedule — DOMINANT */}
        <motion.div {...fadeUp} transition={{ delay: 0.13 }}>
          <Card className="card-premium">
            <CardHeader className="flex flex-row items-center justify-between px-8 pt-8 pb-2">
              <CardTitle className="text-xl">Today's Schedule</CardTitle>
              <Link to="/schedule" className="text-xs text-elita-camel hover:text-elita-camel/80 flex items-center gap-0.5 font-medium transition-colors">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 px-8 pb-8">
              {appointments.length === 0 ? (
                <EmptyState icon={Calendar} title="No appointments today" description="Your schedule is clear." actionLabel="Schedule Appointment" actionHref="/schedule/new" compact />
              ) : (
                appointments.slice(0, 5).map((apt) => (
                  <Link key={apt.id} to={`/schedule/${apt.id}`}>
                    <motion.div
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-4 p-5 rounded-2xl bg-muted/15 hover:bg-muted/30 hover:shadow-sm transition-all duration-400"
                    >
                      <div className="text-center min-w-[52px]">
                        <p className="text-sm font-semibold text-foreground">{apt.time}</p>
                        <p className="text-[10px] text-muted-foreground">{apt.duration}m</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{apt.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{apt.service_name}</p>
                      </div>
                      <StatusBadge status={apt.status} />
                    </motion.div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Rebook Reminders */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <RebookRemindersWidget />
        </motion.div>

        {/* Operations */}
        <motion.div {...fadeUp} transition={{ delay: 0.17 }}>
          <TodayOpsWidget />
        </motion.div>

        {/* Quick Actions — subdued */}
        <motion.div {...fadeUp} transition={{ delay: 0.21 }}>
          <p className="text-[9px] font-semibold text-muted-foreground/45 uppercase tracking-[0.35em] mb-6">Quick Actions</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'New Appointment', href: '/schedule/new', icon: Calendar },
              { label: 'Add Client', href: '/clients/new', icon: Users },
              { label: 'View Schedule', href: '/schedule', icon: Clock },
              { label: 'Quick Checkout', href: '/pos', icon: DollarSign },
              ...(staff?.role === 'admin' ? [{ label: 'Launch Kiosk', href: '/kiosk', icon: Play, external: true }] : []),
            ].map((action: any) => (
              action.external ? (
                <a key={action.label} href="/kiosk" target="_blank" rel="noopener noreferrer">
                  <motion.div
                    whileHover={{ y: -3, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-4 p-6 rounded-2xl card-minimal hover:shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-accent/40 flex items-center justify-center"
                         style={{ boxShadow: '0 0 16px hsl(34 48% 60% / 0.06)' }}>
                      <action.icon className="w-4.5 h-4.5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </motion.div>
                </a>
              ) : (
              <Link key={action.label} to={action.href}>
                <motion.div
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-4 p-6 rounded-2xl card-minimal hover:shadow-sm"
                >
                  <div className="w-11 h-11 rounded-2xl bg-accent/40 flex items-center justify-center"
                       style={{ boxShadow: '0 0 16px hsl(34 48% 60% / 0.06)' }}>
                    <action.icon className="w-4.5 h-4.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </motion.div>
              </Link>
              )))}

          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ClockStatusRow({ clockStatus, isLoading, onClockIn, onClockOut }: {
  clockStatus: { is_clocked_in: boolean; clock_entry?: { clock_in: string } } | null;
  isLoading: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!clockStatus?.is_clocked_in || !clockStatus.clock_entry?.clock_in) {
      setElapsed('');
      return;
    }
    const update = () => {
      const diff = Date.now() - new Date(clockStatus.clock_entry!.clock_in).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [clockStatus?.is_clocked_in, clockStatus?.clock_entry?.clock_in]);

  if (!clockStatus?.is_clocked_in) {
    return (
      <div className="mt-8">
        <Button
          onClick={onClockIn}
          disabled={isLoading}
          size="default"
          className="gap-2 rounded-2xl btn-glow w-full sm:w-auto"
        >
          <Play className="w-4 h-4" /> Clock In
        </Button>
      </div>
    );
  }

  const clockInTime = clockStatus.clock_entry?.clock_in
    ? new Date(clockStatus.clock_entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
        <span>Clocked in at <span className="font-semibold text-foreground">{clockInTime}</span></span>
        <span className="text-muted-foreground/40">•</span>
        <span className="font-medium text-foreground">{elapsed}</span> elapsed
      </div>
      <Button
        onClick={onClockOut}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="gap-2 rounded-2xl w-full sm:w-auto"
      >
        <Square className="w-3.5 h-3.5" /> Clock Out
      </Button>
    </div>
  );
}
