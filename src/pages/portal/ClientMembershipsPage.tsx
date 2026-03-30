import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Crown, Check, Sparkles, Gift, Calendar, History, ShoppingCart, AlertTriangle, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MembershipUsageHistory } from '@/components/portal/MembershipUsageHistory';
import { Link } from 'react-router-dom';

export function ClientMembershipsPage() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2>(0);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [upgradeTarget, setUpgradeTarget] = useState<any>(null);

  const { data: currentMembership } = useQuery({
    queryKey: ['client-membership', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data, error } = await supabase
        .from('client_memberships')
        .select('*, memberships (*)')
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
  });

  // Estimate savings from visit history
  const { data: estimatedSavings } = useQuery({
    queryKey: ['estimated-savings', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const { data, error } = await supabase
        .from('appointments')
        .select('total_amount')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .gte('scheduled_at', threeMonthsAgo.toISOString());
      if (error) throw error;
      const totalSpent = data?.reduce((s, a) => s + Number(a.total_amount), 0) || 0;
      const monthlyAvg = totalSpent / 3;
      return Math.round(monthlyAvg * 0.15); // ~15% savings estimate
    },
    enabled: !!client?.id && !currentMembership,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!currentMembership?.id) throw new Error('No membership');
      const { error } = await supabase
        .from('client_memberships')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', currentMembership.id);
      if (error) throw error;
      // Log the cancellation reason as a message
      if (client?.id && cancelReason) {
        await supabase.from('messages').insert({
          client_id: client.id,
          sender_type: 'client',
          subject: 'Membership Cancellation',
          body: `Reason: ${cancelReason}. Feedback: ${cancelFeedback || 'None provided'}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-membership'] });
      toast.success('Membership cancelled. We\'re sorry to see you go.');
      setCancelStep(0);
      setCancelReason('');
      setCancelFeedback('');
    },
    onError: () => toast.error('Could not cancel membership. Please try again.'),
  });

  const handleMembershipInterest = async (tier: any, isUpgrade: boolean) => {
    if (!client?.id) return;
    try {
      const { error } = await supabase.from('purchase_requests' as any).insert({
        client_id: client.id,
        request_type: 'membership',
        membership_id: tier.id,
        tier_total_price: tier.price,
        notes: `${isUpgrade ? 'UPGRADE' : 'NEW ENROLLMENT'}: ${tier.name}`,
      });
      if (error) throw error;
      toast.success(
        isUpgrade
          ? `Upgrade request to ${tier.name} submitted! We'll finalize the switch for you.`
          : `Enrollment request for ${tier.name} submitted! Our team will reach out.`
      );
      setUpgradeTarget(null);
    } catch {
      toast.error('Could not submit your request. Please try again.');
    }
  };

  const currentTierPrice = currentMembership?.memberships?.price || 0;

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

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status" className="gap-2">
            <Crown className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <History className="h-4 w-4" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-6 space-y-6">
          {currentMembership ? (
            <Card className="card-luxury border-primary/30 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="font-heading">Your Membership</CardTitle>
                  </div>
                  <Badge variant="success">{currentMembership.status}</Badge>
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
                    <p className="text-xs text-muted-foreground">Credits Left</p>
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

                {/* Included service CTA */}
                {currentMembership.remaining_credits > 0 && (
                  <div className="p-4 bg-primary/10 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Your included treatment this month</p>
                      <p className="text-xs text-muted-foreground">{currentMembership.remaining_credits} credit(s) remaining</p>
                    </div>
                    <Button size="sm" asChild>
                      <Link to="/portal/booking">Book Now</Link>
                    </Button>
                  </div>
                )}

                {/* Benefits */}
                {currentMembership.memberships?.benefits && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Your Benefits</h4>
                    <ul className="space-y-2 text-sm">
                      {(currentMembership.memberships.benefits as string[]).map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-success" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => setCancelStep(1)}>
                    Cancel Membership
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-luxury">
              <CardContent className="py-12 text-center">
                <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Membership</h3>
                <p className="text-muted-foreground mb-2">
                  Join our membership program to unlock exclusive benefits
                </p>
              </CardContent>
            </Card>
          )}

          {/* FAQ */}
          <Card className="card-luxury">
            <CardHeader><CardTitle className="font-heading">Membership FAQ</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">How do credits work?</h4>
                <p className="text-sm text-muted-foreground">Credits can be used for any signature treatment. Unused credits roll over for up to 3 months.</p>
              </div>
              <div>
                <h4 className="font-medium">Can I upgrade?</h4>
                <p className="text-sm text-muted-foreground">Yes! Simply browse plans and tap Upgrade. The price difference is prorated to your billing cycle.</p>
              </div>
              <div>
                <h4 className="font-medium">What's priority booking?</h4>
                <p className="text-sm text-muted-foreground">VIP members get early access to new time slots and priority during busy seasons.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <MembershipUsageHistory />
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {availableMemberships?.map((tier, index) => {
              const isCurrentTier = currentMembership?.memberships?.id === tier.id;
              const isUpgrade = currentMembership && Number(tier.price) > Number(currentTierPrice);
              const benefits = Array.isArray(tier.benefits) ? tier.benefits as string[] : [];
              const isTopTier = index === (availableMemberships.length - 1);

              return (
                <Card
                  key={tier.id}
                  className={`card-luxury relative overflow-hidden ${getTierColor(index, isCurrentTier)} ${isTopTier && !isCurrentTier ? 'border-primary' : ''}`}
                >
                  {isTopTier && !isCurrentTier && (
                    <div className="absolute top-4 right-4"><Crown className="h-5 w-5 text-yellow-600" /></div>
                  )}
                  {isCurrentTier && (
                    <div className="absolute top-4 right-4"><Badge>Current</Badge></div>
                  )}
                  <CardHeader>
                    <CardTitle className="font-heading text-xl">{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="flex items-baseline gap-1">
                       <span className="text-3xl font-heading font-semibold">${tier.price}</span>
                       <span className="text-muted-foreground">/{tier.billing_period}</span>
                     </div>

                     <div className="flex items-center gap-4 text-sm">
                      <span>{tier.monthly_service_credits === 99 ? 'Unlimited' : tier.monthly_service_credits} treatment{tier.monthly_service_credits !== 1 ? 's' : ''}/mo</span>
                      {tier.priority_booking && <Badge variant="outline" className="text-xs">VIP</Badge>}
                    </div>

                    <ul className="space-y-2 text-sm">
                      {benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-success" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    {!isCurrentTier && (
                      <Button
                        className="w-full"
                        variant={isTopTier ? 'default' : 'secondary'}
                        onClick={() => {
                          if (isUpgrade) {
                            setUpgradeTarget(tier);
                          } else {
                            handleMembershipInterest(tier, false);
                          }
                        }}
                      >
                        {isUpgrade ? (
                          <><ArrowUp className="h-4 w-4 mr-1" />Upgrade</>
                        ) : (
                          <><ShoppingCart className="h-4 w-4 mr-1" />Join</>
                        )}
                      </Button>
                    )}
                    {isCurrentTier && (
                      <Button className="w-full" disabled variant="outline">Current Plan</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

        </TabsContent>
      </Tabs>

      {/* Cancel Dialog - Step 1 */}
      <Dialog open={cancelStep === 1} onOpenChange={(open) => !open && setCancelStep(0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Cancel Membership
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your {currentMembership?.memberships?.name} membership? You'll lose access to your benefits at the end of the current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelStep(0)}>Keep Membership</Button>
            <Button variant="destructive" onClick={() => setCancelStep(2)}>Yes, Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog - Step 2: Survey */}
      <Dialog open={cancelStep === 2} onOpenChange={(open) => !open && setCancelStep(0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before you go...</DialogTitle>
            <DialogDescription>Help us improve by sharing your reason for cancelling.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
              {['Too expensive', 'Not using enough', 'Moving away', 'Switching providers', 'Other'].map(r => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r}>{r}</Label>
                </div>
              ))}
            </RadioGroup>
            <div className="space-y-2">
              <Label>Additional feedback (optional)</Label>
              <Textarea
                value={cancelFeedback}
                onChange={e => setCancelFeedback(e.target.value)}
                placeholder="Tell us how we could have done better..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelStep(0)}>Nevermind, Keep It</Button>
            <Button
              variant="destructive"
              disabled={!cancelReason || cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Confirmation */}
      <Dialog open={!!upgradeTarget} onOpenChange={(open) => !open && setUpgradeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5 text-primary" />
              Upgrade to {upgradeTarget?.name}
            </DialogTitle>
            <DialogDescription>
              Your plan will be upgraded from {currentMembership?.memberships?.name} (${currentTierPrice}/mo) to {upgradeTarget?.name} (${upgradeTarget?.price}/mo). The difference will be prorated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUpgradeTarget(null)}>Cancel</Button>
            <Button onClick={() => handleMembershipInterest(upgradeTarget, true)}>
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
