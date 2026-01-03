import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface StaffSales {
  staff_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  total_sales: number;
  transaction_count: number;
}

export function CompetitionPage() {
  const [leaderboard, setLeaderboard] = useState<StaffSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedMonth]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const endDate = endOfMonth(startDate);

      // Fetch transactions for the selected month
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('staff_id, amount, transaction_type')
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', endDate.toISOString())
        .in('transaction_type', ['service', 'retail']);

      if (error) throw error;

      // Fetch all active staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, first_name, last_name, avatar_url')
        .eq('is_active', true);

      if (staffError) throw staffError;

      // Aggregate sales by staff
      const salesByStaff: Record<string, { total: number; count: number }> = {};
      
      transactions?.forEach((tx) => {
        if (tx.staff_id) {
          if (!salesByStaff[tx.staff_id]) {
            salesByStaff[tx.staff_id] = { total: 0, count: 0 };
          }
          salesByStaff[tx.staff_id].total += Number(tx.amount) || 0;
          salesByStaff[tx.staff_id].count += 1;
        }
      });

      // Combine staff data with sales
      const leaderboardData: StaffSales[] = (staffData || []).map((s) => ({
        staff_id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        avatar_url: s.avatar_url,
        total_sales: salesByStaff[s.id]?.total || 0,
        transaction_count: salesByStaff[s.id]?.count || 0,
      }));

      // Sort by total sales descending
      leaderboardData.sort((a, b) => b.total_sales - a.total_sales);

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 2:
        return <Medal className="w-7 h-7 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-2xl font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30';
      default:
        return 'bg-card border-border';
    }
  };

  const totalSales = leaderboard.reduce((sum, s) => sum + s.total_sales, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            Sales Competition
          </h1>
          <p className="text-muted-foreground mt-1">See who's leading the pack this month</p>
        </div>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Competition</p>
              <p className="text-xl font-bold text-foreground">
                {leaderboard.length} team member{leaderboard.length !== 1 ? 's' : ''} competing
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-primary/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Monthly Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sales data for this month</p>
          ) : (
            leaderboard.map((staff, index) => {
              const rank = index + 1;
              return (
                <motion.div
                  key={staff.staff_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${getRankStyles(rank)}`}
                >
                  {/* Rank */}
                  <div className="w-12 flex items-center justify-center">
                    {getRankIcon(rank)}
                  </div>

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {staff.avatar_url ? (
                      <img
                        src={staff.avatar_url}
                        alt={`${staff.first_name} ${staff.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-semibold">
                        {staff.first_name[0]}{staff.last_name[0]}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate text-lg">
                      {staff.first_name} {staff.last_name}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
