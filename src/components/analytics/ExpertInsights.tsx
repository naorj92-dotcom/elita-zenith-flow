import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Users, Calendar, DollarSign, RefreshCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './DateRangeFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface ExpertInsightsProps {
  dateRange: DateRange;
}

interface InsightsData {
  // Breakeven
  totalRevenue: number;
  totalCOGS: number;
  totalLabor: number;
  netProfit: number;
  profitMargin: number;

  // Client Retention
  newClients: number;
  returningClients: number;
  retentionRate: number;
  rebookingRate: number;

  // Peak Performance
  hourlyData: { hour: string; count: number; revenue: number }[];
  dayData: { day: string; count: number; revenue: number }[];
}

export function ExpertInsights({ dateRange }: ExpertInsightsProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, [dateRange]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      // Fetch transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', dateRange.startDate.toISOString())
        .lte('transaction_date', dateRange.endDate.toISOString());

      if (txError) throw txError;

      // Fetch appointments with client info
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('*, clients(id, created_at, visit_count)')
        .gte('scheduled_at', dateRange.startDate.toISOString())
        .lte('scheduled_at', dateRange.endDate.toISOString())
        .in('status', ['completed', 'checked_in', 'in_progress']);

      if (aptError) throw aptError;

      // Fetch staff time clock for labor costs
      const { data: timeClock, error: tcError } = await supabase
        .from('time_clock')
        .select('*, staff(hourly_rate)')
        .gte('clock_in', dateRange.startDate.toISOString())
        .lte('clock_in', dateRange.endDate.toISOString());

      if (tcError) throw tcError;

      // Fetch products for COGS calculation (retail)
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, cost, price');

      if (prodError) throw prodError;

      const productCostMap = new Map(
        products?.map(p => [p.id, { cost: Number(p.cost), price: Number(p.price) }]) || []
      );

      // Calculate revenue
      const totalRevenue = transactions?.reduce((sum, t) => {
        if (t.transaction_type === 'refund') return sum - Number(t.amount);
        return sum + Number(t.amount);
      }, 0) || 0;

      // Calculate COGS (estimated as 20% of service revenue + actual product costs)
      const serviceRevenue = transactions
        ?.filter(t => t.transaction_type === 'service')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const retailRevenue = transactions
        ?.filter(t => t.transaction_type === 'retail')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      // Estimate COGS: 20% of services (consumables), 50% of retail
      const serviceCOGS = serviceRevenue * 0.20;
      const retailCOGS = retailRevenue * 0.50;
      const totalCOGS = serviceCOGS + retailCOGS;

      // Calculate labor costs
      const totalLabor = timeClock?.reduce((sum, tc) => {
        const staff = tc.staff as { hourly_rate: number } | null;
        const hourlyRate = staff?.hourly_rate || 0;
        const clockIn = new Date(tc.clock_in);
        const clockOut = tc.clock_out ? new Date(tc.clock_out) : new Date();
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        return sum + (hours * hourlyRate);
      }, 0) || 0;

      const netProfit = totalRevenue - totalCOGS - totalLabor;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Client retention analysis
      const uniqueClients = new Set<string>();
      const newClientIds = new Set<string>();
      const returningClientIds = new Set<string>();

      appointments?.forEach(apt => {
        const client = apt.clients as { id: string; created_at: string; visit_count: number } | null;
        if (!client) return;
        
        uniqueClients.add(client.id);
        const clientCreatedAt = new Date(client.created_at);
        
        // If client was created during this period, they're new
        if (clientCreatedAt >= dateRange.startDate && clientCreatedAt <= dateRange.endDate) {
          newClientIds.add(client.id);
        } else {
          returningClientIds.add(client.id);
        }
      });

      const newClients = newClientIds.size;
      const returningClients = returningClientIds.size;
      const totalClients = uniqueClients.size;
      const retentionRate = totalClients > 0 ? (returningClients / totalClients) * 100 : 0;

      // Rebooking rate: clients with more than 1 appointment in period
      const clientAppointmentCounts = new Map<string, number>();
      appointments?.forEach(apt => {
        const client = apt.clients as { id: string } | null;
        if (client) {
          clientAppointmentCounts.set(
            client.id, 
            (clientAppointmentCounts.get(client.id) || 0) + 1
          );
        }
      });
      const rebookedClients = Array.from(clientAppointmentCounts.values()).filter(c => c > 1).length;
      const rebookingRate = totalClients > 0 ? (rebookedClients / totalClients) * 100 : 0;

      // Peak performance heatmap data
      const hourlyMap = new Map<number, { count: number; revenue: number }>();
      const dayMap = new Map<number, { count: number; revenue: number }>();

      appointments?.forEach(apt => {
        const date = new Date(apt.scheduled_at);
        const hour = date.getHours();
        const day = date.getDay();

        const current = hourlyMap.get(hour) || { count: 0, revenue: 0 };
        hourlyMap.set(hour, {
          count: current.count + 1,
          revenue: current.revenue + Number(apt.total_amount || 0)
        });

        const dayData = dayMap.get(day) || { count: 0, revenue: 0 };
        dayMap.set(day, {
          count: dayData.count + 1,
          revenue: dayData.revenue + Number(apt.total_amount || 0)
        });
      });

      const hourLabels = ['6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];
      const hourlyData = hourLabels.map((label, idx) => {
        const hour = idx + 6;
        const data = hourlyMap.get(hour) || { count: 0, revenue: 0 };
        return { hour: label, ...data };
      });

      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayData = dayLabels.map((label, idx) => {
        const data = dayMap.get(idx) || { count: 0, revenue: 0 };
        return { day: label, ...data };
      });

      setData({
        totalRevenue,
        totalCOGS,
        totalLabor,
        netProfit,
        profitMargin,
        newClients,
        returningClients,
        retentionRate,
        rebookingRate,
        hourlyData,
        dayData
      });
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getBarColor = (count: number, maxCount: number) => {
    const intensity = maxCount > 0 ? count / maxCount : 0;
    if (intensity >= 0.8) return 'hsl(var(--success))';
    if (intensity >= 0.5) return 'hsl(var(--warning))';
    if (intensity >= 0.2) return 'hsl(var(--primary))';
    return 'hsl(var(--muted))';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const maxHourlyCount = Math.max(...data.hourlyData.map(d => d.count));
  const maxDayCount = Math.max(...data.dayData.map(d => d.count));

  return (
    <div className="space-y-6">
      {/* Breakeven Indicator */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Breakeven Analysis
          </CardTitle>
          <CardDescription>
            Net profit after Cost of Goods Sold (COGS) and labor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Gross Revenue</p>
              <p className="text-xl font-bold">{formatCurrency(data.totalRevenue)}</p>
            </div>
            <div className="p-4 rounded-lg bg-destructive/10">
              <p className="text-sm text-muted-foreground">COGS (Est.)</p>
              <p className="text-xl font-bold text-destructive">-{formatCurrency(data.totalCOGS)}</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/10">
              <p className="text-sm text-muted-foreground">Labor Cost</p>
              <p className="text-xl font-bold text-warning">-{formatCurrency(data.totalLabor)}</p>
            </div>
            <div className={`p-4 rounded-lg ${data.netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <p className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(data.netProfit)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10">
              <p className="text-sm text-muted-foreground">Profit Margin</p>
              <p className="text-xl font-bold text-primary">{data.profitMargin.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * COGS estimated at 20% of service revenue (consumables) + 50% of retail (product cost)
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Retention */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Client Retention Metrics
            </CardTitle>
            <CardDescription>
              New vs returning clients and rebooking performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 text-center">
                <p className="text-3xl font-bold text-primary">{data.newClients}</p>
                <p className="text-sm text-muted-foreground">New Clients</p>
              </div>
              <div className="p-4 rounded-lg bg-success/10 text-center">
                <p className="text-3xl font-bold text-success">{data.returningClients}</p>
                <p className="text-sm text-muted-foreground">Returning Clients</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold">{data.retentionRate.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Retention Rate</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-4 rounded-lg bg-warning/10 text-center cursor-help">
                      <p className="text-3xl font-bold text-warning">{data.rebookingRate.toFixed(0)}%</p>
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <RefreshCcw className="w-3 h-3" />
                        Rebooking Rate
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clients with multiple visits in this period</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>

        {/* Peak Performance by Day */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Peak Performance by Day
            </CardTitle>
            <CardDescription>
              Identify slow days for promotional opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dayData}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload?.[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                            <p className="font-medium">{data.day}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.count} appointments
                            </p>
                            <p className="text-sm text-success">
                              {formatCurrency(data.revenue)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.dayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.count, maxDayCount)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Heatmap */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Peak Hours Heatmap
          </CardTitle>
          <CardDescription>
            Appointment distribution by hour - use to identify gaps for specials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourlyData}>
                <XAxis 
                  dataKey="hour" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                          <p className="font-medium">{data.hour}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.count} appointments
                          </p>
                          <p className="text-sm text-success">
                            {formatCurrency(data.revenue)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.hourlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.count, maxHourlyCount)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--muted))' }} />
              <span className="text-muted-foreground">Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }} />
              <span className="text-muted-foreground">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--warning))' }} />
              <span className="text-muted-foreground">High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--success))' }} />
              <span className="text-muted-foreground">Peak</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
