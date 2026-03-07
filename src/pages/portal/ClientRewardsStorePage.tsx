import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Gift, Star, ShoppingBag, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function ClientRewardsStorePage() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();

  // Get current loyalty balance
  const { data: balance = 0 } = useQuery({
    queryKey: ['loyalty-balance', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { data, error } = await supabase.rpc('get_client_loyalty_balance', { p_client_id: client.id });
      if (error) return 0;
      return data || 0;
    },
    enabled: !!client?.id,
  });

  // Get rewards catalog
  const { data: rewards = [] } = useQuery({
    queryKey: ['loyalty-rewards-catalog'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('loyalty_rewards')
        .select('*, services(name)')
        .eq('is_active', true)
        .order('points_cost', { ascending: true });
      return data || [];
    },
  });

  // Get my redemptions
  const { data: myRedemptions = [] } = useQuery({
    queryKey: ['my-redemptions', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await (supabase as any)
        .from('loyalty_redemptions')
        .select('*, loyalty_rewards(name, points_cost)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!client?.id,
  });

  const redeemMutation = useMutation({
    mutationFn: async (reward: any) => {
      if (!client?.id) throw new Error('Not authenticated');
      if (balance < reward.points_cost) throw new Error('Not enough points');

      // Create redemption
      const { error: redeemError } = await (supabase as any)
        .from('loyalty_redemptions')
        .insert({
          client_id: client.id,
          reward_id: reward.id,
          points_spent: reward.points_cost,
        });
      if (redeemError) throw redeemError;

      // Deduct points
      const { error: pointsError } = await supabase
        .from('loyalty_points')
        .insert({
          client_id: client.id,
          points: reward.points_cost,
          transaction_type: 'redeemed',
          description: `Redeemed: ${reward.name}`,
        });
      if (pointsError) throw pointsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-balance'] });
      queryClient.invalidateQueries({ queryKey: ['my-redemptions'] });
      toast.success('Reward redeemed! The front desk will apply it to your next visit.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to redeem'),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rewards Store</h1>
            <p className="text-sm text-muted-foreground">Redeem your loyalty points for exclusive rewards</p>
          </div>
        </div>
      </motion.div>

      {/* Points Balance */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6 text-center">
          <Star className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-4xl font-bold text-primary">{balance.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Available Points</p>
        </CardContent>
      </Card>

      {/* Rewards Catalog */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Rewards</h2>
        {rewards.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No rewards available yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rewards.map((reward: any, i: number) => {
              const canAfford = balance >= reward.points_cost;
              return (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={!canAfford ? 'opacity-60' : ''}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{reward.name}</h3>
                          {reward.description && (
                            <p className="text-sm text-muted-foreground mt-1">{reward.description}</p>
                          )}
                          {reward.services?.name && (
                            <Badge variant="outline" className="mt-2 text-xs">{reward.services.name}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-primary" />
                          <span className="font-bold text-primary">{reward.points_cost.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">pts</span>
                        </div>
                        <Button
                          size="sm"
                          disabled={!canAfford || redeemMutation.isPending}
                          onClick={() => redeemMutation.mutate(reward)}
                        >
                          {redeemMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : canAfford ? 'Redeem' : 'Need more pts'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Redemptions */}
      {myRedemptions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Redemptions</h2>
          <Card>
            <CardContent className="p-4 space-y-2">
              {myRedemptions.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.loyalty_rewards?.name}</p>
                    <p className="text-xs text-muted-foreground">{r.points_spent} pts</p>
                  </div>
                  <Badge variant={r.status === 'pending' ? 'secondary' : 'default'} className="text-xs">
                    {r.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
