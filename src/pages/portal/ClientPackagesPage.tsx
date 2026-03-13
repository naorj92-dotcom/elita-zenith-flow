import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, CheckCircle2, Eye, Sparkles } from 'lucide-react';
import { DEMO_PACKAGES } from '@/hooks/useDemoData';
import { toast } from 'sonner';
import { CelebrationOverlay } from '@/components/shared/CelebrationOverlay';
import { ActivePackageCard } from '@/components/portal/packages/ActivePackageCard';
import { PackageGroupSection } from '@/components/portal/packages/PackageGroupSection';

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
  const isDemo = false;
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState({ message: '', sub: '' });

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

  const getTiers = (pkg: any): PricingTier[] => {
    if (pkg.pricing_tiers && Array.isArray(pkg.pricing_tiers) && pkg.pricing_tiers.length > 0) {
      return pkg.pricing_tiers;
    }
    return [{ sessions: 1, total_price: pkg.price, price_per_session: pkg.price, value_percent: 0 }];
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
      setCelebrationMsg({
        message: `${pkg.name} — ${tier.sessions} Sessions!`,
        sub: "We'll contact you shortly to complete your purchase",
      });
      setShowCelebration(true);
      toast.success(`Purchase request submitted for ${pkg.name}!`);
    } catch {
      toast.error('Could not submit purchase request. Please try again.');
    }
  };

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
      toast.success(`Interest submitted for ${pkg.name} — ${tier.sessions} session program!`);
    } catch {
      toast.error('Could not submit your interest. Please try again.');
    }
  };

  // Group available packages by base name
  const grouped = (availablePackages as any[] || []).reduce((acc: Record<string, any[]>, pkg: any) => {
    const match = pkg.name.match(/^(.+?)\s*\((.+)\)$/);
    const groupName = match ? match[1].trim() : pkg.name;
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push({ ...pkg, sizeName: match ? match[2].trim() : '' });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <>
      <CelebrationOverlay
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
        message={celebrationMsg.message}
        subMessage={celebrationMsg.sub}
        emoji="🎉"
      />

      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">My Packages</h1>
          <p className="text-muted-foreground mt-1">Track your treatment packages and browse programs</p>
        </div>

        {isDemo && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
            <Eye className="h-5 w-5 text-primary" />
            <p className="text-sm">Viewing demo packages</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-5 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-2 bg-muted rounded w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : packages?.length === 0 ? (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Package className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-1">No Packages Yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Browse our program pricing below to start your treatment journey.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active Packages */}
            {activePackages.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-heading font-medium text-foreground">Active Packages</h2>
                <div className="grid gap-4">
                  {activePackages.map((pkg) => (
                    <ActivePackageCard key={pkg.id} pkg={pkg} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Packages */}
            {completedPackages.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xl font-heading font-medium text-foreground">Completed</h2>
                <div className="grid gap-3">
                  {completedPackages.map((pkg) => (
                    <Card key={pkg.id} className="bg-card/60">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">{pkg.packages?.name || 'Package'}</h3>
                          <p className="text-sm text-muted-foreground">{pkg.sessions_total} sessions completed</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">Completed</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Expired Packages */}
            {expiredPackages.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xl font-heading font-medium text-foreground">Expired</h2>
                <div className="grid gap-3">
                  {expiredPackages.map((pkg) => (
                    <Card key={pkg.id} className="bg-card/40 border-border/50">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-muted-foreground truncate">{pkg.packages?.name || 'Package'}</h3>
                          <p className="text-sm text-muted-foreground">{pkg.sessions_used} of {pkg.sessions_total} sessions used</p>
                        </div>
                        <Badge variant="outline" className="text-muted-foreground shrink-0">Expired</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Available Programs */}
        {Object.keys(grouped).length > 0 && (
          <section className="space-y-6">
            {/* Section header */}
            <div className="text-center space-y-2 py-4">
              <div className="inline-flex items-center gap-2 bg-primary/8 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Save More with Programs
              </div>
              <h2 className="text-2xl font-heading font-semibold text-foreground">Program Pricing</h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm">
                Commit to more sessions and unlock better per-session pricing.
              </p>
            </div>

            <div className="space-y-8">
              {Object.entries(grouped).map(([groupName, pkgs]) => (
                <PackageGroupSection
                  key={groupName}
                  groupName={groupName}
                  packages={pkgs as any[]}
                  onPurchase={handlePurchase}
                  onInquire={handleInquire}
                  getTiers={getTiers}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
