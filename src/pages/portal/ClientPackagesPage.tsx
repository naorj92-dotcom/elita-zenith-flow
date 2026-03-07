import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Package, Calendar, CheckCircle2, Eye, ShoppingBag, TrendingDown, CalendarPlus, Sparkles, Star, ArrowRight } from 'lucide-react';
import { DEMO_PACKAGES } from '@/hooks/useDemoData';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface PricingTier {
  sessions: number;
  total_price: number;
  price_per_session: number;
  value_percent: number;
}

const DEMO_AVAILABLE_PACKAGES = [
  {
    id: 'demo-cs-s', name: 'Cryo Sculpt (Small)', description: 'Targeted fat reduction for small areas',
    price: 495, is_active: true,
    pricing_tiers: [
      { sessions: 1, total_price: 495, price_per_session: 495, value_percent: 0 },
      { sessions: 3, total_price: 1185, price_per_session: 395, value_percent: 20 },
      { sessions: 6, total_price: 2190, price_per_session: 365, value_percent: 26 },
      { sessions: 10, total_price: 3250, price_per_session: 325, value_percent: 34 },
    ],
  },
  {
    id: 'demo-cs-m', name: 'Cryo Sculpt (Medium)', description: 'Targeted fat reduction for medium areas',
    price: 595, is_active: true,
    pricing_tiers: [
      { sessions: 1, total_price: 595, price_per_session: 595, value_percent: 0 },
      { sessions: 3, total_price: 1485, price_per_session: 495, value_percent: 17 },
      { sessions: 6, total_price: 2790, price_per_session: 465, value_percent: 22 },
      { sessions: 10, total_price: 4250, price_per_session: 425, value_percent: 29 },
    ],
  },
  {
    id: 'demo-cs-l', name: 'Cryo Sculpt (Large)', description: 'Targeted fat reduction for large areas',
    price: 695, is_active: true,
    pricing_tiers: [
      { sessions: 1, total_price: 695, price_per_session: 695, value_percent: 0 },
      { sessions: 3, total_price: 1785, price_per_session: 595, value_percent: 14 },
      { sessions: 6, total_price: 3390, price_per_session: 565, value_percent: 19 },
      { sessions: 10, total_price: 5250, price_per_session: 525, value_percent: 24 },
    ],
  },
  {
    id: 'demo-vrf-s', name: 'Vacuum + RF (Small)', description: 'Skin tightening for small areas',
    price: 345, is_active: true,
    pricing_tiers: [
      { sessions: 1, total_price: 345, price_per_session: 345, value_percent: 0 },
      { sessions: 3, total_price: 885, price_per_session: 295, value_percent: 14 },
      { sessions: 6, total_price: 1590, price_per_session: 265, value_percent: 23 },
      { sessions: 10, total_price: 2390, price_per_session: 239, value_percent: 31 },
    ],
  },
  {
    id: 'demo-vrf-m', name: 'Vacuum + RF (Medium)', description: 'Skin tightening for medium areas',
    price: 445, is_active: true,
    pricing_tiers: [
      { sessions: 1, total_price: 445, price_per_session: 445, value_percent: 0 },
      { sessions: 3, total_price: 1125, price_per_session: 375, value_percent: 16 },
      { sessions: 6, total_price: 2070, price_per_session: 345, value_percent: 22 },
      { sessions: 10, total_price: 3190, price_per_session: 319, value_percent: 28 },
    ],
  },
  {
    id: 'demo-vrf-l', name: 'Vacuum + RF (Large)', description: 'Skin tightening for large areas',
    price: 545, is_active: true,
    pricing_tiers: [
      { sessions: 1, total_price: 545, price_per_session: 545, value_percent: 0 },
      { sessions: 3, total_price: 1365, price_per_session: 455, value_percent: 17 },
      { sessions: 6, total_price: 2550, price_per_session: 425, value_percent: 22 },
      { sessions: 10, total_price: 3990, price_per_session: 399, value_percent: 27 },
    ],
  },
];

