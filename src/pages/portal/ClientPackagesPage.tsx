import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Package, Calendar, CheckCircle2, Eye, ShoppingBag, Sparkles } from 'lucide-react';
import { DEMO_PACKAGES } from '@/hooks/useDemoData';
import { toast } from 'sonner';

export function ClientPackagesPage() {
  const { client, isDemo } = useClientAuth();

  const { data: packages, isLoading } = useQuery({
    queryKey: ['client-packages', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return DEMO_PACKAGES;
      }
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

  // Fetch available packages for purchase
  const { data: availablePackages } = useQuery({
    queryKey: ['available-packages', isDemo],
    queryFn: async () => {
      if (isDemo) {
        return [
          { id: 'demo-1', name: 'HydraFacial Series', description: 'Deep cleansing and hydration treatment series', price: 750, total_sessions: 6, is_active: true },
          { id: 'demo-2', name: 'Laser Hair Removal - Full Legs', description: 'Complete laser hair removal package', price: 1200, total_sessions: 4, is_active: true },
          { id: 'demo-3', name: 'Microneedling Package', description: 'Skin rejuvenation microneedling sessions', price: 900, total_sessions: 3, is_active: true },
        ];
      }
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

  const handleInquire = (pkgName: string) => {
    toast.success(`We'll reach out about the ${pkgName} package! Contact us to complete your purchase.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">My Packages</h1>
        <p className="text-muted-foreground mt-1">Track your treatment packages and sessions</p>
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
              Browse our available packages below to get started!
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
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>Purchased {format(new Date(pkg.purchase_date), 'MMM d, yyyy')}</span>
                          </div>
                          {pkg.expiry_date && (
                            <div className="flex items-center gap-1.5">
                              <span>Expires {format(new Date(pkg.expiry_date), 'MMM d, yyyy')}</span>
                            </div>
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
                          <p className="text-sm text-muted-foreground">
                            {pkg.sessions_total} sessions completed
                          </p>
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
                          <p className="text-sm text-muted-foreground">
                            {pkg.sessions_used} of {pkg.sessions_total} sessions used
                          </p>
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

      {/* Available Packages to Purchase */}
      {availablePackages && availablePackages.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-heading font-medium">Available Packages</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {availablePackages.map((pkg: any) => (
              <Card key={pkg.id} className="card-luxury border-primary/10 hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-heading">{pkg.name}</CardTitle>
                    <div className="flex items-center gap-1 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                  {pkg.description && (
                    <CardDescription>{pkg.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(pkg.price)}</p>
                      <p className="text-sm text-muted-foreground">
                        {pkg.total_sessions} sessions • {formatCurrency(pkg.price / pkg.total_sessions)}/session
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleInquire(pkg.name)}>
                      Inquire
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
