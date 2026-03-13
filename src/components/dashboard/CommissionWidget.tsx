import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Award, ShoppingCart } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek } from 'date-fns';
import { Progress } from '@/components/ui/progress';

export function CommissionWidget() {
  const { staff } = useAuth();

  const { data: commissionData } = useQuery({
    queryKey: ['commission-widget', staff?.id],
    queryFn: async () => {
      if (!staff?.id) return null;

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const weekStart = startOfWeek(now);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, commission_amount, transaction_type, transaction_date')
        .eq('staff_id', staff.id)
        .gte('transaction_date', monthStart.toISOString())
        .lte('transaction_date', monthEnd.toISOString());

      if (!transactions) return null;

      let monthServiceSales = 0;
      let monthRetailSales = 0;
      let monthCommission = 0;
      let weekCommission = 0;

      transactions.forEach(t => {
        const amount = Number(t.amount) || 0;
        const commission = Number(t.commission_amount) || 0;
        monthCommission += commission;
        
        if (new Date(t.transaction_date) >= weekStart) {
          weekCommission += commission;
        }

        if (t.transaction_type === 'service') {
          monthServiceSales += amount;
        } else if (t.transaction_type === 'retail') {
          monthRetailSales += amount;
        }
      });

      // Get commission tiers
      const tier1 = Number(staff.service_tier1_threshold) || 5000;
      const tier2 = Number(staff.service_tier2_threshold) || 10000;
      const currentTierProgress = Math.min((monthServiceSales / tier1) * 100, 100);
      const nextTierProgress = tier1 > 0 ? Math.min((monthServiceSales / tier2) * 100, 100) : 0;

      return {
        monthCommission,
        weekCommission,
        monthServiceSales,
        monthRetailSales,
        totalSales: monthServiceSales + monthRetailSales,
        transactionCount: transactions.length,
        currentTierProgress,
        nextTierProgress,
        tier1,
        tier2,
      };
    },
    enabled: !!staff?.id,
    refetchInterval: 60000,
  });

  // Only show if the owner has configured commission rates for this staff member
  const hasCommission = staff && (
    Number(staff.service_commission_tier1) > 0 ||
    Number(staff.service_commission_tier2) > 0 ||
    Number(staff.service_commission_tier3) > 0 ||
    Number(staff.retail_commission_rate) > 0
  );

  if (!commissionData || !hasCommission) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Commission Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly Commission */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground mb-1">This Month</p>
            <p className="text-xl font-bold text-primary">
              ${commissionData.monthCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground mb-1">This Week</p>
            <p className="text-xl font-bold text-foreground">
              ${commissionData.weekCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Sales Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              Service Sales
            </span>
            <span className="font-medium">${commissionData.monthServiceSales.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ShoppingCart className="w-3.5 h-3.5" />
              Retail Sales
            </span>
            <span className="font-medium">${commissionData.monthRetailSales.toLocaleString()}</span>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tier Progress</span>
            <span className="font-medium">
              ${commissionData.monthServiceSales.toLocaleString()} / ${commissionData.tier1.toLocaleString()}
            </span>
          </div>
          <Progress value={commissionData.currentTierProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {commissionData.currentTierProgress >= 100
              ? '🎉 Tier 1 reached! Working toward Tier 2...'
              : `$${(commissionData.tier1 - commissionData.monthServiceSales).toLocaleString()} to next tier`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
