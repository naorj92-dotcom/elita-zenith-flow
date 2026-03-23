import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, DollarSign, TrendingUp, Users, ChevronRight,
  Play, Square, Target, Zap, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppointmentStatus } from '@/types';
import { LiveGoalsWidget } from '@/components/dashboard/LiveGoalsWidget';
import { TodayOpsWidget } from '@/components/dashboard/TodayOpsWidget';
import { PurchaseRequestsWidget } from '@/components/dashboard/PurchaseRequestsWidget';
import { CommissionWidget } from '@/components/dashboard/CommissionWidget';
import { InventoryAlertsWidget } from '@/components/dashboard/InventoryAlertsWidget';
import { StaffAnnouncementsWidget } from '@/components/dashboard/StaffAnnouncementsWidget';
import { RevenueGoalTracker } from '@/components/dashboard/RevenueGoalTracker';
import { LiveActivityFeed } from '@/components/dashboard/LiveActivityFeed';
import { TodaysFocusWidget } from '@/components/dashboard/TodaysFocusWidget';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { cn } from '@/lib/utils';

interface TodayAppointment {
  id: string;
  time: string;
  client_name: string;
  service_name: string;
  status: AppointmentStatus;
  duration: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
};

export function Dashboard() {
  const { staff, clockStatus, clockIn, clockOut, isLoading } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [metrics, setMetrics] = useState({
    today_appointments: 0, today_sales: 0, week_sales: 0, month_commission: 0,
    new_clients_week: 0, today_revenue: 0, yesterday_revenue: 0, last_week_clients: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!staff) return;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEnd = new Date(yesterday); yesterdayEnd.setHours(23, 59, 59, 999);

      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`id, scheduled_at, duration_minutes, status, total_amount, clients (first_name, last_name), services (name)`)
        .eq('staff_id', staff.id).gte('scheduled_at', today.toISOString()).lte('scheduled_at', todayEnd.toISOString())
        .order('scheduled_at', { ascending: true });

      if (appointmentsData) {
        const formatted: TodayAppointment[] = appointmentsData.map((apt: any) => ({
          id: apt.id, time: new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          client_name: apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'Unknown',
          service_name: apt.services?.name || 'Unknown', status: apt.status as AppointmentStatus, duration: apt.duration_minutes,
        }));
        const todayRevenue = appointmentsData.filter((a: any) => a.status === 'completed').reduce((s: number, a: any) => s + Number(a.total_amount || 0), 0);
        setAppointments(formatted);
        setMetrics(prev => ({ ...prev, today_appointments: formatted.length, today_revenue: todayRevenue }));
      }

      const { data: yesterdayApts } = await supabase.from('appointments').select('total_amount').eq('staff_id', staff.id).eq('status', 'completed')
        .gte('scheduled_at', yesterday.toISOString()).lte('scheduled_at', yesterdayEnd.toISOString());
      const yesterdayRev = (yesterdayApts || []).reduce((s: number, a: any) => s + Number(a.total_amount || 0), 0);

      const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
      const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [transRes, newClientsRes, lastWeekClientsRes] = await Promise.all([
        supabase.from('transactions').select('amount, commission_amount, transaction_date').eq('staff_id', staff.id).gte('transaction_date', monthStart.toISOString()),
        supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
        supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', lastWeekStart.toISOString()).lt('created_at', weekStart.toISOString()),
      ]);

      if (transRes.data) {
        let todaySales = 0, weekSales = 0, monthCommission = 0;
        transRes.data.forEach(t => {
          const tDate = new Date(t.transaction_date);
          monthCommission += Number(t.commission_amount) || 0;
          if (tDate >= today && tDate <= todayEnd) todaySales += Number(t.amount);
          if (tDate >= weekStart) weekSales += Number(t.amount);
        });
        setMetrics(prev => ({
          ...prev, today_sales: todaySales, week_sales: weekSales, month_commission: monthCommission,
          new_clients_week: newClientsRes.count || 0, yesterday_revenue: yesterdayRev, last_week_clients: lastWeekClientsRes.count || 0,
        }));
      }
    };
    fetchDashboardData();
  }, [staff]);

  const handleClockAction = async () => {
    if (clockStatus?.is_clocked_in) {
      const success = await clockOut();
      if (success) toast({ title: "Clocked Out", description: "Have a great rest of your day." });
    } else {
      const success = await clockIn();
      if (success) toast({ title: "Clocked In", description: "Welcome. Have a productive day." });
    }
  };

  const firstName = staff?.first_name || 'there';
  const hasCommission = staff && (Number(staff.service_commission_tier1) > 0 || Number(staff.service_commission_tier2) > 0 || Number(staff.service_commission_tier3) > 0 || Number(staff.retail_commission_rate) > 0);
  const revenueChange = metrics.yesterday_revenue > 0 ? Math.round(((metrics.today_revenue - metrics.yesterday_revenue) / metrics.yesterday_revenue) * 100) : 0;
  const clientsChange = metrics.last_week_clients > 0 ? Math.round(((metrics.new_clients_week - metrics.last_week_clients) / metrics.last_week_clients) * 100) : 0;

  const kpiCards = [
    { label: "Today's Bookings", value: metrics.today_appointments, icon: Calendar, sub: 'Appointments', change: null },
    { label: "Today's Revenue", value: `$${metrics.today_revenue.toLocaleString()}`, icon: DollarSign, sub: revenueChange !== 0 ? `${revenueChange > 0 ? '+' : ''}${revenueChange}% vs yesterday` : 'Today', change: revenueChange },
    { label: 'Week Sales', value: `$${metrics.week_sales.toLocaleString()}`, icon: TrendingUp, sub: 'This week', change: null },
    { label: 'New Clients', value: metrics.new_clients_week, icon: Users, sub: clientsChange !== 0 ? `${clientsChange > 0 ? '+' : ''}${clientsChange}% vs last week` : 'This week', change: clientsChange },
    ...(hasCommission ? [{ label: 'Commission', value: `$${metrics.month_commission.toLocaleString()}`, icon: Target, sub: 'This month', change: null as number | null }] : []),
  ];

  return (
    <div className="p-6 sm:p-8 md:p-12 max-w-6xl mx-auto space-y-10">
      <OnboardingTour />

      {/* Header */}
      <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground tracking-tight">Welcome back, {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <Button onClick={handleClockAction} disabled={isLoading} variant={clockStatus?.is_clocked_in ? "destructive" : "default"} size="lg" className="gap-2.5 shrink-0">
          {clockStatus?.is_clocked_in ? (
            <><Square className="w-4 h-4" /> Clock Out
              {clockStatus.clock_entry && <span className="text-xs opacity-80 ml-1">· Since {new Date(clockStatus.clock_entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            </>
          ) : (<><Play className="w-4 h-4" /> Clock In</>)}
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="grid grid-cols-2 lg:grid-cols-5 gap-5">
        {kpiCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-heading font-bold text-foreground leading-none">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    {stat.change !== null && stat.change !== 0 && (
                      stat.change > 0
                        ? <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                        : <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                    )}
                    {stat.sub}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <stat.icon className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Today's Focus */}
      <motion.div {...fadeUp} transition={{ delay: 0.12 }}>
        <TodaysFocusWidget />
      </motion.div>

      {/* Today's Schedule */}
      <motion.div {...fadeUp} transition={{ delay: 0.16 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Today's Schedule</CardTitle>
            <Link to="/schedule" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors font-medium">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointments.length === 0 ? (
              <EmptyState icon={Calendar} title="No appointments today" description="Your schedule is clear." actionLabel="Schedule Appointment" actionHref="/schedule/new" compact />
            ) : (
              appointments.map((apt) => (
                <Link key={apt.id} to={`/schedule/${apt.id}`} className="flex items-center gap-5 p-5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 group">
                  <div className="text-center min-w-[56px]">
                    <p className="text-sm font-semibold text-foreground">{apt.time}</p>
                    <p className="text-[11px] text-muted-foreground">{apt.duration}m</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{apt.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{apt.service_name}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Ops + Goals */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="lg:col-span-2"><TodayOpsWidget /></motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.22 }}><LiveGoalsWidget /></motion.div>
      </div>

      <motion.div {...fadeUp} transition={{ delay: 0.24 }}><PurchaseRequestsWidget /></motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div {...fadeUp} transition={{ delay: 0.26 }}><RevenueGoalTracker /></motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.28 }}><LiveActivityFeed /></motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}><CommissionWidget /></motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.32 }}><StaffAnnouncementsWidget /></motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.34 }}><InventoryAlertsWidget /></motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div {...fadeUp} transition={{ delay: 0.36 }} className="grid grid-cols-2 gap-5">
        {[
          { label: 'New Appointment', href: '/schedule/new', icon: Calendar },
          { label: 'Add Client', href: '/clients/new', icon: Users },
          { label: 'View Schedule', href: '/schedule', icon: Clock },
          { label: 'Quick Checkout', href: '/pos', icon: Zap },
        ].map((action) => (
          <Link key={action.label} to={action.href} className="flex items-center gap-5 p-6 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-premium-md transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
              <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
            </div>
            <span className="text-sm font-semibold text-foreground">{action.label}</span>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
