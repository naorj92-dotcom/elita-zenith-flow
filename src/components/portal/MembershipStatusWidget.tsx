import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export function MembershipStatusWidget() {
  const { client } = useClientAuth();

  const { data: membershipData } = useQuery({
    queryKey: ['client-membership', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data, error } = await supabase
        .from('client_memberships')
        .select(`
          *,
          memberships (*)
        `)
        .eq('client_id', client.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!client?.id,
  });

  const { data: availableMemberships } = useQuery({
    queryKey: ['available-memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !membershipData,
  });

  if (!membershipData) {
    // No membership - show upgrade CTA
    return (
      <Card className="card-luxury overflow-hidden">
        <div className="bg-gradient-sage p-6 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5" />
            <span className="font-medium">Become a Member</span>
          </div>
          <h3 className="text-xl font-heading font-semibold mb-2">Unlock Exclusive Benefits</h3>
          <p className="text-sm opacity-90">Save on treatments, enjoy priority booking, and earn more rewards.</p>
        </div>
        <CardContent className="p-4">
          <div className="space-y-2 mb-4">
            {availableMemberships?.slice(0, 2).map(tier => (
              <div key={tier.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                <span className="font-medium">{tier.name}</span>
                <span className="text-sm text-muted-foreground">${tier.price}/mo</span>
              </div>
            ))}
          </div>
          <Button className="w-full" asChild>
            <Link to="/portal/memberships">
              <Sparkles className="h-4 w-4 mr-2" />
              View Memberships
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const membership = membershipData.memberships;
  const benefits = Array.isArray(membership?.benefits) ? membership.benefits as string[] : [];

  return (
    <Card className="card-luxury overflow-hidden">
      <div className="bg-gradient-sage p-6 text-primary-foreground">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-elita-gold" />
            <span className="font-medium">Your Membership</span>
          </div>
          <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
            {membershipData.status}
          </Badge>
        </div>
        <h3 className="text-2xl font-heading font-semibold">{membership?.name}</h3>
        <p className="text-sm opacity-90 mt-1">{membership?.description}</p>
      </div>
      <CardContent className="p-4 space-y-4">
        {/* Credits Remaining */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Monthly Credits</p>
            <p className="text-xl font-heading font-semibold">
              {membershipData.remaining_credits} / {membership?.monthly_service_credits}
            </p>
          </div>
          <Sparkles className="h-8 w-8 text-primary/30" />
        </div>

        {/* Key Benefits */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Your Benefits</p>
          <ul className="space-y-1 text-sm">
            {benefits.slice(0, 3).map((benefit, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-success mt-0.5">✓</span>
                <span className="text-muted-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Billing Info */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Next billing</span>
          </div>
          <span className="font-medium">
            {membershipData.next_billing_date 
              ? format(new Date(membershipData.next_billing_date), 'MMM d, yyyy')
              : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>Monthly rate</span>
          </div>
          <span className="font-medium">${membership?.price}/{membership?.billing_period}</span>
        </div>
      </CardContent>
    </Card>
  );
}
