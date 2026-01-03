import React from 'react';
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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// Mock data for demo
const mockTodayAppointments = [
  {
    id: '1',
    time: '10:00 AM',
    client_name: 'Jennifer Adams',
    service_name: 'Botox Treatment',
    status: 'confirmed' as const,
    duration: 45,
  },
  {
    id: '2',
    time: '11:30 AM',
    client_name: 'Maria Santos',
    service_name: 'HydraFacial',
    status: 'scheduled' as const,
    duration: 60,
  },
  {
    id: '3',
    time: '2:00 PM',
    client_name: 'Lisa Chen',
    service_name: 'Laser Hair Removal',
    status: 'scheduled' as const,
    duration: 30,
  },
];

const mockMetrics = {
  today_appointments: 5,
  today_sales: 2450,
  week_sales: 12800,
  month_commission: 3840,
  hours_today: 4.5,
};

export function Dashboard() {
  const { staff, clockStatus, clockIn, clockOut, isLoading } = useAuth();
  const { toast } = useToast();

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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-heading text-3xl md:text-4xl text-foreground mb-2">
          Welcome back, {staff?.name.split(' ')[0]}
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
            value: mockMetrics.today_appointments, 
            icon: Calendar,
            color: 'text-primary',
            bg: 'bg-primary/10'
          },
          { 
            label: 'Today\'s Sales', 
            value: `$${mockMetrics.today_sales.toLocaleString()}`, 
            icon: DollarSign,
            color: 'text-success',
            bg: 'bg-success/10'
          },
          { 
            label: 'Week Sales', 
            value: `$${mockMetrics.week_sales.toLocaleString()}`, 
            icon: TrendingUp,
            color: 'text-info',
            bg: 'bg-info/10'
          },
          { 
            label: 'Month Commission', 
            value: `$${mockMetrics.month_commission.toLocaleString()}`, 
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
            {mockTodayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No appointments today</p>
              </div>
            ) : (
              mockTodayAppointments.map((apt, index) => (
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
