import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingDown, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { differenceInDays, format } from 'date-fns';

export function InventoryAlertsWidget() {
  const { data: alerts = { lowStock: [], expiringSoon: [] } } = useQuery({
    queryKey: ['inventory-alerts-widget'],
    queryFn: async () => {
      const [{ data: products }, { data: batches }] = await Promise.all([
        supabase.from('inventory_products').select('id, name, reorder_threshold, unit_type').eq('is_active', true),
        supabase.from('inventory_batches').select('product_id, quantity_remaining, expiration_date').eq('is_active', true),
      ]);

      const productMap = new Map((products || []).map(p => [p.id, p]));
      const stockByProduct = new Map<string, { total: number; earliestExpiry: string | null }>();

      for (const b of (batches || [])) {
        const cur = stockByProduct.get(b.product_id) || { total: 0, earliestExpiry: null };
        cur.total += b.quantity_remaining;
        if (!cur.earliestExpiry || b.expiration_date < cur.earliestExpiry) {
          cur.earliestExpiry = b.expiration_date;
        }
        stockByProduct.set(b.product_id, cur);
      }

      const lowStock: { name: string; stock: number; threshold: number; unit: string }[] = [];
      const expiringSoon: { name: string; expiryDate: string; daysLeft: number }[] = [];

      for (const [pid, info] of stockByProduct) {
        const product = productMap.get(pid);
        if (!product) continue;
        if (info.total <= product.reorder_threshold) {
          lowStock.push({ name: product.name, stock: info.total, threshold: product.reorder_threshold, unit: product.unit_type });
        }
        if (info.earliestExpiry) {
          const days = differenceInDays(new Date(info.earliestExpiry), new Date());
          if (days <= 30) {
            expiringSoon.push({ name: product.name, expiryDate: info.earliestExpiry, daysLeft: days });
          }
        }
      }

      // Also check products with no batches at all as low stock
      for (const p of (products || [])) {
        if (!stockByProduct.has(p.id)) {
          lowStock.push({ name: p.name, stock: 0, threshold: p.reorder_threshold, unit: p.unit_type });
        }
      }

      return { lowStock, expiringSoon };
    },
    refetchInterval: 120000,
  });

  const totalAlerts = alerts.lowStock.length + alerts.expiringSoon.length;
  if (totalAlerts === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Inventory Alerts
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            {totalAlerts}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.lowStock.slice(0, 3).map((item, i) => (
          <div key={`low-${i}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">Low stock · {item.stock} {item.unit} left (min: {item.threshold})</p>
            </div>
          </div>
        ))}
        {alerts.expiringSoon.slice(0, 3).map((item, i) => (
          <div key={`exp-${i}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                Expires {item.daysLeft <= 0 ? 'today' : `in ${item.daysLeft} days`} · {format(new Date(item.expiryDate), 'MMM d')}
              </p>
            </div>
          </div>
        ))}
        {totalAlerts > 6 && (
          <Link to="/inventory">
            <Button variant="ghost" size="sm" className="w-full text-amber-600 hover:text-amber-700">
              View all {totalAlerts} alerts
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
