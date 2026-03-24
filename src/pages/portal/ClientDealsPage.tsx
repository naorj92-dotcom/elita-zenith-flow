import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, Clock, Sparkles, CalendarPlus } from 'lucide-react';
import { differenceInDays, differenceInHours, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function ClientDealsPage() {
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['client-active-deals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exclusive_deals')
        .select('*, services(name)')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .order('expires_at', { ascending: true });
      return (data || []) as any[];
    },
  });

  function getExpiryLabel(expiresAt: string) {
    const days = differenceInDays(new Date(expiresAt), new Date());
    if (days < 1) {
      const hours = differenceInHours(new Date(expiresAt), new Date());
      return `Expires in ${hours}h`;
    }
    return `Expires in ${days} day${days !== 1 ? 's' : ''}`;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-heading font-bold text-foreground">Exclusive Deals</h1>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-36 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-20">
        <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-lg font-heading font-semibold text-foreground mb-1">No active deals right now</h2>
        <p className="text-sm text-muted-foreground">Check back soon — new offers drop regularly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Exclusive Deals</h1>
        <p className="text-sm text-muted-foreground mt-1">{deals.length} offer{deals.length !== 1 ? 's' : ''} available</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {deals.map((deal: any, i: number) => (
          <motion.div
            key={deal.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
          >
            <Card className="overflow-hidden border-primary/15 hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-foreground truncate">{deal.title}</h3>
                    {deal.services?.name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{deal.services.name}</p>
                    )}
                  </div>
                  {deal.discount_percent && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">
                      <Tag className="h-3 w-3 mr-1" />
                      {deal.discount_percent}% OFF
                    </Badge>
                  )}
                </div>

                {deal.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{deal.description}</p>
                )}

                <div className="flex items-center gap-3">
                  {deal.original_price && deal.deal_price && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm line-through text-muted-foreground">${deal.original_price}</span>
                      <span className="text-lg font-bold text-primary">${deal.deal_price}</span>
                    </div>
                  )}
                  {deal.discount_amount && !deal.deal_price && (
                    <span className="text-lg font-bold text-primary">${deal.discount_amount} off</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{getExpiryLabel(deal.expires_at)}</span>
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/portal/book">
                      <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                      Book Now
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default ClientDealsPage;
