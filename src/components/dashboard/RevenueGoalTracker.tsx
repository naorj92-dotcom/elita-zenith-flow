import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks } from 'date-fns';

interface RevenueData {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  yesterdayRevenue: number;
  lastWeekRevenue: number;
  todayAppointments: number;
  completedToday: number;
  dailyGoal: number;
  weeklyGoal: number;
  monthlyGoal: number;
}

export function RevenueGoalTracker() {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['revenue-goal-tracker'],
    queryFn: async (): Promise<RevenueData> => {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const weekStart = startOfWeek(now).toISOString();
      const weekEnd = endOfWeek(now).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      const yesterday = subDays(now, 1);
      const yesterdayStart = startOfDay(yesterday).toISOString();
      const yesterdayEnd = endOfDay(yesterday).toISOString();

      const lastWeekStart = startOfWeek(subWeeks(now, 1)).toISOString();
      const lastWeekEnd = endOfWeek(subWeeks(now, 1)).toISOString();

      // Fetch all transactions for the month (covers all periods)
      const { data: monthTransactions } = await supabase
        .from('transactions')
        .select('amount, transaction_date')
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd);

      // Fetch last week separately
      const { data: lastWeekTransactions } = await supabase
        .from('transactions')
        .select('amount, transaction_date')
        .gte('transaction_date', lastWeekStart)
        .lte('transaction_date', lastWeekEnd);

      // Fetch yesterday
      const { data: yesterdayTransactions } = await supabase
        .from('transactions')
        .select('amount, transaction_date')
        .gte('transaction_date', yesterdayStart)
        .lte('transaction_date', yesterdayEnd);

      // Today's appointments
      const { data: todayAppts } = await supabase
        .from('appointments')
        .select('id, status')
        .gte('scheduled_at', todayStart)
        .lte('scheduled_at', todayEnd);

      let todayRevenue = 0;
      let weekRevenue = 0;
      let monthRevenue = 0;

      (monthTransactions || []).forEach(t => {
        const amount = Number(t.amount) || 0;
        const date = new Date(t.transaction_date);
        monthRevenue += amount;
        if (date >= new Date(todayStart) && date <= new Date(todayEnd)) todayRevenue += amount;
        if (date >= new Date(weekStart) && date <= new Date(weekEnd)) weekRevenue += amount;
      });

      const yesterdayRevenue = (yesterdayTransactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const lastWeekRevenue = (lastWeekTransactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);

      const completedToday = (todayAppts || []).filter(a => a.status === 'completed').length;

      return {
        todayRevenue,
        weekRevenue,
        monthRevenue,
        yesterdayRevenue,
        lastWeekRevenue,
        todayAppointments: todayAppts?.length || 0,
        completedToday,
        dailyGoal: 2000,
        weeklyGoal: 12000,
        monthlyGoal: 50000,
      };
    },
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('revenue-tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {})
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const dailyProgress = data ? Math.min((data.todayRevenue / data.dailyGoal) * 100, 100) : 0;
  const weeklyProgress = data ? Math.min((data.weekRevenue / data.weeklyGoal) * 100, 100) : 0;
  const monthlyProgress = data ? Math.min((data.monthRevenue / data.monthlyGoal) * 100, 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(dailyProgress), 300);
    return () => clearTimeout(timer);
  }, [dailyProgress]);

  const todayChange = data && data.yesterdayRevenue > 0
    ? ((data.todayRevenue - data.yesterdayRevenue) / data.yesterdayRevenue * 100)
    : 0;
  const weekChange = data && data.lastWeekRevenue > 0
    ? ((data.weekRevenue - data.lastWeekRevenue) / data.lastWeekRevenue * 100)
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Revenue Tracker
          </CardTitle>
          {dailyProgress >= 100 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              <Badge className="bg-success/10 text-success gap-1">
                <Trophy className="w-3 h-3" />
                Daily Goal Hit!
              </Badge>
            </motion.div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Hero: Daily Revenue with Circular Progress */}
        <div className="flex items-center gap-6">
          {/* Circular progress */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={dailyProgress >= 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - animatedProgress / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-foreground">{Math.round(animatedProgress)}%</span>
              <span className="text-[10px] text-muted-foreground">of daily</span>
            </div>
          </div>

          {/* Revenue details */}
          <div className="flex-1 space-y-1">
            <p className="text-3xl font-bold text-foreground">
              ${data?.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 }) || '0'}
            </p>
            <p className="text-sm text-muted-foreground">
              of ${data?.dailyGoal.toLocaleString()} daily goal
            </p>
            {todayChange !== 0 && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                todayChange > 0 ? "text-success" : "text-destructive"
              )}>
                {todayChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(todayChange).toFixed(0)}% vs yesterday
              </div>
            )}
          </div>
        </div>

        {/* Appointments Today Mini */}
        <div className="flex gap-3">
          <div className="flex-1 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Appointments</span>
            </div>
            <p className="text-lg font-bold text-foreground">{data?.todayAppointments || 0}</p>
          </div>
          <div className="flex-1 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="text-lg font-bold text-foreground">{data?.completedToday || 0}</p>
          </div>
        </div>

        {/* Weekly & Monthly Progress Bars */}
        <div className="space-y-3 pt-2 border-t border-border">
          <GoalBar 
            label="Weekly" 
            current={data?.weekRevenue || 0} 
            goal={data?.weeklyGoal || 12000} 
            progress={weeklyProgress}
            change={weekChange}
          />
          <GoalBar 
            label="Monthly" 
            current={data?.monthRevenue || 0} 
            goal={data?.monthlyGoal || 50000} 
            progress={monthlyProgress}
          />
        </div>

        {/* Streak indicator */}
        {dailyProgress >= 80 && dailyProgress < 100 && (
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium"
          >
            <Flame className="w-4 h-4" />
            ${((data?.dailyGoal || 2000) - (data?.todayRevenue || 0)).toLocaleString()} to hit today's goal!
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function GoalBar({ label, current, goal, progress, change }: {
  label: string;
  current: number;
  goal: number;
  progress: number;
  change?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            ${current.toLocaleString()} / ${goal.toLocaleString()}
          </span>
          {change !== undefined && change !== 0 && (
            <span className={cn(
              "text-xs",
              change > 0 ? "text-success" : "text-destructive"
            )}>
              {change > 0 ? '+' : ''}{change.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
