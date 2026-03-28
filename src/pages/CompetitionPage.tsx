import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Trophy, Medal, TrendingUp, Calendar, Sparkles, ArrowUp, ArrowDown, Minus, Crown, Star, Clock, Target, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, differenceInDays, getDaysInMonth, subWeeks } from 'date-fns';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface StaffSales {
  staff_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  total_sales: number;
  appointment_count: number;
  upsell_count: number;
  weekly_trend: number[];
  prev_total_sales: number;
  revenue_goal: number | null;
  appointments_goal: number | null;
}

interface CompetitionSettings {
  prize_description: string;
  is_visible: boolean;
  primary_metric: 'revenue' | 'appointments' | 'upsells' | 'combined';
  monthly_revenue_goal: number;
}

const DEFAULT_SETTINGS: CompetitionSettings = {
  prize_description: '🏆 Prize: $200 bonus + Elita Champion title',
  is_visible: true,
  primary_metric: 'revenue',
  monthly_revenue_goal: 50000,
};

export function CompetitionPage() {
  const { staff: currentStaff } = useUnifiedAuth();
  const staffId = currentStaff?.id;
  const [leaderboard, setLeaderboard] = useState<StaffSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [settings, setSettings] = useState<CompetitionSettings>(DEFAULT_SETTINGS);
  const [prevOrder, setPrevOrder] = useState<string[]>([]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { value: format(date, 'yyyy-MM'), label: format(date, 'MMMM yyyy') };
  });

  // Load competition settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('value')
        .eq('key', 'competition_settings')
        .maybeSingle();
      if (data?.value) {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.value as Record<string, any>) });
      }
    })();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedMonth, viewMode]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('competition-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchLeaderboard();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchLeaderboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedMonth, viewMode]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const monthEnd = endOfMonth(monthStart);

      let rangeStart: Date, rangeEnd: Date;
      if (viewMode === 'weekly') {
        rangeStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        rangeEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      } else {
        rangeStart = monthStart;
        rangeEnd = monthEnd;
      }

      // Previous period for "most improved"
      const prevStart = viewMode === 'weekly'
        ? startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })
        : startOfMonth(subMonths(monthStart, 1));
      const prevEnd = viewMode === 'weekly'
        ? endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })
        : endOfMonth(subMonths(monthStart, 1));

      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

      const [txRes, prevTxRes, aptRes, upsellRes, staffRes, weeklyTxRes, goalsRes] = await Promise.all([
        supabase.from('transactions').select('staff_id, amount, transaction_type')
          .gte('transaction_date', rangeStart.toISOString())
          .lte('transaction_date', rangeEnd.toISOString())
          .in('transaction_type', ['service', 'retail']),
        supabase.from('transactions').select('staff_id, amount')
          .gte('transaction_date', prevStart.toISOString())
          .lte('transaction_date', prevEnd.toISOString())
          .in('transaction_type', ['service', 'retail']),
        supabase.from('appointments').select('staff_id')
          .gte('scheduled_at', rangeStart.toISOString())
          .lte('scheduled_at', rangeEnd.toISOString())
          .eq('status', 'completed'),
        supabase.from('upsell_logs').select('staff_id')
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString())
          .eq('action', 'accepted'),
        supabase.from('staff').select('id, first_name, last_name, avatar_url').eq('is_active', true),
        // Weekly trend: last 4 weeks
        supabase.from('transactions').select('staff_id, amount, transaction_date')
          .gte('transaction_date', subWeeks(new Date(), 4).toISOString())
          .lte('transaction_date', new Date().toISOString())
          .in('transaction_type', ['service', 'retail']),
        // Weekly goals for current week
        supabase.from('staff_weekly_goals')
          .select('staff_id, revenue_goal, appointments_goal')
          .eq('week_start', format(currentWeekStart, 'yyyy-MM-dd')),
      ]);

      const transactions = txRes.data || [];
      const prevTransactions = prevTxRes.data || [];
      const appointments = aptRes.data || [];
      const upsells = upsellRes.data || [];
      const staffData = staffRes.data || [];
      const weeklyTx = weeklyTxRes.data || [];
      const goalsData = goalsRes.data || [];

      // Goals map
      const goalsMap: Record<string, { revenue_goal: number; appointments_goal: number }> = {};
      goalsData.forEach((g: any) => {
        if (g.staff_id) goalsMap[g.staff_id] = { revenue_goal: g.revenue_goal, appointments_goal: g.appointments_goal };
      });

      // Aggregate current
      const salesMap: Record<string, number> = {};
      transactions.forEach(tx => {
        if (tx.staff_id) salesMap[tx.staff_id] = (salesMap[tx.staff_id] || 0) + Number(tx.amount);
      });

      const prevSalesMap: Record<string, number> = {};
      prevTransactions.forEach(tx => {
        if (tx.staff_id) prevSalesMap[tx.staff_id] = (prevSalesMap[tx.staff_id] || 0) + Number(tx.amount);
      });

      const aptMap: Record<string, number> = {};
      appointments.forEach(a => {
        if (a.staff_id) aptMap[a.staff_id] = (aptMap[a.staff_id] || 0) + 1;
      });

      const upsellMap: Record<string, number> = {};
      upsells.forEach(u => {
        if (u.staff_id) upsellMap[u.staff_id] = (upsellMap[u.staff_id] || 0) + 1;
      });

      // Weekly trend (4 buckets)
      const weekBuckets = [3, 2, 1, 0].map(i => {
        const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const we = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        return { start: ws, end: we };
      });

      const trendMap: Record<string, number[]> = {};
      staffData.forEach(s => { trendMap[s.id] = [0, 0, 0, 0]; });
      weeklyTx.forEach(tx => {
        if (!tx.staff_id) return;
        const d = new Date(tx.transaction_date);
        weekBuckets.forEach((b, idx) => {
          if (d >= b.start && d <= b.end) {
            if (!trendMap[tx.staff_id]) trendMap[tx.staff_id] = [0, 0, 0, 0];
            trendMap[tx.staff_id][idx] += Number(tx.amount);
          }
        });
      });

      const getSortValue = (s: StaffSales) => {
        switch (settings.primary_metric) {
          case 'appointments': return s.appointment_count;
          case 'upsells': return s.upsell_count;
          case 'combined': return s.total_sales + (s.appointment_count * 100) + (s.upsell_count * 50);
          default: return s.total_sales;
        }
      };

      const board: StaffSales[] = staffData.map(s => ({
        staff_id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        avatar_url: s.avatar_url,
        total_sales: salesMap[s.id] || 0,
        appointment_count: aptMap[s.id] || 0,
        upsell_count: upsellMap[s.id] || 0,
        weekly_trend: trendMap[s.id] || [0, 0, 0, 0],
        prev_total_sales: prevSalesMap[s.id] || 0,
        revenue_goal: goalsMap[s.id]?.revenue_goal ?? null,
        appointments_goal: goalsMap[s.id]?.appointments_goal ?? null,
      }));

      board.sort((a, b) => getSortValue(b) - getSortValue(a));

      // Store previous order for animation detection
      setPrevOrder(leaderboard.map(s => s.staff_id));
      setLeaderboard(board);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = leaderboard.reduce((s, l) => s + l.total_sales, 0);
  const myIndex = leaderboard.findIndex(s => s.staff_id === staffId);
  const myData = myIndex >= 0 ? leaderboard[myIndex] : null;
  const myRank = myIndex + 1;

  // Most improved
  const mostImproved = useMemo(() => {
    if (leaderboard.length === 0) return null;
    let best: StaffSales | null = null;
    let bestDelta = -Infinity;
    leaderboard.forEach(s => {
      const delta = s.total_sales - s.prev_total_sales;
      if (delta > bestDelta && delta > 0) {
        bestDelta = delta;
        best = s;
      }
    });
    return best ? { staff: best, delta: bestDelta } : null;
  }, [leaderboard]);

  // Month progress
  const [yr, mo] = selectedMonth.split('-').map(Number);
  const monthDate = new Date(yr, mo - 1);
  const daysInMonth = getDaysInMonth(monthDate);
  const today = new Date();
  const daysPassed = Math.min(differenceInDays(today, startOfMonth(monthDate)) + 1, daysInMonth);
  const daysRemaining = Math.max(daysInMonth - daysPassed, 0);
  const monthProgress = (daysPassed / daysInMonth) * 100;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-7 h-7 text-warning" />;
      case 2: return <Medal className="w-6 h-6 text-muted-foreground" />;
      case 3: return <Medal className="w-6 h-6 text-primary" />;
      default: return <span className="text-xl font-heading font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-warning/10 border-warning/30';
      case 2: return 'bg-muted/50 border-border';
      case 3: return 'bg-primary/10 border-primary/30';
      default: return 'bg-card border-border/50';
    }
  };

  const didMoveUp = (staffId: string) => {
    const oldIdx = prevOrder.indexOf(staffId);
    const newIdx = leaderboard.findIndex(s => s.staff_id === staffId);
    return oldIdx >= 0 && newIdx >= 0 && newIdx < oldIdx;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            Sales Competition
          </h1>
          <p className="text-muted-foreground mt-1">See who's leading the pack</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <Button
              size="sm"
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              onClick={() => setViewMode('monthly')}
              className="h-8 text-xs"
            >
              Monthly
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'weekly' ? 'default' : 'ghost'}
              onClick={() => setViewMode('weekly')}
              className="h-8 text-xs"
            >
              Weekly
            </Button>
          </div>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Personal Stats Card */}
      {myData && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-foreground">
                Your Standing — {format(monthDate, 'MMMM yyyy')}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Your Rank</p>
                <p className="text-3xl font-heading font-bold text-foreground">#{myRank}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Revenue</p>
                <p className="text-2xl font-heading font-bold text-foreground">${myData.total_sales.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Appointments</p>
                <p className="text-2xl font-heading font-bold text-foreground">{myData.appointment_count}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Upsells</p>
                <p className="text-2xl font-heading font-bold text-foreground">{myData.upsell_count}</p>
              </div>
            </div>

            {/* Gap info */}
            {leaderboard.length > 1 && (
              <div className="mt-4 pt-4 border-t border-border/50 space-y-1.5">
                {myRank > 1 && (
                  <p className="text-sm text-muted-foreground">
                    <ArrowUp className="w-3.5 h-3.5 inline text-success mr-1" />
                    ${(leaderboard[myRank - 2].total_sales - myData.total_sales).toLocaleString()} behind{' '}
                    <span className="font-medium text-foreground">
                      {leaderboard[myRank - 2].first_name} {leaderboard[myRank - 2].last_name}
                    </span>
                  </p>
                )}
                {myRank < leaderboard.length && (
                  <p className="text-sm text-muted-foreground">
                    <ArrowDown className="w-3.5 h-3.5 inline text-primary mr-1" />
                    ${(myData.total_sales - leaderboard[myRank].total_sales).toLocaleString()} ahead of{' '}
                    <span className="font-medium text-foreground">
                      {leaderboard[myRank].first_name} {leaderboard[myRank].last_name}
                    </span>
                  </p>
                )}
                {myRank > 1 && (
                  <p className="text-sm font-medium text-primary mt-2 italic">
                    You're ${(leaderboard[0].total_sales - myData.total_sales).toLocaleString()} away from first place. You've got this. 💪
                  </p>
                )}
                {myRank === 1 && (
                  <p className="text-sm font-medium text-primary mt-2 italic">
                    You're in the lead! Keep pushing. 🏆
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prize / Progress Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {viewMode === 'monthly' ? 'Monthly' : 'Weekly'} Competition
              </p>
              <p className="text-lg font-heading font-bold text-foreground">
                {leaderboard.length} team member{leaderboard.length !== 1 ? 's' : ''} competing
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-primary/40" />
          </div>

          {settings.prize_description && (
            <p className="text-sm font-medium text-foreground">{settings.prize_description}</p>
          )}

          {viewMode === 'monthly' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                </span>
                <span>{Math.round(monthProgress)}% elapsed</span>
              </div>
              <Progress value={monthProgress} className="h-2" />
            </div>
          )}

          {settings.monthly_revenue_goal > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Team Revenue Goal
                </span>
                <span>${totalSales.toLocaleString()} / ${settings.monthly_revenue_goal.toLocaleString()}</span>
              </div>
              <Progress value={Math.min((totalSales / settings.monthly_revenue_goal) * 100, 100)} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {viewMode === 'monthly' ? 'Monthly' : 'Weekly'} Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sales data for this period</p>
          ) : (
            <LayoutGroup>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {leaderboard.map((staff, index) => {
                    const rank = index + 1;
                    const movedUp = didMoveUp(staff.staff_id);
                    const goalPct = staff.revenue_goal ? Math.min((staff.total_sales / staff.revenue_goal) * 100, 120) : null;
                    const goalBarColor = goalPct === null ? '' :
                      goalPct >= 100 ? '[&>div]:bg-amber-500' :
                      goalPct >= 80 ? '[&>div]:bg-success' :
                      goalPct >= 50 ? '[&>div]:bg-amber-400' :
                      '[&>div]:bg-destructive';
                    const isMe = staff.staff_id === staffId;
                    return (
                      <motion.div
                        key={staff.staff_id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          boxShadow: movedUp ? '0 0 20px hsl(34 48% 56% / 0.3)' : 'none',
                        }}
                        transition={{ layout: { type: 'spring', damping: 25 }, delay: index * 0.03 }}
                        className={`p-4 rounded-xl border transition-colors ${getRankStyles(rank)} ${
                          isMe ? 'ring-2 ring-primary/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank */}
                          <div className="w-10 flex items-center justify-center shrink-0">
                            {getRankIcon(rank)}
                          </div>

                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                            {staff.avatar_url ? (
                              <img src={staff.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-primary font-semibold text-sm">
                                {staff.first_name[0]}{staff.last_name[0]}
                              </span>
                            )}
                          </div>

                          {/* Name + Goal info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-heading font-semibold text-foreground truncate">
                              {staff.first_name} {staff.last_name}
                            </p>
                            {staff.appointments_goal ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {staff.appointment_count} / {staff.appointments_goal} appts
                              </p>
                            ) : null}
                          </div>

                          {/* Revenue + Goal */}
                          <div className="hidden md:flex items-center gap-4 text-sm">
                            <div className="text-right min-w-[80px]">
                              <p className="text-xs text-muted-foreground">Revenue</p>
                              <p className="font-semibold text-foreground">${staff.total_sales.toLocaleString()}</p>
                            </div>
                            {staff.revenue_goal ? (
                              <div className="text-right min-w-[70px]">
                                <p className="text-xs text-muted-foreground">Goal</p>
                                <p className="font-semibold text-foreground">${staff.revenue_goal.toLocaleString()}</p>
                              </div>
                            ) : null}
                          </div>

                          {/* Sparkline */}
                          <div className="w-16 h-8 shrink-0 hidden sm:block">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={staff.weekly_trend.map((v, i) => ({ v, i }))}>
                                <defs>
                                  <linearGradient id={`grad-${staff.staff_id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} fill={`url(#grad-${staff.staff_id})`} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Trend */}
                          <div className="shrink-0">
                            {staff.total_sales > staff.prev_total_sales ? (
                              <ArrowUp className="w-4 h-4 text-success" />
                            ) : staff.total_sales < staff.prev_total_sales ? (
                              <ArrowDown className="w-4 h-4 text-destructive" />
                            ) : (
                              <Minus className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Goal Progress Bar */}
                        {staff.revenue_goal ? (
                          <div className="mt-3 ml-[52px]">
                            <Progress value={Math.min(goalPct!, 100)} className={`h-2 ${goalBarColor}`} />
                            {goalPct! >= 100 && (
                              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                🎯 Goal reached!
                              </p>
                            )}
                          </div>
                        ) : isMe ? (
                          <SetGoalInline staffId={staff.staff_id} onSaved={fetchLeaderboard} />
                        ) : null}
                      </motion.div>
                    );
                  })}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          )}
        </CardContent>
      </Card>

      {/* Most Improved */}
      {mostImproved && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-warning/15">
                <Star className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                  Most Improved This Week 📈
                </p>
                <p className="font-heading font-semibold text-foreground">
                  {mostImproved.staff.first_name} {mostImproved.staff.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  +${mostImproved.delta.toLocaleString()} vs last{' '}
                  {viewMode === 'weekly' ? 'week' : 'month'}
                </p>
              </div>
              <Badge className="ml-auto bg-warning/15 text-warning border-warning/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Rising Star
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
