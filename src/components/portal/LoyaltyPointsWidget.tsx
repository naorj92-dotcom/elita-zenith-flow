import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Star, Gift, TrendingUp } from 'lucide-react';

// Demo loyalty data
const DEMO_LOYALTY_POINTS = [
  { id: '1', points: 185, transaction_type: 'earned', description: 'HydraFacial Signature', created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '2', points: 450, transaction_type: 'earned', description: 'Botox - Full Face', created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '3', points: 50, transaction_type: 'bonus', description: 'Birthday bonus', created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '4', points: 100, transaction_type: 'redeemed', description: 'Redeemed for product discount', created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
];

export function LoyaltyPointsWidget() {
  const { client, isDemo } = useClientAuth();

  const { data: loyaltyData } = useQuery({
    queryKey: ['client-loyalty-points', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return DEMO_LOYALTY_POINTS;
      }
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!client?.id || isDemo,
  });

  // Calculate total balance
  const totalPoints = loyaltyData?.reduce((sum, entry) => {
    if (entry.transaction_type === 'earned' || entry.transaction_type === 'bonus') {
      return sum + entry.points;
    } else {
      return sum - entry.points;
    }
  }, 0) || 0;

  // Points needed for next reward tier
  const nextRewardAt = 1000;
  const progress = Math.min((totalPoints / nextRewardAt) * 100, 100);
  const pointsToNextReward = Math.max(nextRewardAt - totalPoints, 0);

  return (
    <Card className="card-luxury">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-heading">
          <Star className="h-5 w-5 text-elita-gold" />
          Loyalty Points
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Points Balance */}
        <div className="text-center py-4 bg-gradient-hero rounded-lg">
          <p className="text-4xl font-heading font-semibold text-primary">{totalPoints.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Available Points</p>
        </div>

        {/* Progress to Next Reward */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Next reward</span>
            <span className="font-medium">{pointsToNextReward} pts away</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span className="flex items-center gap-1">
              <Gift className="h-3 w-3" />
              {nextRewardAt.toLocaleString()} pts
            </span>
          </div>
        </div>

        {/* Earning Rate */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm">Earn 1 point per $1 spent</span>
          </div>
          <Badge variant="outline" className="text-xs">
            Member
          </Badge>
        </div>

        {/* Recent Activity */}
        {loyaltyData && loyaltyData.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Recent Activity</p>
            <div className="space-y-1">
              {loyaltyData.slice(0, 3).map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground truncate flex-1">{entry.description}</span>
                  <span className={entry.transaction_type === 'redeemed' ? 'text-destructive' : 'text-success'}>
                    {entry.transaction_type === 'redeemed' ? '-' : '+'}
                    {entry.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
