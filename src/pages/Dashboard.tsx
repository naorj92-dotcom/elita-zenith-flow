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
  Square
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppointmentWithDetails, AppointmentStatus } from '@/types';

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

      // Fetch today's appointments
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

      // Fetch sales metrics
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'status-confirmed';
      case 'scheduled': return 'status-pending';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const firstName = staff?.first_name || 'there';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-heading text-3xl md:text-4xl text-foreground mb-2">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </motion.div>

      {/* Clock In/Out Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className="card-luxury overflow-hidden">
          <div className={cn(
            "p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
            clockStatus?.is_clocked_in 
              ? "bg-gradient-to-r from-success/5 to-transparent" 
              : "bg-gradient-hero"
          )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                clockStatus?.is_clocked_in ? "bg-success/10" : "bg-primary/10"
              )}>
                <Clock className={cn(
                  "w-7 h-7",
                  clockStatus?.is_clocked_in ? "text-success" : "text-primary"
                )} />
              </div>
              <div>
                <h3 className="font-heading text-xl text-foreground">
                  {clockStatus?.is_clocked_in ? 'Currently Working' : 'Ready to Start?'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {clockStatus?.is_clocked_in && clockStatus.clock_entry
                    ? `Clocked in at ${new Date(clockStatus.clock_entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Clock in to begin your shift'
                  }
                </p>
              </div>
            </div>
            <Button
              onClick={handleClockAction}
              disabled={isLoading}
              className={cn(
                "gap-2 px-6 py-5 text-base font-semibold",
                clockStatus?.is_clocked_in 
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-success hover:bg-success/90 text-success-foreground"
              )}
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
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { 
            label: 'Today\'s Appointments', 
            value: metrics.today_appointments, 
            icon: Calendar,
            color: 'text-primary',
            bg: 'bg-primary/10'
          },
          { 
            label: 'Today\'s Sales', 
            value: `$${metrics.today_sales.toLocaleString()}`, 
            icon: DollarSign,
            color: 'text-success',
            bg: 'bg-success/10'
          },
          { 
            label: 'Week Sales', 
            value: `$${metrics.week_sales.toLocaleString()}`, 
            icon: TrendingUp,
            color: 'text-info',
            bg: 'bg-info/10'
          },
          { 
            label: 'Month Commission', 
            value: `$${metrics.month_commission.toLocaleString()}`, 
            icon: DollarSign,
            color: 'text-warning',
            bg: 'bg-warning/10'
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
          >
            <Card className="card-luxury h-full">
              <CardContent className="p-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <p className="text-2xl font-semibold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Today's Appointments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="card-luxury">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="font-heading text-xl">Today's Schedule</CardTitle>
            <Link 
              to="/schedule"
              className="text-sm text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No appointments today</p>
              </div>
            ) : (
              appointments.map((apt, index) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <Link
                    to={`/schedule/${apt.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
                  >
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm font-semibold text-foreground">{apt.time}</p>
                      <p className="text-xs text-muted-foreground">{apt.duration} min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{apt.client_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{apt.service_name}</p>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium capitalize",
                      getStatusColor(apt.status)
                    )}>
                      {apt.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'New Appointment', href: '/schedule/new', icon: Calendar },
          { label: 'Add Client', href: '/clients/new', icon: Users },
          { label: 'View Schedule', href: '/schedule', icon: Calendar },
          { label: 'Time Clock', href: '/timeclock', icon: Clock },
        ].map((action, index) => (
          <Link
            key={action.label}
            to={action.href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-luxury-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <action.icon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground text-center">{action.label}</span>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
