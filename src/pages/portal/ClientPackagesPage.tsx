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

      {/* Available Packages — Redesigned Pricing Cards */}
      {availablePackages && availablePackages.length > 0 && (() => {
        const grouped = (availablePackages as any[]).reduce((acc: Record<string, any[]>, pkg: any) => {
          const match = pkg.name.match(/^(.+?)\s*\((.+)\)$/);
          const groupName = match ? match[1].trim() : pkg.name;
          if (!acc[groupName]) acc[groupName] = [];
          acc[groupName].push({ ...pkg, sizeName: match ? match[2].trim() : '' });
          return acc;
        }, {} as Record<string, any[]>);

        return (
          <section className="space-y-6">
            {/* Section Header */}
            <div className="text-center space-y-2 py-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Save More with Programs
              </div>
              <h2 className="text-2xl font-heading font-semibold">Program Pricing</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Commit to more sessions and unlock better per-session pricing. The best value for your treatment journey.
              </p>
            </div>

            {Object.entries(grouped).map(([groupName, pkgs]) => (
              <div key={groupName} className="space-y-4">
                {/* Group Header */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-primary" />
                  <div>
                    <h3 className="text-lg font-heading font-semibold">{groupName}</h3>
                    {(pkgs as any[]).length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        Available in {(pkgs as any[]).map((p: any) => p.sizeName).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {(pkgs as any[]).map((pkg: any) => {
                  const tiers = getTiers(pkg);
                  const bestTier = tiers[tiers.length - 1];

                  return (
                    <div key={pkg.id} className="space-y-3">
                      {(pkgs as any[]).length > 1 && (
                        <p className="text-sm font-medium text-foreground pl-1">
                          {pkg.sizeName || pkg.name}
                          {pkg.description && (
                            <span className="text-muted-foreground font-normal ml-1.5">— {pkg.description}</span>
                          )}
                        </p>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {tiers.map((tier, idx) => {
                          const isBestValue = idx === tiers.length - 1 && tiers.length > 1;
                          const isPopular = idx === Math.floor(tiers.length / 2) && tiers.length > 2;

                          return (
                            <Card
                              key={idx}
                              className={`relative overflow-hidden transition-all hover:shadow-md ${
                                isBestValue
                                  ? 'border-primary ring-1 ring-primary/20 shadow-sm'
                                  : 'border-border hover:border-primary/30'
                              }`}
                            >
                              {/* Best Value / Popular Badge */}
                              {isBestValue && (
                                <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-[11px] font-semibold text-center py-1 tracking-wide uppercase">
                                  <Star className="h-3 w-3 inline mr-1 -mt-0.5" />
                                  Best Value
                                </div>
                              )}
                              {isPopular && !isBestValue && (
                                <div className="absolute top-0 left-0 right-0 bg-muted text-muted-foreground text-[11px] font-semibold text-center py-1 tracking-wide uppercase">
                                  Most Popular
                                </div>
                              )}

                              <CardContent className={`p-5 space-y-4 ${isBestValue || isPopular ? 'pt-9' : ''}`}>
                                {/* Session Count */}
                                <div className="text-center">
                                  <p className="text-3xl font-heading font-bold text-foreground">
                                    {tier.sessions}
                                  </p>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                                    Session{tier.sessions !== 1 ? 's' : ''}
                                  </p>
                                </div>

                                {/* Price */}
                                <div className="text-center space-y-1">
                                  <p className="text-2xl font-semibold text-foreground">
                                    {formatCurrency(tier.total_price)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency(tier.price_per_session)}/session
                                  </p>
                                </div>

                                {/* Value Badge */}
                                <div className="text-center h-6">
                                  {tier.value_percent > 0 ? (
                                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                                      <TrendingDown className="h-3 w-3" />
                                      Save {tier.value_percent}%
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Single session rate</span>
                                  )}
                                </div>

                                {/* CTA Buttons */}
                                <div className="space-y-2 pt-1">
                                  <Button
                                    size="sm"
                                    className="w-full gap-1.5"
                                    variant={isBestValue ? 'default' : 'outline'}
                                    onClick={() => handlePurchase(pkg, tier)}
                                  >
                                    Get Started
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full text-muted-foreground text-xs"
                                    onClick={() => handleInquire(pkg, tier)}
                                  >
                                    Learn More
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        );
      })()}
    </div>
  );
}
