import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Users,
  ChevronRight,
  Play,
  Square,
  Target,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export function Dashboard() {
  const { staff, clockStatus, clockIn, clockOut, isLoading } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [metrics, setMetrics] = useState({
    today_appointments: 0,
    today_sales: 0,
    week_sales: 0,
    month_commission: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!staff) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          duration_minutes,
          status,
          clients (first_name, last_name),
          services (name)
        `)
        .eq('staff_id', staff.id)
        .gte('scheduled_at', today.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .order('scheduled_at', { ascending: true });

      if (appointmentsData) {
        const formattedAppointments: TodayAppointment[] = appointmentsData.map((apt: any) => ({
          id: apt.id,
          time: new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          client_name: apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'Unknown',
          service_name: apt.services?.name || 'Unknown Service',
          status: apt.status as AppointmentStatus,
          duration: apt.duration_minutes,
        }));
        setAppointments(formattedAppointments);
        setMetrics(prev => ({ ...prev, today_appointments: formattedAppointments.length }));
      }

      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, commission_amount, transaction_date')
        .eq('staff_id', staff.id)
        .gte('transaction_date', monthStart.toISOString());

      if (transactions) {
        let todaySales = 0;
        let weekSales = 0;
        let monthCommission = 0;

        transactions.forEach(t => {
          const tDate = new Date(t.transaction_date);
          monthCommission += Number(t.commission_amount) || 0;
          
          if (tDate >= today && tDate <= todayEnd) {
            todaySales += Number(t.amount);
          }
          if (tDate >= weekStart) {
            weekSales += Number(t.amount);
          }
        });

        setMetrics(prev => ({
          ...prev,
          today_sales: todaySales,
          week_sales: weekSales,
          month_commission: monthCommission,
        }));
      }
    };

    fetchDashboardData();
  }, [staff]);

  const handleClockAction = async () => {
    if (clockStatus?.is_clocked_in) {
      const success = await clockOut();
      if (success) {
        toast({
          title: "Clocked Out",
          description: "Have a great rest of your day!",
        });
      }
    } else {
      const success = await clockIn();
      if (success) {
        toast({
          title: "Clocked In",
          description: "Welcome! Have a productive day.",
        });
      }
    }
  };

  const firstName = staff?.first_name || 'there';

  const hasCommission = staff && (
    Number(staff.service_commission_tier1) > 0 ||
    Number(staff.service_commission_tier2) > 0 ||
    Number(staff.service_commission_tier3) > 0 ||
    Number(staff.retail_commission_rate) > 0
  );

  const kpiCards = [
    { label: 'Appointments', value: metrics.today_appointments, icon: Calendar, sub: 'Today' },
    { label: 'Sales', value: `$${metrics.today_sales.toLocaleString()}`, icon: DollarSign, sub: 'Today' },
    { label: 'Week Sales', value: `$${metrics.week_sales.toLocaleString()}`, icon: TrendingUp, sub: 'This week' },
    ...(hasCommission ? [{ label: 'Commission', value: `$${metrics.month_commission.toLocaleString()}`, icon: Target, sub: 'This month' }] : []),
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <OnboardingTour />

      {/* Header + Clock-In Row */}
      <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button
          onClick={handleClockAction}
          disabled={isLoading}
          variant={clockStatus?.is_clocked_in ? "destructive" : "default"}
          size="lg"
          className="gap-2 shrink-0"
        >
          {clockStatus?.is_clocked_in ? (
            <>
              <Square className="w-4 h-4" />
              Clock Out
              {clockStatus.clock_entry && (
                <span className="text-xs opacity-80 ml-1">
                  · Since {new Date(clockStatus.clock_entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Clock In
            </>
          )}
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((stat, i) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-foreground leading-none">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Today's Schedule */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Today's Schedule</CardTitle>
            <Link 
              to="/schedule"
              className="text-sm text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {appointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No appointments today"
                description="Your schedule is clear."
                actionLabel="Schedule Appointment"
                actionHref="/schedule/new"
                compact
              />
            ) : (
              appointments.map((apt, index) => (
                <Link
                  key={apt.id}
                  to={`/schedule/${apt.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors group"
                >
                  <div className="text-center min-w-[52px]">
                    <p className="text-sm font-medium text-foreground">{apt.time}</p>
                    <p className="text-[11px] text-muted-foreground">{apt.duration}m</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{apt.client_name}</p>
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
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="lg:col-span-2">
          <TodayOpsWidget />
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.18 }}>
          <LiveGoalsWidget />
        </motion.div>
      </div>

      {/* Purchase Requests */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <PurchaseRequestsWidget />
      </motion.div>

      {/* Revenue + Activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div {...fadeUp} transition={{ delay: 0.22 }}>
          <RevenueGoalTracker />
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.24 }}>
          <LiveActivityFeed />
        </motion.div>
      </div>

      {/* Commission + Announcements + Inventory */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div {...fadeUp} transition={{ delay: 0.26 }}>
          <CommissionWidget />
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.28 }}>
          <StaffAnnouncementsWidget />
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <InventoryAlertsWidget />
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div {...fadeUp} transition={{ delay: 0.32 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'New Appointment', href: '/schedule/new', icon: Calendar },
          { label: 'Add Client', href: '/clients/new', icon: Users },
          { label: 'View Schedule', href: '/schedule', icon: Clock },
          { label: 'Quick Checkout', href: '/pos', icon: Zap },
        ].map((action) => (
          <Link
            key={action.label}
            to={action.href}
            className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-premium-md transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-sm font-medium text-foreground">{action.label}</span>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
