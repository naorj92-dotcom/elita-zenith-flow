import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Plus, Minus, Calendar, TrendingUp, Wallet } from 'lucide-react';
import { DEMO_MEMBERSHIP, DEMO_MEMBERSHIP_LEDGER } from '@/hooks/useDemoData';

export function MembershipUsageHistory() {
  const { client, isDemo } = useClientAuth();

  const { data: membership } = useQuery({
    queryKey: ['client-membership-detail', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_MEMBERSHIP;
      if (!client?.id) return null;
      const { data } = await supabase
        .from('client_memberships')
        .select('*, memberships(*)')
        .eq('client_id', client.id)
        .eq('status', 'active')
        .maybeSingle();
      return data;
    },
    enabled: !!client?.id || isDemo,
  });

  const { data: ledger } = useQuery({
    queryKey: ['client-membership-ledger', membership?.id, isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_MEMBERSHIP_LEDGER;
      if (!membership?.id) return [];
      const { data } = await supabase
        .from('membership_benefits_ledger')
        .select('*')
        .eq('client_membership_id', membership.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!membership?.id || isDemo,
  });

  if (!membership) {
    return (
      <Card className="card-luxury">
        <CardContent className="py-12 text-center">
          <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Membership</h3>
          <p className="text-muted-foreground">
            Join our membership program to unlock exclusive benefits
          </p>
        </CardContent>
      </Card>
    );
  }

  const membershipData = membership.memberships;
  const monthlyCredits = membershipData?.monthly_service_credits || 0;
  const usedThisMonth = monthlyCredits - (membership.remaining_credits || 0);
  const usagePercent = monthlyCredits > 0 ? (usedThisMonth / monthlyCredits) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Membership Status Card */}
      <Card className="card-luxury bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{membershipData?.name}</CardTitle>
                <CardDescription>{membershipData?.description}</CardDescription>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-700 border-green-200">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credits Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Monthly Credits</span>
              <span className="text-muted-foreground">
                {membership.remaining_credits} of {monthlyCredits} remaining
              </span>
            </div>
            <Progress value={100 - usagePercent} className="h-3" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{membership.remaining_credits}</p>
              <p className="text-xs text-muted-foreground">Credits Left</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{membershipData?.retail_discount_percent}%</p>
              <p className="text-xs text-muted-foreground">Retail Discount</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">${membershipData?.price}</p>
              <p className="text-xs text-muted-foreground">Monthly</p>
            </div>
          </div>

          {/* Next Billing */}
          {membership.next_billing_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
              <Calendar className="h-4 w-4" />
              <span>Next billing: {format(new Date(membership.next_billing_date), 'MMMM d, yyyy')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card className="card-luxury">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Credit History</CardTitle>
          </div>
          <CardDescription>Your membership credit transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {ledger && ledger.length > 0 ? (
            <div className="space-y-3">
              {ledger.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      entry.credits > 0 ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {entry.credits > 0 ? (
                        <Plus className="h-4 w-4 text-green-600" />
                      ) : (
                        <Minus className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${entry.credits > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {entry.credits > 0 ? '+' : ''}{entry.credits}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Balance: {entry.balance_after}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No credit history yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits List */}
      {membershipData?.benefits && Array.isArray(membershipData.benefits) && (
        <Card className="card-luxury">
          <CardHeader>
            <CardTitle className="text-lg">Your Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(membershipData.benefits as string[]).map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {benefit}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}