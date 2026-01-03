import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Sparkles, Gift, Calendar } from 'lucide-react';
import { format } from 'date-fns';

// Demo membership data
const DEMO_MEMBERSHIP = {
  id: 'demo-membership-1',
  status: 'active',
  start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  next_billing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  remaining_credits: 1,
  memberships: {
    id: 'demo-tier-2',
    name: 'Radiance VIP',
    description: 'Enhanced benefits for the dedicated skincare enthusiast',
    price: 299,
    billing_period: 'monthly',
    monthly_service_credits: 2,
    retail_discount_percent: 15,
    priority_booking: true,
    benefits: [
      '2 treatments per month',
      '15% off all retail',
      'Priority booking',
      'Complimentary upgrades when available',
    ],
  },
};

const DEMO_AVAILABLE_MEMBERSHIPS = [
  {
    id: 'demo-tier-1',
    name: 'Glow Essentials',
    description: 'Perfect for skincare maintenance with monthly facials',
    price: 149,
    billing_period: 'monthly',
    monthly_service_credits: 1,
    retail_discount_percent: 10,
    priority_booking: false,
    benefits: ['1 signature facial per month', '10% off retail products', 'Birthday month bonus treatment', 'Member-only pricing on add-ons'],
  },
  {
    id: 'demo-tier-2',
    name: 'Radiance VIP',
    description: 'Enhanced benefits for the dedicated skincare enthusiast',
    price: 299,
    billing_period: 'monthly',
    monthly_service_credits: 2,
    retail_discount_percent: 15,
    priority_booking: true,
    benefits: ['2 treatments per month', '15% off all retail', 'Priority booking', 'Complimentary upgrades when available', 'Guest passes (2/year)'],
  },
  {
    id: 'demo-tier-3',
    name: 'Elite Unlimited',
    description: 'The ultimate luxury experience with unlimited access',
    price: 499,
    billing_period: 'monthly',
    monthly_service_credits: 99,
    retail_discount_percent: 20,
    priority_booking: true,
    benefits: ['Unlimited signature treatments', '20% off everything', 'Priority VIP booking', 'Exclusive member events', 'Complimentary friend referral treatments'],
  },
];

export function ClientMembershipsPage() {
  const { client, isDemo } = useClientAuth();

  const { data: currentMembership } = useQuery({
    queryKey: ['client-membership', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return DEMO_MEMBERSHIP;
      }
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
    enabled: !!client?.id || isDemo,
  });

  const { data: availableMemberships } = useQuery({
    queryKey: ['available-memberships', isDemo],
    queryFn: async () => {
      if (isDemo) {
        return DEMO_AVAILABLE_MEMBERSHIPS;
      }
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getTierColor = (index: number, isCurrentTier: boolean) => {
    if (isCurrentTier) return 'ring-2 ring-primary bg-primary/5';
    const colors = ['', 'border-elita-gold/30', 'bg-gradient-sage text-primary-foreground'];
    return colors[index] || '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Memberships</h1>
        <p className="text-muted-foreground mt-1">Exclusive benefits for our valued members</p>
      </div>

      {/* Current Membership Status */}
      {currentMembership && (
        <Card className="card-luxury border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-elita-gold" />
                <CardTitle className="font-heading">Your Current Membership</CardTitle>
              </div>
              <Badge className="status-confirmed">{currentMembership.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-heading font-semibold">{currentMembership.memberships?.name}</h3>
                <p className="text-muted-foreground">{currentMembership.memberships?.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-heading font-semibold">${currentMembership.memberships?.price}</p>
                <p className="text-sm text-muted-foreground">/{currentMembership.memberships?.billing_period}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 bg-background rounded-lg text-center">
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xl font-semibold">{currentMembership.remaining_credits}</p>
                <p className="text-xs text-muted-foreground">Credits Remaining</p>
              </div>
              <div className="p-4 bg-background rounded-lg text-center">
                <Gift className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xl font-semibold">{currentMembership.memberships?.retail_discount_percent}%</p>
                <p className="text-xs text-muted-foreground">Retail Discount</p>
              </div>
              <div className="p-4 bg-background rounded-lg text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xl font-semibold">
                  {currentMembership.next_billing_date 
                    ? format(new Date(currentMembership.next_billing_date), 'MMM d')
                    : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Next Billing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Tiers */}
      <div>
        <h2 className="text-xl font-heading font-semibold mb-4">
          {currentMembership ? 'All Membership Tiers' : 'Choose Your Membership'}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {availableMemberships?.map((tier, index) => {
            const isCurrentTier = currentMembership?.memberships?.id === tier.id;
            const benefits = Array.isArray(tier.benefits) ? tier.benefits as string[] : [];
            const isTopTier = index === (availableMemberships.length - 1);
            
            return (
              <Card 
                key={tier.id} 
                className={`card-luxury relative overflow-hidden ${getTierColor(index, isCurrentTier)} ${isTopTier && !isCurrentTier ? 'bg-gradient-sage' : ''}`}
              >
                {isTopTier && (
                  <div className="absolute top-4 right-4">
                    <Crown className="h-5 w-5 text-elita-gold" />
                  </div>
                )}
                {isCurrentTier && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground">Current</Badge>
                  </div>
                )}
                <CardHeader className={isTopTier && !isCurrentTier ? 'text-primary-foreground' : ''}>
                  <CardTitle className="font-heading text-xl">{tier.name}</CardTitle>
                  <CardDescription className={isTopTier && !isCurrentTier ? 'text-primary-foreground/80' : ''}>
                    {tier.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className={`space-y-4 ${isTopTier && !isCurrentTier ? 'text-primary-foreground' : ''}`}>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-heading font-semibold">${tier.price}</span>
                    <span className={isTopTier && !isCurrentTier ? 'text-primary-foreground/80' : 'text-muted-foreground'}>
                      /{tier.billing_period}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span>{tier.monthly_service_credits === 99 ? 'Unlimited' : tier.monthly_service_credits} treatment{tier.monthly_service_credits !== 1 ? 's' : ''}/mo</span>
                    {tier.priority_booking && (
                      <Badge variant="outline" className={`text-xs ${isTopTier && !isCurrentTier ? 'border-primary-foreground/30 text-primary-foreground' : ''}`}>
                        VIP
                      </Badge>
                    )}
                  </div>

                  <ul className="space-y-2 text-sm">
                    {benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isTopTier && !isCurrentTier ? 'text-primary-foreground' : 'text-success'}`} />
                        <span className={isTopTier && !isCurrentTier ? 'text-primary-foreground/90' : ''}>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full mt-4" 
                    variant={isCurrentTier ? 'outline' : isTopTier ? 'secondary' : 'default'}
                    disabled={isCurrentTier}
                  >
                    {isCurrentTier ? 'Current Plan' : 'Get Started'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="font-heading">Membership FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">How do credits work?</h4>
            <p className="text-sm text-muted-foreground">Credits can be used for any signature treatment. Unused credits roll over for up to 3 months.</p>
          </div>
          <div>
            <h4 className="font-medium">Can I pause my membership?</h4>
            <p className="text-sm text-muted-foreground">Yes, you can pause your membership for up to 2 months per year. Just let us know at least 7 days before your next billing date.</p>
          </div>
          <div>
            <h4 className="font-medium">What's included in priority booking?</h4>
            <p className="text-sm text-muted-foreground">VIP members get early access to new time slots and priority during busy seasons. We'll always find time for you!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
