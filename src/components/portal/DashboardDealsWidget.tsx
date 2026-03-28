import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, Clock, ChevronRight, CalendarPlus, Users } from 'lucide-react';
import { differenceInDays, differenceInHours } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function DashboardDealsWidget() {
  const queryClient = useQueryClient();

  const { data: deals = [] } = useQuery({
    queryKey: ['client-active-deals-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exclusive_deals')
        .select('*, services(name)')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .order('expires_at', { ascending: true })
        .limit(2);
      return (data || []) as any[];
    },
  });

  // Realtime for live spots-left updates
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-deals-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exclusive_deals' }, () => {
        queryClient.invalidateQueries({ queryKey: ['client-active-deals-dashboard'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  if (deals.length === 0) return null;

  function getExpiryLabel(expiresAt: string) {
    const days = differenceInDays(new Date(expiresAt), new Date());
    if (days < 1) {
      const hours = differenceInHours(new Date(expiresAt), new Date());
      return `${hours}h left`;
    }
    return `${days}d left`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-24 relative z-10 sm:ml-2"
    >
      <div className="mb-7">
        <div className="divider-luxe mb-5" />
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.55em]">
            Today's Deals
          </p>
          <Link to="/portal/deals" className="text-[11px] font-medium text-primary flex items-center gap-0.5 hover:underline">
            View all offers <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {deals.map((deal: any) => {
          const spotsLeft = deal.max_claims ? deal.max_claims - deal.claims_count : null;

          return (
            <Card key={deal.id} className="overflow-hidden border-primary/15">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-heading font-semibold text-sm text-foreground truncate">{deal.title}</h4>
                  {deal.discount_percent && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] shrink-0">
                      <Tag className="h-2.5 w-2.5 mr-0.5" />
                      {deal.discount_percent}%
                    </Badge>
                  )}
                </div>

                {deal.original_price && deal.deal_price && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs line-through text-muted-foreground">${deal.original_price}</span>
                    <span className="text-base font-bold text-primary">${deal.deal_price}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{getExpiryLabel(deal.expires_at)}</span>
                    </div>
                    {spotsLeft !== null && (
                      <div className="flex items-center gap-0.5 text-[10px] text-warning">
                        <Users className="h-2.5 w-2.5" />
                        <span>{spotsLeft} left</span>
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                    <Link to={`/portal/book${deal.service_id ? `?service=${deal.service_id}` : ''}`}>
                      <CalendarPlus className="h-3 w-3 mr-1" />
                      Book
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
