import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Award
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns';

interface TimeClockEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  notes: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  transaction_date: string;
  description: string | null;
  commission_amount: number | null;
}

export default function MyReportsPage() {
  const { staff } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'hours';
  const [timeEntries, setTimeEntries] = useState<TimeClockEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const weekStart = startOfWeek(currentMonth, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 0 });

  useEffect(() => {
    if (staff?.id) {
      fetchData();
    }
  }, [staff?.id]);

  const fetchData = async () => {
    if (!staff?.id) return;
    
    setLoading(true);
    try {
      // Fetch time clock entries for current month
      const { data: timeData } = await supabase
        .from('time_clock')
        .select('*')
        .eq('staff_id', staff.id)
        .gte('clock_in', monthStart.toISOString())
        .lte('clock_in', monthEnd.toISOString())
        .order('clock_in', { ascending: false });

      // Fetch transactions for current month
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .eq('staff_id', staff.id)
        .gte('transaction_date', monthStart.toISOString())
        .lte('transaction_date', monthEnd.toISOString())
        .order('transaction_date', { ascending: false });

      setTimeEntries(timeData || []);
      setTransactions(transData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total hours worked
  const calculateTotalHours = (entries: TimeClockEntry[]) => {
    return entries.reduce((total, entry) => {
      if (entry.clock_out) {
        const minutes = differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in));
        return total + (minutes - entry.break_minutes) / 60;
      }
      return total;
    }, 0);
  };

  // Calculate this week's hours
  const weekEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.clock_in);
    return entryDate >= weekStart && entryDate <= weekEnd;
  });

  const totalMonthHours = calculateTotalHours(timeEntries);
  const totalWeekHours = calculateTotalHours(weekEntries);

  // Calculate sales
  const serviceSales = transactions
    .filter(t => t.transaction_type === 'service')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const retailSales = transactions
    .filter(t => t.transaction_type === 'retail')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSales = serviceSales + retailSales;

  // Calculate commission
  const totalCommission = transactions.reduce((sum, t) => sum + (Number(t.commission_amount) || 0), 0);

  // Calculate base pay
  const hourlyRate = Number(staff?.hourly_rate) || 0;
  const basePay = totalMonthHours * hourlyRate;

  // Total earnings
  const totalEarnings = basePay + totalCommission;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">
              My Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(currentMonth, 'MMMM yyyy')} Performance Summary
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {staff?.first_name} {staff?.last_name}
          </Badge>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalEarnings)}</p>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSales)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Services: {formatCurrency(serviceSales)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hours Worked</p>
                  <p className="text-2xl font-bold text-foreground">{formatHours(totalMonthHours)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This week: {formatHours(totalWeekHours)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Commission</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCommission)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Base pay: {formatCurrency(basePay)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content based on tab */}
        {activeTab === 'hours' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Earnings Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Earnings Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Hourly Rate</span>
                    <span className="font-medium">{formatCurrency(hourlyRate)}/hr</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Hours Worked</span>
                    <span className="font-medium">{formatHours(totalMonthHours)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Base Pay</span>
                    <span className="font-medium">{formatCurrency(basePay)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-primary/5 rounded-lg px-3">
                    <span className="font-semibold">Total Base Earnings</span>
                    <span className="font-bold text-primary text-lg">{formatCurrency(basePay)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Time Clock History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Time Clock History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : timeEntries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No time entries for this month
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {timeEntries.map((entry) => {
                        const clockIn = new Date(entry.clock_in);
                        const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
                        const hoursWorked = clockOut 
                          ? (differenceInMinutes(clockOut, clockIn) - entry.break_minutes) / 60 
                          : null;

                        return (
                          <div key={entry.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{format(clockIn, 'EEEE, MMM d')}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(clockIn, 'h:mm a')} - {clockOut ? format(clockOut, 'h:mm a') : 'Active'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {hoursWorked !== null ? (
                                <>
                                  <p className="font-semibold">{formatHours(hoursWorked)}</p>
                                  {entry.break_minutes > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {entry.break_minutes}min break
                                    </p>
                                  )}
                                </>
                              ) : (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                                  Clocked In
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Commission Tiers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Commission Tiers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Your Service Sales</span>
                      <span className="font-medium">{formatCurrency(serviceSales)}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className={`p-3 rounded-lg border ${serviceSales < (staff?.service_tier1_threshold || 5000) ? 'bg-primary/10 border-primary/30' : 'bg-muted/50 border-border'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Tier 1</span>
                          <span className="text-sm">{staff?.service_commission_tier1 || 40}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Up to {formatCurrency(staff?.service_tier1_threshold || 5000)}
                        </p>
                      </div>
                      
                      <div className={`p-3 rounded-lg border ${serviceSales >= (staff?.service_tier1_threshold || 5000) && serviceSales < (staff?.service_tier2_threshold || 10000) ? 'bg-primary/10 border-primary/30' : 'bg-muted/50 border-border'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Tier 2</span>
                          <span className="text-sm">{staff?.service_commission_tier2 || 45}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(staff?.service_tier1_threshold || 5000)} - {formatCurrency(staff?.service_tier2_threshold || 10000)}
                        </p>
                      </div>
                      
                      <div className={`p-3 rounded-lg border ${serviceSales >= (staff?.service_tier2_threshold || 10000) ? 'bg-success/10 border-success/30' : 'bg-muted/50 border-border'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Tier 3</span>
                          <span className="text-sm">{staff?.service_commission_tier3 || 50}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Above {formatCurrency(staff?.service_tier2_threshold || 10000)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Retail Commission Rate</span>
                        <span className="font-medium">{staff?.retail_commission_rate || 10}%</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-3 bg-primary/5 rounded-lg px-3">
                      <span className="font-semibold">Total Commission</span>
                      <span className="font-bold text-primary text-lg">{formatCurrency(totalCommission)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sales History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Sales History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions for this month
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              transaction.transaction_type === 'service' 
                                ? 'bg-primary/10' 
                                : transaction.transaction_type === 'retail'
                                ? 'bg-success/10'
                                : 'bg-destructive/10'
                            }`}>
                              <DollarSign className={`w-5 h-5 ${
                                transaction.transaction_type === 'service' 
                                  ? 'text-primary' 
                                  : transaction.transaction_type === 'retail'
                                  ? 'text-success'
                                  : 'text-destructive'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium capitalize">{transaction.transaction_type}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(transaction.transaction_date), 'MMM d, h:mm a')}
                              </p>
                              {transaction.description && (
                                <p className="text-xs text-muted-foreground">{transaction.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(Number(transaction.amount))}</p>
                            {transaction.commission_amount && (
                              <p className="text-xs text-success">
                                +{formatCurrency(Number(transaction.commission_amount))} commission
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}