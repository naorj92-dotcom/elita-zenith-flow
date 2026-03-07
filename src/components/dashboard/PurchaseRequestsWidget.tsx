import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, Crown, Clock, CheckCircle2, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PurchaseRequest {
  id: string;
  client_id: string;
  request_type: string;
  package_id: string | null;
  membership_id: string | null;
  tier_sessions: number | null;
  tier_total_price: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  clients?: { first_name: string; last_name: string; phone: string | null; email: string | null };
}

export function PurchaseRequestsWidget() {
  const queryClient = useQueryClient();
  const [newAlert, setNewAlert] = useState(false);

  const { data: requests } = useQuery({
    queryKey: ['purchase-requests-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requests' as any)
        .select('*, clients(first_name, last_name, phone, email)')
        .in('status', ['interested'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as PurchaseRequest[];
    },
  });

  // Realtime subscription for new requests
  useEffect(() => {
    const channel = supabase
      .channel('purchase-requests-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'purchase_requests' },
        () => {
          setNewAlert(true);
          queryClient.invalidateQueries({ queryKey: ['purchase-requests-recent'] });
          toast.info('New purchase interest from a client!', { icon: '🛒' });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const handleMarkContacted = async (id: string) => {
    const { error } = await supabase
      .from('purchase_requests' as any)
      .update({ status: 'contacted' })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success('Marked as contacted');
    queryClient.invalidateQueries({ queryKey: ['purchase-requests-recent'] });
  };

  const handleMarkPurchased = async (id: string) => {
    const { error } = await supabase
      .from('purchase_requests' as any)
      .update({ status: 'purchased' })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success('Marked as purchased');
    queryClient.invalidateQueries({ queryKey: ['purchase-requests-recent'] });
  };

  if (!requests || requests.length === 0) return null;

  return (
    <Card className={`card-luxury ${newAlert ? 'ring-2 ring-primary animate-pulse' : ''}`} onMouseEnter={() => setNewAlert(false)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Purchase Requests
          </CardTitle>
          <Badge variant="secondary">{requests.length} pending</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {req.request_type === 'package' ? (
                  <Package className="h-4 w-4 text-primary" />
                ) : (
                  <Crown className="h-4 w-4 text-yellow-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {req.clients?.first_name} {req.clients?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.notes?.replace('PURCHASE REQUEST: ', '').replace('INTEREST: ', '')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(req.created_at), 'MMM d, h:mm a')}
              </div>
            </div>
            {req.notes?.startsWith('PURCHASE REQUEST') && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                Ready to Purchase
              </Badge>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleMarkContacted(req.id)}>
                <Phone className="h-3 w-3 mr-1" />
                Contacted
              </Button>
              <Button size="sm" variant="default" className="text-xs h-7" onClick={() => handleMarkPurchased(req.id)}>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Purchased
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
