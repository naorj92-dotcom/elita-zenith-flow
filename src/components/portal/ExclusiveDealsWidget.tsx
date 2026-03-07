import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Clock, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useClientAuth } from '@/contexts/ClientAuthContext';

export function ExclusiveDealsWidget() {
  const { client } = useClientAuth();

  const { data: deals } = useQuery({
    queryKey: ['exclusive-deals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exclusive_deals' as any)
        .select('*, services(name)')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .order('expires_at', { ascending: true });
      return (data || []) as any[];
    },
  });

  const handleClaim = async (deal: any) => {
    if (!client?.id) return;
    // Create a purchase request for the deal
    const { error } = await supabase.from('purchase_requests' as any).insert({
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
  };

  if (!deals || deals.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="font-heading font-semibold text-lg">Exclusive Deals</h3>
        <Badge variant="secondary" className="text-xs">App Only</Badge>
      </div>
      <div className="grid gap-3">
        {deals.map((deal: any) => (
          <Card key={deal.id} className="card-luxury overflow-hidden border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold">{deal.title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{deal.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {deal.original_price && deal.deal_price && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm line-through text-muted-foreground">${deal.original_price}</span>
                        <span className="text-lg font-bold text-primary">${deal.deal_price}</span>
                      </div>
                    )}
                    {deal.discount_percent && (
                      <Badge className="bg-success/10 text-success border-success/20">
                        <Tag className="h-3 w-3 mr-1" />
                        {deal.discount_percent}% OFF
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Expires {formatDistanceToNow(new Date(deal.expires_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleClaim(deal)}>
                  Claim
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
