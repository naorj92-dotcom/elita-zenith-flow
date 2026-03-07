import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Check, Sparkles, Gift, Calendar, History, Eye, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MembershipUsageHistory } from '@/components/portal/MembershipUsageHistory';

// Demo membership data
const DEMO_MEMBERSHIP = {
  id: 'demo-membership-1',
  status: 'active',
  start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  next_billing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  remaining_credits: 2,
  memberships: {
    id: 'demo-tier-2',
    name: 'Radiance VIP',
    description: 'Enhanced benefits for the dedicated skincare enthusiast',
    price: 299,
    billing_period: 'monthly',
    monthly_service_credits: 3,
    retail_discount_percent: 15,
    priority_booking: true,
    benefits: [
      '3 treatments per month',
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
    monthly_service_credits: 3,
    retail_discount_percent: 15,
    priority_booking: true,
    benefits: ['3 treatments per month', '15% off all retail', 'Priority booking', 'Complimentary upgrades when available', 'Guest passes (2/year)'],
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
  const { client } = useClientAuth();
  const isDemo = false; // Demo mode removed for security

  const handleMembershipInterest = async (tier: any, isPurchase: boolean) => {
    if (!client?.id) return;
    try {
      const { error } = await supabase.from('purchase_requests' as any).insert({
        client_id: client.id,
        request_type: 'membership',
        membership_id: tier.id,
        tier_total_price: tier.price,
        notes: `${isPurchase ? 'PURCHASE REQUEST' : 'INTEREST'}: ${tier.name} — $${tier.price}/${tier.billing_period}`,
      });
      if (error) throw error;
      toast.success(
        isPurchase
          ? `Purchase request for ${tier.name} submitted! We'll contact you to finalize.`
          : `Interest in ${tier.name} noted! Our team will reach out shortly.`
      );
    } catch {
      toast.error('Could not submit your request. Please try again.');
    }
  };

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
    const colors = ['', 'border-yellow-200/30', 'bg-gradient-to-br from-primary/10 to-primary/5'];
    return colors[index] || '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Memberships</h1>
        <p className="text-muted-foreground mt-1">Exclusive benefits for our valued members</p>
      </div>

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <Eye className="h-5 w-5 text-primary" />
          <p className="text-sm">Viewing demo membership data</p>
        </div>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status" className="gap-2">
            <Crown className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <History className="h-4 w-4" />
            Usage History
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <Sparkles className="h-4 w-4" />
            All Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-6 space-y-6">
          {/* Current Membership Status */}
          {currentMembership ? (
            <Card className="card-luxury border-primary/30 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="font-heading">Your Current Membership</CardTitle>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">{currentMembership.status}</Badge>
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

                {/* Benefits list */}
                {currentMembership.memberships?.benefits && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Your Benefits</h4>
                    <ul className="space-y-2 text-sm">
                      {(currentMembership.memberships.benefits as string[]).map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="card-luxury">
              <CardContent className="py-12 text-center">
                <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Membership</h3>
                <p className="text-muted-foreground mb-4">
                  Join our membership program to unlock exclusive benefits
                </p>
                <Button>View Membership Plans</Button>
              </CardContent>
            </Card>
          )}

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
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <MembershipUsageHistory />
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          {/* Available Tiers */}
          <div className="grid gap-6 md:grid-cols-3">
            {availableMemberships?.map((tier, index) => {
              const isCurrentTier = currentMembership?.memberships?.id === tier.id;
              const benefits = Array.isArray(tier.benefits) ? tier.benefits as string[] : [];
              const isTopTier = index === (availableMemberships.length - 1);
              
              return (
                <Card 
                  key={tier.id} 
                  className={`card-luxury relative overflow-hidden ${getTierColor(index, isCurrentTier)} ${isTopTier && !isCurrentTier ? 'border-primary' : ''}`}
                >
                  {isTopTier && (
                    <div className="absolute top-4 right-4">
                      <Crown className="h-5 w-5 text-yellow-600" />
                    </div>
                  )}
                  {isCurrentTier && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary text-primary-foreground">Current</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="font-heading text-xl">{tier.name}</CardTitle>
                    <CardDescription>
                      {tier.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-heading font-semibold">${tier.price}</span>
                      <span className="text-muted-foreground">
                        /{tier.billing_period}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span>{tier.monthly_service_credits === 99 ? 'Unlimited' : tier.monthly_service_credits} treatment{tier.monthly_service_credits !== 1 ? 's' : ''}/mo</span>
                      {tier.priority_booking && (
                        <Badge variant="outline" className="text-xs">
                          VIP
                        </Badge>
                      )}
                    </div>

                    <ul className="space-y-2 text-sm">
                      {benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        className="flex-1" 
                        variant="outline"
                        disabled={isCurrentTier}
                        onClick={() => handleMembershipInterest(tier, false)}
                      >
                        {isCurrentTier ? 'Current Plan' : 'Inquire'}
                      </Button>
                      {!isCurrentTier && (
                        <Button 
                          className="flex-1" 
                          variant={isTopTier ? 'default' : 'secondary'}
                          onClick={() => handleMembershipInterest(tier, true)}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Purchase
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
