import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrendingUp, 
  Target, 
  RefreshCw, 
  Trophy, 
  Zap,
  DollarSign,
  Users,
  PartyPopper,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface GoalMetrics {
  todaySales: number;
  transactionCount: number;
  atv: number;
  rebookingRate: number;
  completedAppointments: number;
  rebookedCount: number;
  dailyGoal: number;
  goalAchieved: boolean;
  bonusRate: number;
}

export function LiveGoalsWidget() {
  const { staff } = useAuth();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = useState(false);
  const [previousGoalAchieved, setPreviousGoalAchieved] = useState(false);

  // Fetch today's metrics
  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ['live-goals', staff?.id],
    queryFn: async (): Promise<GoalMetrics> => {
      if (!staff?.id) {
        return {
          todaySales: 0,
          transactionCount: 0,
          atv: 0,
          rebookingRate: 0,
          completedAppointments: 0,
          rebookedCount: 0,
          dailyGoal: 500,
          goalAchieved: false,
          bonusRate: 5,
        };
      }

      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;

      // Fetch today's transactions for this staff member
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('staff_id', staff.id)
        .gte('transaction_date', startOfDay)
        .lte('transaction_date', endOfDay);

      const todaySales = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const transactionCount = transactions?.length || 0;
      const atv = transactionCount > 0 ? todaySales / transactionCount : 0;

      // Fetch completed appointments today
      const { data: completedAppts } = await supabase
        .from('appointments')
        .select('client_id')
        .eq('staff_id', staff.id)
        .eq('status', 'completed')
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay);

      const completedAppointments = completedAppts?.length || 0;

      // Check for rebooked clients (clients with future appointments)
      let rebookedCount = 0;
      if (completedAppts && completedAppts.length > 0) {
        const clientIds = completedAppts.map(a => a.client_id).filter(Boolean);
        if (clientIds.length > 0) {
          const { data: futureAppts } = await supabase
            .from('appointments')
            .select('client_id')
            .in('client_id', clientIds)
            .gt('scheduled_at', endOfDay)
            .in('status', ['scheduled', 'confirmed']);
          
          rebookedCount = new Set(futureAppts?.map(a => a.client_id)).size;
        }
      }

      const rebookingRate = completedAppointments > 0 
        ? (rebookedCount / completedAppointments) * 100 
        : 0;

      // Get or create today's goal
      let { data: goalData } = await supabase
        .from('staff_goals')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('goal_date', today)
        .single();

      if (!goalData) {
        const { data: newGoal } = await supabase
          .from('staff_goals')
          .insert({
            staff_id: staff.id,
            goal_date: today,
            daily_sales_goal: 500,
          })
          .select()
          .single();
        goalData = newGoal;
      }

      return {
        todaySales,
        transactionCount,
        atv,
        rebookingRate,
        completedAppointments,
        rebookedCount,
        dailyGoal: Number(goalData?.daily_sales_goal) || 500,
        goalAchieved: goalData?.goal_achieved || false,
        bonusRate: Number(goalData?.bonus_commission_rate) || 5,
      };
    },
    enabled: !!staff?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Check and update goal achievement
  const achieveGoalMutation = useMutation({
    mutationFn: async () => {
      if (!staff?.id || !metrics) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('staff_goals')
        .update({
          goal_achieved: true,
          achieved_at: new Date().toISOString(),
        })
        .eq('staff_id', staff.id)
        .eq('goal_date', today);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-goals'] });
    },
  });

  // Trigger celebration when goal is achieved
  const triggerCelebration = useCallback(() => {
    setShowCelebration(true);
    
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB'],
    });

    // Show toast notification
    toast.success(
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-warning" />
        <div>
          <p className="font-semibold">Goal Achieved! 🎉</p>
          <p className="text-sm opacity-90">+{metrics?.bonusRate}% commission bonus unlocked!</p>
        </div>
      </div>,
      { duration: 5000 }
    );

    setTimeout(() => setShowCelebration(false), 3000);
  }, [metrics?.bonusRate]);

  // Check for goal achievement
  useEffect(() => {
    if (!metrics || !staff?.id) return;

    const goalProgress = (metrics.todaySales / metrics.dailyGoal) * 100;
    const justAchieved = goalProgress >= 100 && !metrics.goalAchieved && !previousGoalAchieved;

    if (justAchieved) {
      achieveGoalMutation.mutate();
      triggerCelebration();
      setPreviousGoalAchieved(true);
    }
  }, [metrics, staff?.id, previousGoalAchieved, achieveGoalMutation, triggerCelebration]);

  // Set up realtime subscription
  useEffect(() => {
    if (!staff?.id) return;

    const channel = supabase
      .channel('live-goals-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `staff_id=eq.${staff.id}`,
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `staff_id=eq.${staff.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staff?.id, refetch]);

  if (!staff) return null;

  const goalProgress = metrics ? Math.min((metrics.todaySales / metrics.dailyGoal) * 100, 100) : 0;
  const isCloseToGoal = goalProgress >= 80 && goalProgress < 100;

  return (
    <Card className={cn(
      "card-luxury relative overflow-hidden transition-all duration-500",
      showCelebration && "ring-2 ring-warning ring-offset-2 ring-offset-background",
      metrics?.goalAchieved && "bg-gradient-to-br from-warning/5 to-transparent"
    )}>
      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-warning/20 via-primary/20 to-success/20 pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Live Goals
            {metrics?.goalAchieved && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-medium"
              >
                <Trophy className="w-3 h-3" />
                Goal Hit!
              </motion.div>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Daily Sales Goal Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily Sales Goal</span>
            <span className="font-semibold">
              ${metrics?.todaySales.toFixed(0) || 0} / ${metrics?.dailyGoal || 500}
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={goalProgress} 
              className={cn(
                "h-3 transition-all duration-500",
                metrics?.goalAchieved && "[&>div]:bg-warning"
              )}
            />
            {isCloseToGoal && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute -right-1 -top-1"
              >
                <Zap className="w-4 h-4 text-warning" />
              </motion.div>
            )}
          </div>
          {metrics?.goalAchieved && (
            <p className="text-xs text-warning flex items-center gap-1">
              <Star className="w-3 h-3" />
              +{metrics.bonusRate}% bonus commission active!
            </p>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Average Ticket Value */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-secondary/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Avg Ticket (ATV)</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              ${metrics?.atv.toFixed(0) || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics?.transactionCount || 0} transactions
            </p>
          </motion.div>

          {/* Rebooking Rate */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 rounded-lg bg-secondary/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Rebook Rate</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {metrics?.rebookingRate.toFixed(0) || 0}%
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics?.rebookedCount || 0}/{metrics?.completedAppointments || 0} rebooked
            </p>
          </motion.div>
        </div>

        {/* Motivational Message */}
        <div className={cn(
          "text-center py-2 px-3 rounded-lg text-sm",
          metrics?.goalAchieved 
            ? "bg-warning/10 text-warning" 
            : isCloseToGoal 
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
        )}>
          {metrics?.goalAchieved ? (
            <span className="flex items-center justify-center gap-2">
              <PartyPopper className="w-4 h-4" />
              Amazing work today! Keep it up!
            </span>
          ) : isCloseToGoal ? (
            <span className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Almost there! ${(metrics?.dailyGoal || 500) - (metrics?.todaySales || 0)} to go!
            </span>
          ) : (
            <span>
              {goalProgress > 0 
                ? `${goalProgress.toFixed(0)}% toward your daily goal`
                : "Start booking to track your progress!"
              }
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
