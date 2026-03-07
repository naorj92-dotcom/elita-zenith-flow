import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { Staff } from '@/types';
import { DollarSign, Clock, TrendingUp, Users, Calendar, Loader2, Plus, Pencil } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { EditTeamHoursDialog } from '@/components/admin/EditTeamHoursDialog';

interface PayrollData {
  staff: Staff;
  hoursWorked: number;
  isClockedIn: boolean;
  clockInTime: string | null;
  basePay: number;
  serviceSales: number;
  serviceCommission: number;
  retailSales: number;
  retailCommission: number;
  currentTier: number;
  totalEarnings: number;
}

type PeriodType = 'current-week' | 'last-week' | 'current-month' | 'last-month';

export function PayrollPage() {
  const { staff: currentStaff } = useAuth();
  const [period, setPeriod] = useState<PeriodType>('current-month');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Only admins can access this page
  if (currentStaff?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className="card-luxury">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators can access payroll.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'current-week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'last-week':
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: startOfWeek(lastWeek), end: endOfWeek(lastWeek) };
      case 'current-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
  };

  const { data: payrollData, isLoading } = useQuery({
    queryKey: ['payroll', period],
    queryFn: async () => {
      const { start, end } = getDateRange();

      // Fetch all active staff
      const { data: staffList, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .order('first_name');

      if (staffError) throw staffError;

      // Fetch time clock entries for the period
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_clock')
        .select('*')
        .gte('clock_in', start.toISOString())
        .lte('clock_in', end.toISOString());

      if (timeError) throw timeError;

      // Fetch transactions for the period
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', start.toISOString())
        .lte('transaction_date', end.toISOString());

      if (transError) throw transError;

      // Calculate payroll for each staff member
      const payroll: PayrollData[] = (staffList || []).map((staff) => {
        // Calculate hours worked (include live in-progress shifts)
        const staffTimeEntries = (timeEntries || []).filter(e => e.staff_id === staff.id);
        let totalMinutes = 0;
        let isClockedIn = false;
        let clockInTime: string | null = null;

        staffTimeEntries.forEach(entry => {
          const clockIn = new Date(entry.clock_in);
          if (entry.clock_out) {
            const clockOut = new Date(entry.clock_out);
            const minutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60) - (entry.break_minutes || 0);
            totalMinutes += Math.max(0, minutes);
          } else {
            // Currently clocked in — count live hours
            isClockedIn = true;
            clockInTime = entry.clock_in;
            const minutes = (Date.now() - clockIn.getTime()) / (1000 * 60) - (entry.break_minutes || 0);
            totalMinutes += Math.max(0, minutes);
          }
        });
        const hoursWorked = totalMinutes / 60;

        // Calculate base pay
        const basePay = hoursWorked * (staff.hourly_rate || 0);

        // Calculate service sales and commission
        const staffTransactions = (transactions || []).filter(t => t.staff_id === staff.id);
        const serviceTransactions = staffTransactions.filter(t => t.transaction_type === 'service');
        const retailTransactions = staffTransactions.filter(t => t.transaction_type === 'retail');

        const serviceSales = serviceTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const retailSales = retailTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

        // Determine commission tier based on service sales
        let currentTier = 1;
        let serviceCommissionRate = staff.service_commission_tier1 || 40;
        
        if (serviceSales >= (staff.service_tier2_threshold || 10000)) {
          currentTier = 3;
          serviceCommissionRate = staff.service_commission_tier3 || 50;
        } else if (serviceSales >= (staff.service_tier1_threshold || 5000)) {
          currentTier = 2;
          serviceCommissionRate = staff.service_commission_tier2 || 45;
        }

        const serviceCommission = serviceSales * (serviceCommissionRate / 100);
        const retailCommission = retailSales * ((staff.retail_commission_rate || 10) / 100);

        const totalEarnings = basePay + serviceCommission + retailCommission;

        return {
          staff: staff as Staff,
          hoursWorked,
          basePay,
          serviceSales,
          serviceCommission,
          retailSales,
          retailCommission,
          currentTier,
          totalEarnings,
        };
      });

      return payroll;
    },
  });

  const totals = payrollData?.reduce(
    (acc, p) => ({
      hours: acc.hours + p.hoursWorked,
      basePay: acc.basePay + p.basePay,
      serviceSales: acc.serviceSales + p.serviceSales,
      serviceCommission: acc.serviceCommission + p.serviceCommission,
      retailSales: acc.retailSales + p.retailSales,
      retailCommission: acc.retailCommission + p.retailCommission,
      totalEarnings: acc.totalEarnings + p.totalEarnings,
    }),
    { hours: 0, basePay: 0, serviceSales: 0, serviceCommission: 0, retailSales: 0, retailCommission: 0, totalEarnings: 0 }
  );

  const getTierBadge = (tier: number) => {
    switch (tier) {
      case 3:
        return <Badge className="bg-elita-gold/20 text-elita-gold border-elita-gold/30">Tier 3</Badge>;
      case 2:
        return <Badge className="bg-primary/10 text-primary border-primary/20">Tier 2</Badge>;
      default:
        return <Badge variant="secondary">Tier 1</Badge>;
    }
  };

  const { start, end } = getDateRange();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Payroll</h1>
          <p className="text-muted-foreground mt-1">
            {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-week">Current Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="current-month">Current Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Hours & Salary
          </Button>
          <Button asChild>
            <Link to="/admin/staff">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="card-luxury">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">{totals?.hours.toFixed(1) || '0'}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="card-luxury">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">
                    ${((totals?.serviceSales || 0) + (totals?.retailSales || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="card-luxury">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Commissions</p>
                  <p className="text-2xl font-bold">
                    ${((totals?.serviceCommission || 0) + (totals?.retailCommission || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-elita-gold/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-elita-gold" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="card-luxury">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payroll</p>
                  <p className="text-2xl font-bold text-primary">
                    ${totals?.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Payroll Table */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="font-heading">Staff Earnings</CardTitle>
          <CardDescription>Breakdown by employee with tiered commission calculations</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Base Pay</TableHead>
                    <TableHead className="text-right">Service Sales</TableHead>
                    <TableHead className="text-center">Tier</TableHead>
                    <TableHead className="text-right">Service Comm.</TableHead>
                    <TableHead className="text-right">Retail Sales</TableHead>
                    <TableHead className="text-right">Retail Comm.</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollData?.map((row) => (
                    <TableRow key={row.staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {row.staff.first_name[0]}{row.staff.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium">{row.staff.first_name} {row.staff.last_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{row.staff.role.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{row.hoursWorked.toFixed(1)}</TableCell>
                      <TableCell className="text-right">${row.basePay.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${row.serviceSales.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{getTierBadge(row.currentTier)}</TableCell>
                      <TableCell className="text-right text-success">${row.serviceCommission.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${row.retailSales.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-success">${row.retailCommission.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">${row.totalEarnings.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  {payrollData && payrollData.length > 0 && (
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Totals</TableCell>
                      <TableCell className="text-right">{totals?.hours.toFixed(1)}</TableCell>
                      <TableCell className="text-right">${totals?.basePay.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${totals?.serviceSales.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right text-success">${totals?.serviceCommission.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${totals?.retailSales.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-success">${totals?.retailCommission.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary">${totals?.totalEarnings.toFixed(2)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Tiers Info */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Commission Tier Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Tier 1</Badge>
                <span className="text-sm text-muted-foreground">Default</span>
              </div>
              <p className="text-2xl font-bold">40%</p>
              <p className="text-sm text-muted-foreground">Base commission rate</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary/10 text-primary border-primary/20">Tier 2</Badge>
                <span className="text-sm text-muted-foreground">$5,000+ sales</span>
              </div>
              <p className="text-2xl font-bold text-primary">45%</p>
              <p className="text-sm text-muted-foreground">+5% commission boost</p>
            </div>
            <div className="p-4 rounded-lg bg-elita-gold/5 border border-elita-gold/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-elita-gold/20 text-elita-gold border-elita-gold/30">Tier 3</Badge>
                <span className="text-sm text-muted-foreground">$10,000+ sales</span>
              </div>
              <p className="text-2xl font-bold text-elita-gold">50%</p>
              <p className="text-sm text-muted-foreground">Maximum commission rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog - Owner Only */}
      <EditTeamHoursDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        staffList={payrollData?.map(p => p.staff) || []}
      />
    </div>
  );
}
