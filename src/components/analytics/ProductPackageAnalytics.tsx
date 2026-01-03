import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Package, ShoppingBag, TrendingDown, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './DateRangeFilter';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProductPackageAnalyticsProps {
  dateRange: DateRange;
}

interface ProductInventory {
  id: string;
  name: string;
  category: string;
  quantityInStock: number;
  reorderLevel: number;
  isLow: boolean;
  price: number;
  cost: number;
}

interface PackageLiability {
  id: string;
  packageName: string;
  clientName: string;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  estimatedValue: number;
  expiryDate: Date | null;
  isExpiringSoon: boolean;
}

export function ProductPackageAnalytics({ dateRange }: ProductPackageAnalyticsProps) {
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [packages, setPackages] = useState<PackageLiability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('quantity_in_stock', { ascending: true });

      if (productsError) throw productsError;

      // Fetch client packages with client info
      const { data: clientPackagesData, error: clientPackagesError } = await supabase
        .from('client_packages')
        .select(`
          *,
          packages (name, price, total_sessions),
          clients (first_name, last_name)
        `)
        .eq('status', 'active');

      if (clientPackagesError) throw clientPackagesError;

      // Process products
      const productInventory: ProductInventory[] = productsData?.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        quantityInStock: p.quantity_in_stock,
        reorderLevel: p.reorder_level,
        isLow: p.quantity_in_stock <= p.reorder_level,
        price: Number(p.price),
        cost: Number(p.cost)
      })) || [];

      // Process packages
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const packageLiabilities: PackageLiability[] = clientPackagesData?.map(cp => {
        const pkg = cp.packages as { name: string; price: number; total_sessions: number } | null;
        const client = cp.clients as { first_name: string; last_name: string } | null;
        const sessionsRemaining = (cp.sessions_total || 0) - (cp.sessions_used || 0);
        const pricePerSession = pkg ? Number(pkg.price) / (pkg.total_sessions || 1) : 0;
        const estimatedValue = sessionsRemaining * pricePerSession;
        const expiryDate = cp.expiry_date ? new Date(cp.expiry_date) : null;
        const isExpiringSoon = expiryDate ? expiryDate <= thirtyDaysFromNow : false;

        return {
          id: cp.id,
          packageName: pkg?.name || 'Unknown Package',
          clientName: client ? `${client.first_name} ${client.last_name}` : 'Unknown Client',
          sessionsTotal: cp.sessions_total || 0,
          sessionsUsed: cp.sessions_used || 0,
          sessionsRemaining,
          estimatedValue,
          expiryDate,
          isExpiringSoon
        };
      }).filter(p => p.sessionsRemaining > 0) || [];

      setProducts(productInventory);
      setPackages(packageLiabilities.sort((a, b) => b.estimatedValue - a.estimatedValue));
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const lowStockProducts = products.filter(p => p.isLow);
  const totalLiability = packages.reduce((sum, p) => sum + p.estimatedValue, 0);
  const totalOutstandingSessions = packages.reduce((sum, p) => sum + p.sessionsRemaining, 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold">{lowStockProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Packages</p>
                <p className="text-2xl font-bold">{packages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <TrendingDown className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Sessions</p>
                <p className="text-2xl font-bold">{totalOutstandingSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-info/10">
                <AlertCircle className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Package Liability</p>
                <p className="text-2xl font-bold">{formatCurrency(totalLiability)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Products */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-destructive" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>
              Products at or below reorder level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reorder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={product.quantityInStock === 0 
                        ? 'text-destructive font-bold' 
                        : 'text-warning font-semibold'
                      }>
                        {product.quantityInStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {product.reorderLevel}
                    </TableCell>
                  </TableRow>
                ))}
                {lowStockProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      All products are well stocked
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Package Burn Rate */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Package Burn Rate
            </CardTitle>
            <CardDescription>
              Outstanding prepaid sessions (liability tracking)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.slice(0, 10).map(pkg => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{pkg.clientName}</p>
                        {pkg.isExpiringSoon && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pkg.packageName}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress 
                          value={(pkg.sessionsUsed / pkg.sessionsTotal) * 100} 
                          className="h-2 flex-1"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {pkg.sessionsUsed}/{pkg.sessionsTotal}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(pkg.estimatedValue)}
                    </TableCell>
                  </TableRow>
                ))}
                {packages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No active packages with remaining sessions
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {packages.length > 10 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Showing top 10 of {packages.length} packages
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
