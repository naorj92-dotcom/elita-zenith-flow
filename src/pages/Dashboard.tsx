import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, DollarSign, Users, ChevronRight,
  Play, Square, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
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

interface TodayAppointment {
  id: string;
  time: string;
  client_name: string;
  service_name: string;
  status: AppointmentStatus;
  duration: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
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
  const revenueChange = metrics.yesterday_revenue > 0 ? Math.round(((metrics.today_revenue - metrics.yesterday_revenue) / metrics.yesterday_revenue) * 100) : 0;
  const clientsChange = metrics.last_week_clients > 0 ? Math.round(((metrics.new_clients_week - metrics.last_week_clients) / metrics.last_week_clients) * 100) : 0;

  const kpiCards = [
    { label: "Today's Bookings", value: metrics.today_appointments, sub: 'Appointments', change: null },
    { label: "Today's Revenue", value: `$${metrics.today_revenue.toLocaleString()}`, sub: revenueChange !== 0 ? `${revenueChange > 0 ? '+' : ''}${revenueChange}% vs yesterday` : 'Today', change: revenueChange },
    { label: 'New Clients', value: metrics.new_clients_week, sub: clientsChange !== 0 ? `${clientsChange > 0 ? '+' : ''}${clientsChange}% vs last week` : 'This week', change: clientsChange },
  ];

  return (
    <div className="p-6 sm:p-10 md:p-12 max-w-5xl mx-auto page-atmosphere">
      <OnboardingTour />

      {/* ═══ HERO HEADER ═══ */}
      <motion.div {...fadeUp} className="card-hero glow-accent relative mb-14 mt-2 sm:mt-4">
        <div className="accent-line" />
        {/* Ambient glow behind hero */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[1.25rem]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[70%] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(34_48%_60%/0.1)_0%,transparent_60%)]" />
          <motion.div
            className="absolute top-[10%] right-[10%] w-[50%] h-[60%] bg-[radial-gradient(circle_at_center,hsl(34_48%_60%/0.08)_0%,transparent_60%)]"
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.08, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="relative p-8 sm:p-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p className="text-[9px] font-semibold text-elita-camel uppercase tracking-[0.5em] mb-4">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-[1.85rem] sm:text-[3.15rem] font-heading font-semibold text-foreground tracking-[-0.04em] leading-[0.9]">
                Welcome back,
                <br />
                <span className="italic font-normal">{firstName}</span>
              </h1>
            </div>
            <Button 
              onClick={handleClockAction} 
              disabled={isLoading} 
              variant={clockStatus?.is_clocked_in ? "destructive" : "default"} 
              size="default" 
              className="gap-2 shrink-0 rounded-2xl h-13 px-7 btn-glow"
            >
              {clockStatus?.is_clocked_in ? (
                <><Square className="w-4 h-4" /> Clock Out</>
              ) : (<><Play className="w-4 h-4" /> Clock In</>)}
            </Button>
          </div>

          <div className="divider-luxe mt-10 mb-10" />

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-5">
            {kpiCards.map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ duration: 0.4 }}
                className="glass p-5 sm:p-6 rounded-2xl"
              >
                <p className="text-3xl sm:text-4xl font-heading font-bold text-foreground leading-none tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
                  {stat.change !== null && stat.change !== 0 && (
                    stat.change > 0
                      ? <ArrowUpRight className="w-3 h-3 text-success" />
                      : <ArrowDownRight className="w-3 h-3 text-destructive" />
                  )}
                  {stat.sub}
                </p>
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.35em] mt-3">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="space-y-14 relative z-10">
        {/* Today's Action Items */}
        <motion.div {...fadeUp} transition={{ delay: 0.09 }}>
          <TodaysFocusWidget />
        </motion.div>

        {/* Today's Schedule */}
        <motion.div {...fadeUp} transition={{ delay: 0.13 }}>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between px-7 pt-7">
              <CardTitle>Today's Schedule</CardTitle>
              <Link to="/schedule" className="text-xs text-elita-camel hover:text-elita-camel/80 flex items-center gap-0.5 font-medium transition-colors">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5 px-7 pb-7">
              {appointments.length === 0 ? (
                <EmptyState icon={Calendar} title="No appointments today" description="Your schedule is clear." actionLabel="Schedule Appointment" actionHref="/schedule/new" compact />
              ) : (
                appointments.slice(0, 5).map((apt) => (
                  <Link key={apt.id} to={`/schedule/${apt.id}`}>
                    <motion.div
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-muted/15 hover:bg-muted/30 hover:shadow-sm transition-all duration-400"
                    >
                      <div className="text-center min-w-[52px]">
                        <p className="text-sm font-semibold text-foreground">{apt.time}</p>
                        <p className="text-[10px] text-muted-foreground">{apt.duration}m</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{apt.client_name}</p>
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

        {/* Operations */}
        <motion.div {...fadeUp} transition={{ delay: 0.17 }}>
          <TodayOpsWidget />
        </motion.div>

        {/* Quick Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.21 }}>
          <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.5em] mb-6">Quick Actions</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'New Appointment', href: '/schedule/new', icon: Calendar },
              { label: 'Add Client', href: '/clients/new', icon: Users },
              { label: 'View Schedule', href: '/schedule', icon: Clock },
              { label: 'Quick Checkout', href: '/pos', icon: DollarSign },
            ].map((action) => (
              <Link key={action.label} to={action.href}>
                <motion.div
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-4 p-6 rounded-2xl glass hover:shadow-md"
                >
                  <div className="w-11 h-11 rounded-2xl bg-accent/40 flex items-center justify-center"
                       style={{ boxShadow: '0 0 16px hsl(34 48% 60% / 0.06)' }}>
                    <action.icon className="w-4.5 h-4.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
