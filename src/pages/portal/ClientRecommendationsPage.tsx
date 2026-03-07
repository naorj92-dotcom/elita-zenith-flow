import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ShoppingBag, Sparkles, ExternalLink, Clock, Check, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DEMO_PRODUCT_RECOMMENDATIONS, DEMO_SERVICE_RECOMMENDATIONS } from '@/hooks/useDemoData';

export function ClientRecommendationsPage() {
  const { client } = useClientAuth();

  const { data: productRecs, isLoading: loadingProducts } = useQuery({
    queryKey: ['client-product-recommendations', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return DEMO_PRODUCT_RECOMMENDATIONS;
      }
      if (!client?.id) return [];
      const { data } = await supabase
        .from('product_recommendations')
        .select('*, staff(*)')
        .eq('client_id', client.id)
        .order('recommended_date', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id || isDemo,
  });

  const { data: serviceRecs, isLoading: loadingServices } = useQuery({
    queryKey: ['client-service-recommendations', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return DEMO_SERVICE_RECOMMENDATIONS;
      }
      if (!client?.id) return [];
      const { data } = await supabase
        .from('service_recommendations')
        .select('*, services(*), staff(*)')
        .eq('client_id', client.id)
        .order('recommended_date', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id || isDemo,
  });

  const isLoading = loadingProducts || loadingServices;
  const hasRecommendations = (productRecs?.length || 0) + (serviceRecs?.length || 0) > 0;

  const pendingProductRecs = productRecs?.filter(r => !r.is_purchased) || [];
  const purchasedProductRecs = productRecs?.filter(r => r.is_purchased) || [];
  const pendingServiceRecs = serviceRecs?.filter(r => !r.is_booked) || [];
  const bookedServiceRecs = serviceRecs?.filter(r => r.is_booked) || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'normal':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Recommendations</h1>
        <p className="text-muted-foreground mt-1">Products and services recommended for you</p>
      </div>

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <Eye className="h-5 w-5 text-primary" />
          <p className="text-sm">Viewing demo recommendations</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="card-luxury">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !hasRecommendations ? (
        <Card className="card-luxury">
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
            <p className="text-muted-foreground">
              Your provider will add personalized recommendations after your visits
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pending Service Recommendations */}
          {pendingServiceRecs.length > 0 && (
            <section>
              <h2 className="text-xl font-heading font-medium mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Recommended Services
              </h2>
              <div className="grid gap-4">
                {pendingServiceRecs.map((rec) => (
                  <Card key={rec.id} className="card-luxury">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold">{rec.services?.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {rec.services?.description}
                              </p>
                            </div>
                            <Badge className={getPriorityColor(rec.priority || 'normal')}>
                              {rec.priority === 'high' ? 'Highly Recommended' : 'Recommended'}
                            </Badge>
                          </div>
                          
                          {rec.reason && (
                            <p className="text-sm mt-3 p-3 bg-secondary/50 rounded-lg">
                              "{rec.reason}"
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>${rec.services?.price}</span>
                              <span>{rec.services?.duration_minutes} min</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{format(new Date(rec.recommended_date), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                            <Link to="/portal/book">
                              <Button size="sm">Book Now</Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Pending Product Recommendations */}
          {pendingProductRecs.length > 0 && (
            <section>
              <h2 className="text-xl font-heading font-medium mb-4 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Recommended Products
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {pendingProductRecs.map((rec) => (
                  <Card key={rec.id} className="card-luxury">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold">{rec.product_name}</h3>
                        <Badge className={getPriorityColor(rec.priority || 'normal')}>
                          {rec.priority === 'high' ? 'Essential' : 'Suggested'}
                        </Badge>
                      </div>
                      
                      {rec.product_description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {rec.product_description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        {rec.price && (
                          <span className="font-semibold text-primary">${rec.price}</span>
                        )}
                        {rec.product_url && (
                          <a href={rec.product_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Product
                            </Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Booked/Purchased Section */}
          {(bookedServiceRecs.length > 0 || purchasedProductRecs.length > 0) && (
            <section>
              <h2 className="text-xl font-heading font-medium mb-4 flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                Completed
              </h2>
              <div className="space-y-3">
                {bookedServiceRecs.map((rec) => (
                  <Card key={rec.id} className="card-luxury opacity-75">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{rec.services?.name}</span>
                        <span className="text-muted-foreground ml-2">— Booked</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {purchasedProductRecs.map((rec) => (
                  <Card key={rec.id} className="card-luxury opacity-75">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{rec.product_name}</span>
                        <span className="text-muted-foreground ml-2">— Purchased</span>
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
