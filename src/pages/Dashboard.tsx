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

  const getStatusForBadge = (status: string) => {
    return status as any;
  };

  const firstName = staff?.first_name || 'there';

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <OnboardingTour />
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </motion.header>

      {/* Today's Schedule - Moved to top */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Today's Schedule</CardTitle>
            <Link 
              to="/schedule"
              className="text-sm text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No appointments today"
                description="Your schedule is clear. Book your first appointment to get started."
                actionLabel="Schedule Appointment"
                actionHref="/schedule/new"
                compact
              />
            ) : (
              appointments.map((apt, index) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.03 }}
                >
                  <Link
                    to={`/schedule/${apt.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="text-center min-w-[56px]">
                      <p className="text-sm font-medium text-foreground">{apt.time}</p>
                      <p className="text-xs text-muted-foreground">{apt.duration}m</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{apt.client_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{apt.service_name}</p>
                    </div>
                    <StatusBadge status={apt.status} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* KPI Cards */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: 'Appointments', value: metrics.today_appointments, icon: Calendar, subtext: 'Today' },
          { label: 'Sales', value: `$${metrics.today_sales.toLocaleString()}`, icon: DollarSign, subtext: 'Today' },
          { label: 'Week Sales', value: `$${metrics.week_sales.toLocaleString()}`, icon: TrendingUp, subtext: 'This week' },
          { label: 'Commission', value: `$${metrics.month_commission.toLocaleString()}`, icon: Target, subtext: 'This month' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.section>

      {/* Main Grid - Ops + Clock */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <TodayOpsWidget />
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      clockStatus?.is_clocked_in ? "bg-success/10" : "bg-muted"
                    )}>
                      <Clock className={cn(
                        "w-5 h-5",
                        clockStatus?.is_clocked_in ? "text-success" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        {clockStatus?.is_clocked_in ? 'On Shift' : 'Ready to Start?'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {clockStatus?.is_clocked_in && clockStatus.clock_entry
                          ? `Since ${new Date(clockStatus.clock_entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Clock in to begin'
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleClockAction}
                    disabled={isLoading}
                    variant={clockStatus?.is_clocked_in ? "destructive" : "default"}
                    className="w-full gap-2"
                  >
                    {clockStatus?.is_clocked_in ? (
                      <>
                        <Square className="w-4 h-4" />
                        Clock Out
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Clock In
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <LiveGoalsWidget />
          </motion.div>
        </div>
      </div>

      {/* Purchase Requests */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.27 }}
      >
        <PurchaseRequestsWidget />
      </motion.div>

      {/* Revenue Tracker + Live Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <RevenueGoalTracker />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <LiveActivityFeed />
        </motion.div>
      </div>

      {/* Commission + Announcements + Inventory Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <CommissionWidget />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StaffAnnouncementsWidget />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <InventoryAlertsWidget />
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
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
      </motion.section>

    </div>
  );
}
