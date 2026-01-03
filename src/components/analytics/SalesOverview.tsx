import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingBag, Sparkles, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './DateRangeFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface SalesOverviewProps {
  dateRange: DateRange;
}

interface SalesData {
  totalGross: number;
  serviceSales: number;
  retailSales: number;
  averageTicket: number;
  transactionCount: number;
  previousPeriodGross: number;
}

export function SalesOverview({ dateRange }: SalesOverviewProps) {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, [dateRange]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      // Fetch current period transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, transaction_type')
        .gte('transaction_date', dateRange.startDate.toISOString())
        .lte('transaction_date', dateRange.endDate.toISOString());

      if (error) throw error;

      const serviceSales = transactions
        ?.filter(t => t.transaction_type === 'service')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const retailSales = transactions
        ?.filter(t => t.transaction_type === 'retail')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const refunds = transactions
        ?.filter(t => t.transaction_type === 'refund')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const totalGross = serviceSales + retailSales - refunds;
      const transactionCount = transactions?.filter(t => t.transaction_type !== 'refund').length || 0;
      const averageTicket = transactionCount > 0 ? totalGross / transactionCount : 0;

      // Calculate previous period for comparison
      const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime();
      const prevStart = new Date(dateRange.startDate.getTime() - periodLength);
      const prevEnd = new Date(dateRange.startDate.getTime() - 1);

      const { data: prevTransactions } = await supabase
        .from('transactions')
        .select('amount, transaction_type')
        .gte('transaction_date', prevStart.toISOString())
        .lte('transaction_date', prevEnd.toISOString());

      const previousPeriodGross = prevTransactions?.reduce((sum, t) => {
        if (t.transaction_type === 'refund') return sum - Number(t.amount);
        return sum + Number(t.amount);
      }, 0) || 0;

      setData({
        totalGross,
        serviceSales,
        retailSales,
        averageTicket,
        transactionCount,
        previousPeriodGross
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
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

  const getPercentageChange = () => {
    if (!data || data.previousPeriodGross === 0) return null;
    return ((data.totalGross - data.previousPeriodGross) / data.previousPeriodGross) * 100;
  };

  const stats = [
    {
      title: 'Total Gross Sales',
      value: data?.totalGross || 0,
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      showChange: true
    },
    {
      title: 'Service Sales',
      value: data?.serviceSales || 0,
      icon: Sparkles,
      color: 'text-success',
      bgColor: 'bg-success/10',
      showChange: false
    },
    {
      title: 'Retail Sales',
      value: data?.retailSales || 0,
      icon: ShoppingBag,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      showChange: false
    },
    {
      title: 'Average Ticket Value',
      value: data?.averageTicket || 0,
      icon: TrendingUp,
      color: 'text-info',
      bgColor: 'bg-info/10',
      showChange: false,
      subtitle: `${data?.transactionCount || 0} transactions`
    }
  ];

  const percentChange = getPercentageChange();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-border/50 hover:shadow-luxury-sm transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">{stat.title}</span>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl lg:text-3xl font-bold font-heading">
                    {formatCurrency(stat.value)}
                  </div>
                  {stat.showChange && percentChange !== null && (
                    <div className={`flex items-center gap-1 text-sm ${
                      percentChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {percentChange >= 0 ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )}
                      <span>{Math.abs(percentChange).toFixed(1)}% vs prev period</span>
                    </div>
                  )}
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
