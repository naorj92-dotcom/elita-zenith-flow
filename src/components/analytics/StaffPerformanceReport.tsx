import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, DollarSign, Clock, TrendingUp, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './DateRangeFilter';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StaffPerformanceReportProps {
  dateRange: DateRange;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface StaffPerformance {
  id: string;
  name: string;
  role: string;
  serviceRevenue: number;
  retailRevenue: number;
  retailUpsellPercent: number;
  clockedHours: number;
  hourlyRate: number;
  basePay: number;
  serviceCommission: number;
  retailCommission: number;
  totalEarnings: number;
  currentTier: number;
  tier1Threshold: number;
  tier2Threshold: number;
  commissionRates: { tier1: number; tier2: number; tier3: number };
}

export function StaffPerformanceReport({ dateRange }: StaffPerformanceReportProps) {
  const [staff, setStaff] = useState<StaffPerformance[]>([]);
  const [allStaffMembers, setAllStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffPerformance();
  }, [dateRange, selectedStaffId]);

  const fetchStaffPerformance = async () => {
    setLoading(true);
    try {
      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('is_active', true);

      if (staffError) throw staffError;

      // Fetch time clock entries
      const { data: timeClockData, error: timeClockError } = await supabase
        .from('time_clock')
        .select('*')
        .gte('clock_in', dateRange.startDate.toISOString())
        .lte('clock_in', dateRange.endDate.toISOString());

      if (timeClockError) throw timeClockError;

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', dateRange.startDate.toISOString())
        .lte('transaction_date', dateRange.endDate.toISOString());

      if (transactionsError) throw transactionsError;

      // Calculate performance for each staff member
      const performance: StaffPerformance[] = staffData?.map(member => {
        // Calculate clocked hours
        const staffTimeClock = timeClockData?.filter(tc => tc.staff_id === member.id) || [];
        const clockedMinutes = staffTimeClock.reduce((sum, tc) => {
          const clockIn = new Date(tc.clock_in);
          const clockOut = tc.clock_out ? new Date(tc.clock_out) : new Date();
          const minutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
          return sum + minutes - (tc.break_minutes || 0);
        }, 0);
        const clockedHours = clockedMinutes / 60;

        // Calculate revenue
        const staffTransactions = transactionsData?.filter(t => t.staff_id === member.id) || [];
        const serviceRevenue = staffTransactions
          .filter(t => t.transaction_type === 'service')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const retailRevenue = staffTransactions
          .filter(t => t.transaction_type === 'retail')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        // Calculate retail upsell percentage
        const totalRevenue = serviceRevenue + retailRevenue;
        const retailUpsellPercent = totalRevenue > 0 ? (retailRevenue / totalRevenue) * 100 : 0;

        // Calculate base pay
        const hourlyRate = Number(member.hourly_rate) || 0;
        const basePay = hourlyRate * clockedHours;

        // Calculate tiered service commission (retroactive)
        const tier1Threshold = Number(member.service_tier1_threshold) || 5000;
        const tier2Threshold = Number(member.service_tier2_threshold) || 10000;
        const tier1Rate = Number(member.service_commission_tier1) || 40;
        const tier2Rate = Number(member.service_commission_tier2) || 45;
        const tier3Rate = Number(member.service_commission_tier3) || 50;

        let serviceCommission = 0;
        let currentTier = 1;

        if (serviceRevenue >= tier2Threshold) {
          // Tier 3: Retroactive - apply highest rate to all sales
          serviceCommission = serviceRevenue * (tier3Rate / 100);
          currentTier = 3;
        } else if (serviceRevenue >= tier1Threshold) {
          // Tier 2: Retroactive - apply middle rate to all sales
          serviceCommission = serviceRevenue * (tier2Rate / 100);
          currentTier = 2;
        } else {
          // Tier 1: Base rate
          serviceCommission = serviceRevenue * (tier1Rate / 100);
          currentTier = 1;
        }

        // Calculate retail commission
        const retailCommissionRate = Number(member.retail_commission_rate) || 10;
        const retailCommission = retailRevenue * (retailCommissionRate / 100);

        // Total earnings
        const totalEarnings = basePay + serviceCommission + retailCommission;

        return {
          id: member.id,
          name: `${member.first_name} ${member.last_name}`,
          role: member.role,
          serviceRevenue,
          retailRevenue,
          retailUpsellPercent,
          clockedHours,
          hourlyRate,
          basePay,
          serviceCommission,
          retailCommission,
          totalEarnings,
          currentTier,
          tier1Threshold,
          tier2Threshold,
          commissionRates: { tier1: tier1Rate, tier2: tier2Rate, tier3: tier3Rate }
        };
      }) || [];

      // Store all staff members for dropdown
      setAllStaffMembers(staffData?.map(s => ({ id: s.id, first_name: s.first_name, last_name: s.last_name })) || []);
      
      // Filter by selected staff if not 'all'
      const filteredPerformance = selectedStaffId === 'all' 
        ? performance 
        : performance.filter(p => p.id === selectedStaffId);

      setStaff(filteredPerformance.sort((a, b) => b.totalEarnings - a.totalEarnings));
    } catch (error) {
      console.error('Error fetching staff performance:', error);
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

  const getTierBadge = (tier: number, rates: { tier1: number; tier2: number; tier3: number }) => {
    const colors = {
      1: 'bg-muted text-muted-foreground',
      2: 'bg-warning/20 text-warning border-warning/30',
      3: 'bg-primary/20 text-primary border-primary/30'
    };
    const rate = tier === 1 ? rates.tier1 : tier === 2 ? rates.tier2 : rates.tier3;
    return (
      <Badge className={colors[tier as keyof typeof colors]}>
        Tier {tier} ({rate}%)
      </Badge>
    );
  };

  const totalPayroll = staff.reduce((sum, s) => sum + s.totalEarnings, 0);
  const totalServiceRevenue = staff.reduce((sum, s) => sum + s.serviceRevenue, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Staff Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {allStaffMembers.map(member => (
              <SelectItem key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedStaffId !== 'all' && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            Viewing individual report
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Payroll</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Service Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalServiceRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-info/10">
                <Users className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold">{staff.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Staff Performance & Payroll
          </CardTitle>
          <CardDescription>
            Tiered retroactive commission calculations included
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead className="text-right">Service Revenue</TableHead>
                  <TableHead className="text-right">Retail</TableHead>
                  <TableHead className="text-right">Upsell %</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Base Pay</TableHead>
                  <TableHead className="text-right">Service Comm.</TableHead>
                  <TableHead className="text-right">Retail Comm.</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Total Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {member.role.replace('_', ' ')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(member.serviceRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(member.retailRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress 
                          value={member.retailUpsellPercent} 
                          className="h-2 w-12"
                        />
                        <span className="text-sm">{member.retailUpsellPercent.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {member.clockedHours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(member.basePay)}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(member.serviceCommission)}
                    </TableCell>
                    <TableCell className="text-right text-warning">
                      {formatCurrency(member.retailCommission)}
                    </TableCell>
                    <TableCell>
                      {getTierBadge(member.currentTier, member.commissionRates)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(member.totalEarnings)}
                    </TableCell>
                  </TableRow>
                ))}
                {staff.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No staff data available for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