export function ClientPackagesPage() {
  const { client } = useClientAuth();
  const isDemo = false; // Demo mode removed for security

  const { data: packages, isLoading } = useQuery({
    queryKey: ['client-packages', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_PACKAGES;
      if (!client?.id) return [];
      const { data } = await supabase
        .from('client_packages')
        .select('*, packages(*)')
        .eq('client_id', client.id)
        .order('purchase_date', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id || isDemo,
  });

  const { data: availablePackages } = useQuery({
    queryKey: ['available-packages', isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_AVAILABLE_PACKAGES;
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const activePackages = packages?.filter(p => p.status === 'active') || [];
  const completedPackages = packages?.filter(p => p.status === 'completed') || [];
  const expiredPackages = packages?.filter(p => p.status === 'expired') || [];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const handleInquire = async (pkg: any, tier: PricingTier) => {
    if (!client?.id) return;
    try {
      const { error } = await supabase.from('purchase_requests' as any).insert({
        client_id: client.id,
        request_type: 'package',
        package_id: pkg.id,
        tier_sessions: tier.sessions,
        tier_total_price: tier.total_price,
        notes: `${pkg.name} — ${tier.sessions} sessions at $${tier.price_per_session}/session`,
      });
      if (error) throw error;
      toast.success(`Interest submitted for ${pkg.name} — ${tier.sessions} session program! Our team will reach out shortly.`);
    } catch {
      toast.error('Could not submit your interest. Please try again.');
    }
  };

  const handlePurchase = async (pkg: any, tier: PricingTier) => {
    if (!client?.id) return;
    try {
      const { error } = await supabase.from('purchase_requests' as any).insert({
        client_id: client.id,
        request_type: 'package',
        package_id: pkg.id,
        tier_sessions: tier.sessions,
        tier_total_price: tier.total_price,
        status: 'interested',
        notes: `PURCHASE REQUEST: ${pkg.name} — ${tier.sessions} sessions, $${tier.total_price} total`,
      });
      if (error) throw error;
      toast.success(`Purchase request submitted for ${pkg.name}! We'll contact you to complete the purchase.`);
    } catch {
      toast.error('Could not submit purchase request. Please try again.');
    }
  };

  const getTiers = (pkg: any): PricingTier[] => {
    if (pkg.pricing_tiers && Array.isArray(pkg.pricing_tiers) && pkg.pricing_tiers.length > 0) {
      return pkg.pricing_tiers;
    }
    return [{ sessions: 1, total_price: pkg.price, price_per_session: pkg.price, value_percent: 0 }];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">My Packages</h1>
        <p className="text-muted-foreground mt-1">Track your treatment packages and browse programs</p>
      </div>

      {isDemo && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <Eye className="h-5 w-5 text-primary" />
          <p className="text-sm">Viewing demo packages</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="card-luxury">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-2 bg-muted rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : packages?.length === 0 ? (
        <Card className="card-luxury">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Packages Yet</h3>
            <p className="text-muted-foreground">
              Browse our program pricing below to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activePackages.length > 0 && (
            <section>
              <h2 className="text-xl font-heading font-medium mb-4">Active Packages</h2>
              <div className="grid gap-4">
                {activePackages.map((pkg) => {
                  const progress = (pkg.sessions_used / pkg.sessions_total) * 100;
                  const remaining = pkg.sessions_total - pkg.sessions_used;
                  return (
                    <Card key={pkg.id} className="card-luxury">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-heading">
                              {pkg.packages?.name || 'Package'}
                            </CardTitle>
                            <CardDescription>{pkg.packages?.description}</CardDescription>
                          </div>
                          <Badge className="status-confirmed">Active</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Sessions Used</span>
                            <span className="font-medium">{pkg.sessions_used} of {pkg.sessions_total}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <p className="text-sm text-primary mt-2 font-medium">
                            {remaining} session{remaining !== 1 ? 's' : ''} remaining
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              <span>Purchased {format(new Date(pkg.purchase_date), 'MMM d, yyyy')}</span>
                            </div>
                            {pkg.expiry_date && (
                              <span>Expires {format(new Date(pkg.expiry_date), 'MMM d, yyyy')}</span>
                            )}
                          </div>
                          {remaining > 0 && (
                            <Link to="/portal/book">
                              <Button size="sm" className="gap-1.5">
                                <CalendarPlus className="h-4 w-4" />
                                Book Session
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {completedPackages.length > 0 && (
            <section>
              <h2 className="text-xl font-heading font-medium mb-4">Completed Packages</h2>
              <div className="grid gap-4">
                {completedPackages.map((pkg) => (
                  <Card key={pkg.id} className="card-luxury opacity-75">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{pkg.packages?.name || 'Package'}</h3>
                          <p className="text-sm text-muted-foreground">{pkg.sessions_total} sessions completed</p>
                        </div>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {expiredPackages.length > 0 && (
            <section>
              <h2 className="text-xl font-heading font-medium mb-4">Expired Packages</h2>
              <div className="grid gap-4">
                {expiredPackages.map((pkg) => (
                  <Card key={pkg.id} className="card-luxury opacity-50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold">{pkg.packages?.name || 'Package'}</h3>
                          <p className="text-sm text-muted-foreground">{pkg.sessions_used} of {pkg.sessions_total} sessions used</p>
                        </div>
                        <Badge variant="outline" className="text-muted-foreground">Expired</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Available Packages — Grouped Pricing Tables */}
      {availablePackages && availablePackages.length > 0 && (() => {
        // Group packages by base service name (e.g. "Cryo Sculpt" from "Cryo Sculpt (Small)")
        const grouped = (availablePackages as any[]).reduce((acc: Record<string, any[]>, pkg: any) => {
          const match = pkg.name.match(/^(.+?)\s*\((.+)\)$/);
          const groupName = match ? match[1].trim() : pkg.name;
          if (!acc[groupName]) acc[groupName] = [];
          acc[groupName].push({ ...pkg, sizeName: match ? match[2].trim() : '' });
          return acc;
        }, {} as Record<string, any[]>);

        return (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-heading font-medium">Program Pricing</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Save more with multi-session programs. The more sessions you commit to, the lower the price per session.
            </p>
            <div className="space-y-6">
              {Object.entries(grouped).map(([groupName, pkgs]) => {
                // Collect all unique session counts across variants
                const allTiers = (pkgs as any[]).map((pkg: any) => ({
                  pkg,
                  tiers: getTiers(pkg),
                }));

                return (
                  <Card key={groupName} className="card-luxury overflow-hidden">
                    <CardHeader className="pb-2 bg-muted/30">
                      <CardTitle className="text-lg font-heading flex items-center gap-2">
                        {groupName}
                        <TrendingDown className="h-4 w-4 text-primary" />
                      </CardTitle>
                      <CardDescription>
                        {(pkgs as any[]).length > 1
                          ? `Available in ${(pkgs as any[]).map((p: any) => p.sizeName).join(', ')}`
                          : (pkgs as any[])[0]?.description || ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {(pkgs as any[]).map((pkg: any) => {
                        const tiers = getTiers(pkg);
                        return (
                          <div key={pkg.id}>
                            {(pkgs as any[]).length > 1 && (
                              <div className="px-4 py-2 bg-muted/20 border-t">
                                <span className="text-sm font-semibold text-foreground">{pkg.sizeName || pkg.name}</span>
                                {pkg.description && (
                                  <span className="text-xs text-muted-foreground ml-2">— {pkg.description}</span>
                                )}
                              </div>
                            )}
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Sessions</TableHead>
                                  <TableHead>Total Price</TableHead>
                                  <TableHead>Price / Session</TableHead>
                                  <TableHead>Program Value</TableHead>
                                  <TableHead className="text-right"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tiers.map((tier, idx) => (
                                  <TableRow key={idx} className={idx === tiers.length - 1 ? 'bg-primary/5' : ''}>
                                    <TableCell className="font-semibold">{tier.sessions}</TableCell>
                                    <TableCell className="font-medium">{formatCurrency(tier.total_price)}</TableCell>
                                    <TableCell>{formatCurrency(tier.price_per_session)}</TableCell>
                                    <TableCell>
                                      {tier.value_percent > 0 ? (
                                        <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
                                          {tier.value_percent}% Value
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex gap-2 justify-end">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleInquire(pkg, tier)}
                                        >
                                          Inquire
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={idx === tiers.length - 1 ? 'default' : 'secondary'}
                                          onClick={() => handlePurchase(pkg, tier)}
                                        >
                                          Purchase
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
