import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DollarSign, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight,
  Target, Users, Repeat, UserPlus, Sparkles, Trophy, Pencil, Check, X
} from 'lucide-react';
import { startOfWeek, endOfWeek, subWeeks, format, subDays } from 'date-fns';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MetricData {
  label: string;
  value: string;
  previousValue: number;
  currentValue: number;
  suffix?: string;
  icon: React.ElementType;
  sparkline: number[];
  isCurrency?: boolean;
  isPercent?: boolean;
}

export default function PerformanceScorecard() {
  const { staff } = useAuth();
  const staffId = staff?.id;

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [rank, setRank] = useState<{ position: number; total: number; aboveAvgPct: number } | null>(null);
  const [goals, setGoals] = useState<{ revenue_goal: number; appointments_goal: number } | null>(null);
  const [currentRevenue, setCurrentRevenue] = useState(0);
  const [currentAppts, setCurrentAppts] = useState(0);
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ revenue: '2000', appointments: '15' });

  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  useEffect(() => {
    if (staffId) fetchAll();
  }, [staffId]);

  const fetchAll = async () => {
    if (!staffId) return;
    setLoading(true);

    const [txThisRes, txLastRes, apThisRes, apLastRes, upsellThisRes, upsellLastRes, allProvTxRes, goalsRes] = await Promise.all([
      // Transactions this week
      supabase.from('transactions').select('amount, transaction_date')
        .eq('staff_id', staffId).gte('transaction_date', thisWeekStart.toISOString()).lte('transaction_date', thisWeekEnd.toISOString()),
      // Transactions last week
      supabase.from('transactions').select('amount')
        .eq('staff_id', staffId).gte('transaction_date', lastWeekStart.toISOString()).lte('transaction_date', lastWeekEnd.toISOString()),
      // Appointments this week
      supabase.from('appointments').select('id, client_id, status, scheduled_at, total_amount')
        .eq('staff_id', staffId).gte('scheduled_at', thisWeekStart.toISOString()).lte('scheduled_at', thisWeekEnd.toISOString()),
      // Appointments last week
      supabase.from('appointments').select('id, client_id, status, total_amount')
        .eq('staff_id', staffId).gte('scheduled_at', lastWeekStart.toISOString()).lte('scheduled_at', lastWeekEnd.toISOString()),
      // Upsells this week
      supabase.from('upsell_logs').select('action')
        .eq('staff_id', staffId).gte('created_at', thisWeekStart.toISOString()).lte('created_at', thisWeekEnd.toISOString()),
      // Upsells last week
      supabase.from('upsell_logs').select('action')
        .eq('staff_id', staffId).gte('created_at', lastWeekStart.toISOString()).lte('created_at', lastWeekEnd.toISOString()),
      // All provider transactions this week (for ranking)
      supabase.from('transactions').select('staff_id, amount')
        .gte('transaction_date', thisWeekStart.toISOString()).lte('transaction_date', thisWeekEnd.toISOString()),
      // Goals
      supabase.from('staff_weekly_goals' as any).select('*')
        .eq('staff_id', staffId).eq('week_start', format(thisWeekStart, 'yyyy-MM-dd')).maybeSingle(),
    ]);

    const txThis = txThisRes.data || [];
    const txLast = txLastRes.data || [];
    const apThis = (apThisRes.data || []).filter((a: any) => a.status === 'completed');
    const apLast = (apLastRes.data || []).filter((a: any) => a.status === 'completed');
    const upsellThis = upsellThisRes.data || [];
    const upsellLast = upsellLastRes.data || [];

    // Revenue
    const revThis = txThis.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const revLast = txLast.reduce((s: number, t: any) => s + Number(t.amount), 0);

    // Build daily sparkline for revenue (Mon-Sun)
    const revSparkline = Array(7).fill(0);
    txThis.forEach((t: any) => {
      const day = new Date(t.transaction_date).getDay();
      const idx = day === 0 ? 6 : day - 1; // Mon=0, Sun=6
      revSparkline[idx] += Number(t.amount);
    });

    // Appointments completed
    const apThisCount = apThis.length;
    const apLastCount = apLast.length;
    const apSparkline = Array(7).fill(0);
    apThis.forEach((a: any) => {
      const day = new Date(a.scheduled_at).getDay();
      const idx = day === 0 ? 6 : day - 1;
      apSparkline[idx] += 1;
    });

    // Avg service value
    const avgThis = apThisCount > 0 ? apThis.reduce((s: number, a: any) => s + Number(a.total_amount), 0) / apThisCount : 0;
    const avgLast = apLastCount > 0 ? apLast.reduce((s: number, a: any) => s + Number(a.total_amount), 0) / apLastCount : 0;

    // Upsells
    const upsellAcceptedThis = upsellThis.filter((u: any) => u.action === 'accepted').length;
    const upsellShownThis = upsellThis.length;
    const upsellAcceptedLast = upsellLast.filter((u: any) => u.action === 'accepted').length;
    const upsellRateThis = upsellShownThis > 0 ? (upsellAcceptedThis / upsellShownThis) * 100 : 0;
    const upsellRateLast = upsellLast.length > 0 ? (upsellAcceptedLast / upsellLast.length) * 100 : 0;

    // Retention (clients who rebooked within 60 days)
    const clientIdsThis = [...new Set(apThis.map((a: any) => a.client_id).filter(Boolean))];
    let retentionThis = 0;
    if (clientIdsThis.length > 0) {
      const { data: rebooked } = await supabase.from('appointments').select('client_id')
        .in('client_id', clientIdsThis as string[])
        .eq('staff_id', staffId!)
        .gte('scheduled_at', subDays(thisWeekStart, 60).toISOString())
        .lt('scheduled_at', thisWeekStart.toISOString())
        .eq('status', 'completed');
      const rebookedIds = new Set((rebooked || []).map((r: any) => r.client_id));
      retentionThis = clientIdsThis.length > 0 ? (rebookedIds.size / clientIdsThis.length) * 100 : 0;
    }

    // New clients (first visit with this provider)
    let newClientsThis = 0;
    if (clientIdsThis.length > 0) {
      const { data: priorAppts } = await supabase.from('appointments').select('client_id')
        .in('client_id', clientIdsThis as string[])
        .eq('staff_id', staffId!)
        .lt('scheduled_at', thisWeekStart.toISOString())
        .eq('status', 'completed');
      const priorIds = new Set((priorAppts || []).map((a: any) => a.client_id));
      newClientsThis = clientIdsThis.filter(id => !priorIds.has(id)).length;
    }

    // Build metrics
    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    setMetrics([
      { label: 'Revenue Generated', value: fmt(revThis), currentValue: revThis, previousValue: revLast, icon: DollarSign, sparkline: revSparkline, isCurrency: true },
      { label: 'Appointments Completed', value: String(apThisCount), currentValue: apThisCount, previousValue: apLastCount, icon: Calendar, sparkline: apSparkline },
      { label: 'Avg Service Value', value: fmt(avgThis), currentValue: avgThis, previousValue: avgLast, icon: TrendingUp, sparkline: [], isCurrency: true },
      { label: 'Upsells Accepted', value: `${upsellAcceptedThis} (${upsellRateThis.toFixed(0)}%)`, currentValue: upsellRateThis, previousValue: upsellRateLast, icon: Sparkles, sparkline: [] },
      { label: 'Client Retention', value: `${retentionThis.toFixed(0)}%`, currentValue: retentionThis, previousValue: 0, icon: Repeat, sparkline: [], isPercent: true },
      { label: 'New Clients Seen', value: String(newClientsThis), currentValue: newClientsThis, previousValue: 0, icon: UserPlus, sparkline: [] },
    ]);

    setCurrentRevenue(revThis);
    setCurrentAppts(apThisCount);

    // Ranking
    const allTx = allProvTxRes.data || [];
    const revByProvider: Record<string, number> = {};
    allTx.forEach((t: any) => {
      if (t.staff_id) revByProvider[t.staff_id] = (revByProvider[t.staff_id] || 0) + Number(t.amount);
    });
    const sorted = Object.entries(revByProvider).sort((a, b) => b[1] - a[1]);
    const myIdx = sorted.findIndex(([id]) => id === staffId);
    const totalProviders = sorted.length;
    const avgRev = totalProviders > 0 ? sorted.reduce((s, [, v]) => s + v, 0) / totalProviders : 0;
    const myRev = revByProvider[staffId!] || 0;
    const aboveAvg = avgRev > 0 ? ((myRev - avgRev) / avgRev) * 100 : 0;

    if (totalProviders > 0) {
      setRank({ position: myIdx + 1, total: totalProviders, aboveAvgPct: Math.round(aboveAvg) });
    }

    // Goals
    const goalsData = goalsRes.data as any;
    if (goalsData) {
      setGoals({ revenue_goal: Number(goalsData.revenue_goal), appointments_goal: Number(goalsData.appointments_goal) });
      setGoalDraft({ revenue: String(goalsData.revenue_goal), appointments: String(goalsData.appointments_goal) });
    }

    setLoading(false);
  };

  const saveGoals = async () => {
    if (!staffId) return;
    const weekStart = format(thisWeekStart, 'yyyy-MM-dd');
    const payload = {
      staff_id: staffId,
      week_start: weekStart,
      revenue_goal: Number(goalDraft.revenue) || 2000,
      appointments_goal: Number(goalDraft.appointments) || 15,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase.from('staff_weekly_goals' as any) as any).upsert(payload, { onConflict: 'staff_id,week_start' });
    if (!error) {
      setGoals({ revenue_goal: payload.revenue_goal, appointments_goal: payload.appointments_goal });
      setEditingGoals(false);
    }
  };

  const getDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const revGoal = goals?.revenue_goal || 2000;
  const apGoal = goals?.appointments_goal || 15;
  const revProgress = Math.min((currentRevenue / revGoal) * 100, 100);
  const apProgress = Math.min((currentAppts / apGoal) * 100, 100);
  const fmtCurr = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m, i) => {
          const delta = getDelta(m.currentValue, m.previousValue);
          const isUp = delta >= 0;
          const showDelta = m.previousValue > 0 || m.currentValue > 0;

          return (
            <Card key={i} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <m.icon className="w-4 h-4 text-primary" />
                  </div>
                  {showDelta && (
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(delta).toFixed(0)}%
                    </div>
                  )}
                </div>
                <p className="text-2xl font-heading font-bold text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                {m.sparkline.length > 0 && (
                  <div className="mt-3 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={m.sparkline.map((v, idx) => ({ v, idx }))}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="hsl(var(--primary))"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Leaderboard Preview + Personal Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leaderboard Preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-lg">Your Ranking</CardTitle>
            </div>
            <CardDescription>This week's provider leaderboard</CardDescription>
          </CardHeader>
          <CardContent>
            {rank ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-heading font-bold text-xl shadow-lg">
                    #{rank.position}
                  </div>
                  <div>
                    <p className="text-foreground font-semibold text-lg">
                      Ranked #{rank.position} of {rank.total} providers
                    </p>
                    <p className={`text-sm font-medium ${rank.aboveAvgPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {rank.aboveAvgPct >= 0 ? `${rank.aboveAvgPct}% above` : `${Math.abs(rank.aboveAvgPct)}% below`} the team average for revenue
                    </p>
                  </div>
                </div>
                {/* Blurred anonymous bars */}
                <div className="space-y-2 mt-4">
                  {Array.from({ length: Math.min(rank.total, 5) }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className={`text-xs font-mono w-6 text-right ${idx + 1 === rank.position ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        #{idx + 1}
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${idx + 1 === rank.position ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                          style={{ width: `${100 - idx * 15}%` }}
                        />
                      </div>
                      {idx + 1 === rank.position && (
                        <span className="text-xs font-medium text-primary">You</span>
                      )}
                      {idx + 1 !== rank.position && (
                        <span className="text-xs text-muted-foreground/50 blur-[2px] select-none">Provider</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No ranking data available this week.</p>
            )}
          </CardContent>
        </Card>

        {/* Personal Goals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Weekly Goals</CardTitle>
              </div>
              {!editingGoals ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingGoals(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveGoals}>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingGoals(false)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>
            <CardDescription>Resets every Monday</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Revenue Goal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  Revenue Goal
                </span>
                {editingGoals ? (
                  <Input
                    type="number"
                    value={goalDraft.revenue}
                    onChange={(e) => setGoalDraft(d => ({ ...d, revenue: e.target.value }))}
                    className="w-24 h-7 text-xs text-right"
                  />
                ) : (
                  <span className="text-muted-foreground">
                    {fmtCurr(currentRevenue)} / {fmtCurr(revGoal)}
                  </span>
                )}
              </div>
              <Progress value={revProgress} className="h-3" />
              {revProgress >= 100 && (
                <p className="text-xs text-emerald-600 font-medium">🎉 Goal reached!</p>
              )}
            </div>

            {/* Appointments Goal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  Appointments Goal
                </span>
                {editingGoals ? (
                  <Input
                    type="number"
                    value={goalDraft.appointments}
                    onChange={(e) => setGoalDraft(d => ({ ...d, appointments: e.target.value }))}
                    className="w-24 h-7 text-xs text-right"
                  />
                ) : (
                  <span className="text-muted-foreground">
                    {currentAppts} / {apGoal}
                  </span>
                )}
              </div>
              <Progress value={apProgress} className="h-3" />
              {apProgress >= 100 && (
                <p className="text-xs text-emerald-600 font-medium">🎉 Goal reached!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
