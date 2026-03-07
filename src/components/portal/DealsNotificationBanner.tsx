import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Zap, Tag, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export function DealsNotificationBanner() {
  const { client } = useClientAuth();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(`dismissed-deals-${client?.id}`);
    if (stored) setDismissedIds(JSON.parse(stored));
  }, [client?.id]);

  const { data: deals } = useQuery({
    queryKey: ['deals-notifications', client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('exclusive_deals')
        .select('*, services(name)')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!client?.id,
  });

  const visibleDeals = (deals || []).filter((d: any) => !dismissedIds.includes(d.id));

  const handleDismiss = (dealId: string) => {
    const updated = [...dismissedIds, dealId];
    setDismissedIds(updated);
    localStorage.setItem(`dismissed-deals-${client?.id}`, JSON.stringify(updated));
  };

  const handleClaim = async (deal: any) => {
    if (!client?.id) return;
    const { error } = await supabase.from('purchase_requests').insert({
      client_id: client.id,
      request_type: 'package',
      notes: `DEAL CLAIM: ${deal.title} — $${deal.deal_price || deal.discount_amount} off`,
      tier_total_price: deal.deal_price,
    });
    if (error) {
      toast.error('Could not claim deal. Please try again.');
      return;
    }
    toast.success("Deal claimed! We'll contact you to finalize.");
    handleDismiss(deal.id);
  };

  if (visibleDeals.length === 0) return null;

  return (
    <AnimatePresence>
      {visibleDeals.slice(0, 2).map((deal: any, i: number) => (
        <motion.div
          key={deal.id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
        >
          <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-lg">
            {/* Animated glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary animate-pulse" />

            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="text-[10px] uppercase tracking-wider px-2 py-0">
                      New Deal
                    </Badge>
                    {deal.services?.name && (
                      <span className="text-xs text-muted-foreground">{deal.services.name}</span>
                    )}
                  </div>
                  <h4 className="font-heading font-semibold text-foreground">{deal.title}</h4>
                  {deal.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{deal.description}</p>
                  )}
                  <div className="flex items-center flex-wrap gap-3 mt-2">
                    {deal.original_price != null && deal.deal_price != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm line-through text-muted-foreground">${deal.original_price}</span>
                        <span className="text-lg font-bold text-primary">${deal.deal_price}</span>
                      </div>
                    )}
                    {deal.discount_percent && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400">
                        <Tag className="h-3 w-3 mr-1" />
                        {deal.discount_percent}% OFF
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Expires {formatDistanceToNow(new Date(deal.expires_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={() => handleClaim(deal)} className="gap-1.5">
                    Claim <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleDismiss(deal.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
