import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Award,
  Receipt,
  User,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInMinutes, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

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

interface ReceiptWithClient {
  id: string;
  receipt_number: string;
  service_name: string | null;
  service_price: number;
  retail_total: number;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string | null;
  created_at: string;
  machine_used: string | null;
  notes: string | null;
  retail_items: unknown;
  treatment_summary: unknown;
  clients: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

type DateViewMode = 'day' | 'month' | 'year' | 'custom';

export default function MyReportsPage() {
  const { staff } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'hours';
  const [timeEntries, setTimeEntries] = useState<TimeClockEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<ReceiptWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateViewMode, setDateViewMode] = useState<DateViewMode>('month');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptWithClient | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [customCalendarOpen, setCustomCalendarOpen] = useState(false);
  const [selectingCustomEnd, setSelectingCustomEnd] = useState(false);

  const getDateRange = (date: Date, mode: DateViewMode) => {
    switch (mode) {
      case 'day':
        return { start: startOfDay(date), end: endOfDay(date) };
      case 'month':
        return { start: startOfMonth(date), end: endOfMonth(date) };
      case 'year':
        return { start: startOfYear(date), end: endOfYear(date) };
      case 'custom':
        return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange(selectedDate, dateViewMode);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

  useEffect(() => {
    if (staff?.id) {
      fetchData();
    }
  }, [staff?.id, selectedDate, dateViewMode, customStartDate, customEndDate]);

  const fetchData = async () => {
    if (!staff?.id) return;
    
    setLoading(true);
    try {
      const [timeData, transData, receiptsData] = await Promise.all([
        supabase
          .from('time_clock')
          .select('*')
          .eq('staff_id', staff.id)
          .gte('clock_in', rangeStart.toISOString())
          .lte('clock_in', rangeEnd.toISOString())
          .order('clock_in', { ascending: false }),
        supabase
          .from('transactions')
          .select('*')
          .eq('staff_id', staff.id)
          .gte('transaction_date', rangeStart.toISOString())
          .lte('transaction_date', rangeEnd.toISOString())
          .order('transaction_date', { ascending: false }),
        supabase
          .from('receipts')
          .select(`
            *,
            clients (
              id,
              first_name,
              last_name,
              email,
              phone
            )
          `)
          .eq('staff_id', staff.id)
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString())
          .order('created_at', { ascending: false })
      ]);

      setTimeEntries(timeData.data || []);
      setTransactions(transData.data || []);
      setReceipts((receiptsData.data as ReceiptWithClient[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalHours = (entries: TimeClockEntry[]) => {
    return entries.reduce((total, entry) => {
      if (entry.clock_out) {
        const minutes = differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in));
        return total + (minutes - entry.break_minutes) / 60;
      }
      return total;
    }, 0);
  };

  const weekEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.clock_in);
    return entryDate >= weekStart && entryDate <= weekEnd;
  });

  const totalHours = calculateTotalHours(timeEntries);
  const totalWeekHours = calculateTotalHours(weekEntries);

  const serviceSales = transactions
    .filter(t => t.transaction_type === 'service')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const retailSales = transactions
    .filter(t => t.transaction_type === 'retail')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSales = serviceSales + retailSales;
  const totalCommission = transactions.reduce((sum, t) => sum + (Number(t.commission_amount) || 0), 0);
  const hourlyRate = Number(staff?.hourly_rate) || 0;
  const basePay = totalHours * hourlyRate;
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

  const getDateLabel = () => {
    switch (dateViewMode) {
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
      case 'year':
        return format(selectedDate, 'yyyy');
      case 'custom':
        return `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d, yyyy')}`;
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    switch (dateViewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
        break;
    }
    setSelectedDate(newDate);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            My Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            {getDateLabel()} Performance Summary
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={dateViewMode} onValueChange={(v) => setDateViewMode(v as DateViewMode)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {dateViewMode !== 'custom' ? (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[140px]">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {getDateLabel()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Popover open={customCalendarOpen && !selectingCustomEnd} onOpenChange={(open) => {
                setCustomCalendarOpen(open);
                setSelectingCustomEnd(false);
              }}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[120px]">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(customStartDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={(date) => {
                      if (date) {
                        setCustomStartDate(date);
                        if (date > customEndDate) {
                          setCustomEndDate(date);
                        }
                        setCustomCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-muted-foreground">to</span>
              
              <Popover open={customCalendarOpen && selectingCustomEnd} onOpenChange={(open) => {
                setCustomCalendarOpen(open);
                setSelectingCustomEnd(true);
              }}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[120px]">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(customEndDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={(date) => {
                      if (date) {
                        setCustomEndDate(date);
                        setCustomCalendarOpen(false);
                      }
                    }}
                    disabled={(date) => date < customStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Badge variant="outline" className="w-fit">
            {staff?.first_name} {staff?.last_name}
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalEarnings)}</p>
                <p className="text-xs text-muted-foreground mt-1">{dateViewMode === 'day' ? 'Today' : dateViewMode === 'month' ? 'This month' : 'This year'}</p>
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
                <p className="text-2xl font-bold text-foreground">{formatHours(totalHours)}</p>
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
                  <span className="font-medium">{formatHours(totalHours)}</span>
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
                  <CalendarIcon className="w-5 h-5" />
                  Time Clock History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : timeEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No time entries for this period
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
                    No transactions for this period
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

          {/* Receipts List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Sales Receipts ({receipts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : receipts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No receipts for this period
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {receipts.map((receipt) => (
                    <div 
                      key={receipt.id} 
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedReceipt(receipt)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">#{receipt.receipt_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(receipt.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                          {receipt.clients && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {receipt.clients.first_name} {receipt.clients.last_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(Number(receipt.total_amount))}</p>
                          {receipt.service_name && (
                            <p className="text-xs text-muted-foreground">{receipt.service_name}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Receipt Detail Modal */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Receipt #{selectedReceipt?.receipt_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedReceipt && (
            <div className="space-y-6">
              {/* Client Info */}
              {selectedReceipt.clients && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    Client Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedReceipt.clients.first_name} {selectedReceipt.clients.last_name}</p>
                    {selectedReceipt.clients.email && (
                      <p><span className="text-muted-foreground">Email:</span> {selectedReceipt.clients.email}</p>
                    )}
                    {selectedReceipt.clients.phone && (
                      <p><span className="text-muted-foreground">Phone:</span> {selectedReceipt.clients.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Service Details */}
              <div className="space-y-3">
                <h4 className="font-medium">Transaction Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{format(new Date(selectedReceipt.created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  {selectedReceipt.service_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span>{selectedReceipt.service_name}</span>
                    </div>
                  )}
                  {selectedReceipt.machine_used && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Machine</span>
                      <span>{selectedReceipt.machine_used}</span>
                    </div>
                  )}
                  {selectedReceipt.payment_method && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Method</span>
                      <span className="capitalize">{selectedReceipt.payment_method}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="font-medium">Price Breakdown</h4>
                <div className="space-y-2 text-sm">
                  {Number(selectedReceipt.service_price) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span>{formatCurrency(Number(selectedReceipt.service_price))}</span>
                    </div>
                  )}
                  {Number(selectedReceipt.retail_total) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Retail</span>
                      <span>{formatCurrency(Number(selectedReceipt.retail_total))}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(Number(selectedReceipt.subtotal))}</span>
                  </div>
                  {Number(selectedReceipt.discount_amount) > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span>-{formatCurrency(Number(selectedReceipt.discount_amount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(Number(selectedReceipt.tax_amount))}</span>
                  </div>
                  {Number(selectedReceipt.tip_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tip</span>
                      <span>{formatCurrency(Number(selectedReceipt.tip_amount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(Number(selectedReceipt.total_amount))}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedReceipt.notes && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h4 className="font-medium">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedReceipt.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
