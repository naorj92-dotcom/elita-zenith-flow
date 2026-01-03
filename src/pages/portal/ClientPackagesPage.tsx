import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Package, Calendar, CheckCircle2 } from 'lucide-react';

export function ClientPackagesPage() {
  const { client } = useClientAuth();

  const { data: packages, isLoading } = useQuery({
    queryKey: ['client-packages', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('client_packages')
        .select('*, packages(*)')
        .eq('client_id', client.id)
        .order('purchase_date', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id,
  });

  const activePackages = packages?.filter(p => p.status === 'active') || [];
  const completedPackages = packages?.filter(p => p.status === 'completed') || [];
  const expiredPackages = packages?.filter(p => p.status === 'expired') || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">My Packages</h1>
        <p className="text-muted-foreground mt-1">Track your treatment packages and sessions</p>
      </div>

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
              Ask about our treatment packages during your next visit!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Packages */}
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

          {/* Completed Packages */}
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

          {/* Expired Packages */}
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
    </div>
  );
}
