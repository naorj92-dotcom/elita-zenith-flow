import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function InventoryAlertsWidget() {
  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: async () => {
      // Get products where quantity_in_stock <= reorder_level
      const { data, error } = await supabase
        .from('products')
        .select('id, name, quantity_in_stock, reorder_level, category, sku')
        .eq('is_active', true)
        .order('quantity_in_stock', { ascending: true });

      if (error) throw error;
      // Filter in JS since we need column comparison
      return (data || []).filter(p => p.quantity_in_stock <= p.reorder_level);
    },
    refetchInterval: 120000, // Check every 2 minutes
  });

  if (lowStockProducts.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Low Stock Alerts
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            {lowStockProducts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {lowStockProducts.slice(0, 5).map(product => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {product.sku ? `SKU: ${product.sku} · ` : ''}{product.category}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-amber-600 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                {product.quantity_in_stock}
              </p>
              <p className="text-xs text-muted-foreground">
                min: {product.reorder_level}
              </p>
            </div>
          </div>
        ))}
        {lowStockProducts.length > 5 && (
          <Link to="/products">
            <Button variant="ghost" size="sm" className="w-full text-amber-600 hover:text-amber-700">
              View all {lowStockProducts.length} items
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
