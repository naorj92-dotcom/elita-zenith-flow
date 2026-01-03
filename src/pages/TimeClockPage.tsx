import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Play, 
  Square,
  Calendar,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Mock time clock history
const mockTimeHistory = [
  { date: '2024-12-20', clock_in: '09:02', clock_out: '17:30', hours: 8.47 },
  { date: '2024-12-19', clock_in: '08:55', clock_out: '17:15', hours: 8.33 },
  { date: '2024-12-18', clock_in: '09:10', clock_out: '18:00', hours: 8.83 },
  { date: '2024-12-17', clock_in: '09:00', clock_out: '17:00', hours: 8.00 },
  { date: '2024-12-16', clock_in: '08:45', clock_out: '16:45', hours: 8.00 },
];

const mockWeekSummary = {
  total_hours: 41.63,
  total_days: 5,
  avg_hours_per_day: 8.33,
};

export function TimeClockPage() {
  const { staff, clockStatus, clockIn, clockOut, isLoading } = useAuth();
  const { toast } = useToast();

  const handleClockAction = async () => {
    if (clockStatus?.is_clocked_in) {
      const success = await clockOut();
      if (success) {
        toast({
          title: "Clocked Out Successfully",
          description: "Your time has been recorded. Have a great rest of your day!",
        });
      }
    } else {
      const success = await clockIn();
      if (success) {
        toast({
          title: "Clocked In Successfully",
          description: "Welcome! Your shift has started.",
        });
      }
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const [currentTime, setCurrentTime] = React.useState(getCurrentTime());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedTime = () => {
    if (!clockStatus?.clock_entry?.clock_in) return '0h 0m';
    const clockIn = new Date(clockStatus.clock_entry.clock_in);
    const now = new Date();
    const diff = now.getTime() - clockIn.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-heading text-3xl md:text-4xl text-foreground mb-2">Time Clock</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
      </motion.div>

      {/* Main Clock Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className={cn(
          "card-luxury overflow-hidden",
          clockStatus?.is_clocked_in && "ring-2 ring-success/30"
        )}>
          <CardContent className="p-8 text-center">
            {/* Current Time Display */}
            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">
                Current Time
              </p>
              <p className="font-heading text-5xl md:text-6xl text-foreground tracking-tight">
                {currentTime}
              </p>
            </div>

            {/* Status Badge */}
            <div className="mb-8">
              <div className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-full",
                clockStatus?.is_clocked_in 
                  ? "bg-success/10 text-success" 
                  : "bg-muted text-muted-foreground"
              )}>
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  clockStatus?.is_clocked_in ? "bg-success animate-pulse" : "bg-muted-foreground"
                )} />
                <span className="font-semibold">
                  {clockStatus?.is_clocked_in ? 'Clocked In' : 'Clocked Out'}
                </span>
              </div>
            </div>

            {/* Clock In Time & Elapsed */}
            {clockStatus?.is_clocked_in && clockStatus.clock_entry && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-4 mb-8 max-w-sm mx-auto"
              >
                <div className="bg-secondary/50 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Clock In</p>
                  <p className="text-xl font-semibold text-foreground">
                    {new Date(clockStatus.clock_entry.clock_in).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="bg-success/10 rounded-xl p-4">
                  <p className="text-xs text-success mb-1">Time Worked</p>
                  <p className="text-xl font-semibold text-success">
                    {getElapsedTime()}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Action Button */}
            <Button
              onClick={handleClockAction}
              disabled={isLoading}
              size="lg"
              className={cn(
                "gap-3 px-12 py-7 text-xl font-semibold rounded-2xl transition-all",
                clockStatus?.is_clocked_in 
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-success hover:bg-success/90 text-success-foreground shadow-lg hover:shadow-xl"
              )}
            >
              {clockStatus?.is_clocked_in ? (
                <>
                  <Square className="w-6 h-6" />
                  Clock Out
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  Clock In
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Week Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        {[
          { label: 'Week Hours', value: `${mockWeekSummary.total_hours.toFixed(1)}h`, icon: Clock },
          { label: 'Days Worked', value: mockWeekSummary.total_days, icon: Calendar },
          { label: 'Avg/Day', value: `${mockWeekSummary.avg_hours_per_day.toFixed(1)}h`, icon: TrendingUp },
        ].map((stat, index) => (
          <Card key={stat.label} className="card-luxury">
            <CardContent className="p-4 text-center">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Recent Time Entries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="card-luxury">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {mockTimeHistory.map((entry, index) => (
                <motion.div
                  key={entry.date}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {entry.clock_in} → {entry.clock_out}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{entry.hours.toFixed(2)}h</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
