import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, X, Crown, Package, Star } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  type: 'service' | 'product';
  id: string;
  name: string;
  price: number;
  quantity: number;
  machineUsed?: string;
}

interface Suggestion {
  id: string;
  ruleType: 'pair_with' | 'package_reminder' | 'membership_upsell' | 'points_earned';
  text: string;
  subtext?: string;
  serviceId?: string;
  packageId?: string;
  price?: number;
  points?: number;
  actionable: boolean;
}

interface ElitaRecommendationsPanelProps {
  cart: CartItem[];
  clientId: string;
  staffId: string;
  onAddService: (item: CartItem) => void;
}

export function ElitaRecommendationsPanel({ cart, clientId, staffId, onAddService }: ElitaRecommendationsPanelProps) {
  const loggedRef = useRef<Set<string>>(new Set());
  const serviceIdsInCart = cart.filter(i => i.type === 'service').map(i => i.id);

  // Pair With rules
  const { data: pairRules = [] } = useQuery({
    queryKey: ['checkout-rules', serviceIdsInCart],
    queryFn: async () => {
      if (serviceIdsInCart.length === 0) return [];
      const { data, error } = await supabase
        .from('checkout_rules')
        .select('*, trigger_service:services!checkout_rules_trigger_service_id_fkey(name), suggested_service:services!checkout_rules_suggested_service_id_fkey(id, name, price)')
        .eq('is_active', true)
        .in('trigger_service_id', serviceIdsInCart);
      if (error) throw error;
      return data || [];
    },
    enabled: serviceIdsInCart.length > 0,
  });

  // Client packages with remaining sessions
  const { data: clientPackages = [] } = useQuery({
    queryKey: ['client-packages-upsell', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_packages')
        .select('*, packages(name)')
        .eq('client_id', clientId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Client membership status
  const { data: clientMembership } = useQuery({
    queryKey: ['client-membership-upsell', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('client_memberships')
        .select('id')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Get cheapest membership for upsell
  const { data: cheapestMembership } = useQuery({
    queryKey: ['cheapest-membership'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, name, price')
        .eq('is_active', true)
        .order('price', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !clientMembership && !!clientId,
  });

  // Client name for display
  const { data: clientData } = useQuery({
    queryKey: ['client-name-upsell', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from('clients')
        .select('first_name')
        .eq('id', clientId)
        .single();
      return data;
    },
    enabled: !!clientId,
  });

  const clientName = clientData?.first_name || 'Client';
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const pointsEarned = Math.floor(subtotal); // 1 point per dollar

  // Build suggestions
  const suggestions: Suggestion[] = [];

  // Rule 1: Pair With
  for (const rule of pairRules) {
    const suggested = rule.suggested_service as any;
    if (!suggested || serviceIdsInCart.includes(suggested.id)) continue;
    suggestions.push({
      id: `pair-${rule.id}`,
      ruleType: 'pair_with',
      text: rule.display_text || `Add ${suggested.name}?`,
      subtext: `$${Number(rule.suggested_price || suggested.price).toFixed(2)}`,
      serviceId: suggested.id,
      price: Number(rule.suggested_price || suggested.price),
      actionable: true,
    });
  }

  // Rule 2: Package Reminder
  for (const pkg of clientPackages) {
    const remaining = pkg.sessions_total - pkg.sessions_used;
    if (remaining <= 0) continue;
    const pkgName = (pkg.packages as any)?.name || 'Package';
    suggestions.push({
      id: `pkg-${pkg.id}`,
      ruleType: 'package_reminder',
      text: `${clientName} has ${remaining} ${pkgName} session${remaining > 1 ? 's' : ''} unused`,
      subtext: 'Rebook now?',
      packageId: pkg.package_id || undefined,
      actionable: true,
    });
  }

  // Rule 3: Membership Upsell
  if (!clientMembership && cheapestMembership && subtotal > 0) {
    const savingsEstimate = Math.round(subtotal * 0.15);
    suggestions.push({
      id: 'membership-upsell',
      ruleType: 'membership_upsell',
      text: `${clientName} would save ~$${savingsEstimate} today with an Elita membership`,
      subtext: `Starting at $${Number(cheapestMembership.price).toFixed(0)}/mo`,
      actionable: true,
    });
  }

  // Rule 4: Points Earned (always shown, not actionable)
  if (subtotal > 0 && clientId) {
    suggestions.push({
      id: 'points-earned',
      ruleType: 'points_earned',
      text: `✨ ${clientName} will earn ${pointsEarned} Elita points from today's visit`,
      points: pointsEarned,
      actionable: false,
    });
  }

  // Log shown suggestions
  useEffect(() => {
    if (!clientId || !staffId) return;
    for (const s of suggestions) {
      if (!loggedRef.current.has(s.id)) {
        loggedRef.current.add(s.id);
        supabase.from('upsell_logs').insert({
          client_id: clientId,
          staff_id: staffId,
          rule_type: s.ruleType,
          suggestion_text: s.text,
          action: 'shown',
          dollar_value: s.price || null,
          related_service_id: s.serviceId || null,
          related_package_id: s.packageId || null,
        });
      }
    }
  }, [suggestions.map(s => s.id).join(',')]);

  const logAction = async (suggestion: Suggestion, action: 'accepted' | 'skipped') => {
    await supabase.from('upsell_logs').insert({
      client_id: clientId,
      staff_id: staffId,
      rule_type: suggestion.ruleType,
      suggestion_text: suggestion.text,
      action,
      dollar_value: action === 'accepted' ? (suggestion.price || null) : null,
      related_service_id: suggestion.serviceId || null,
      related_package_id: suggestion.packageId || null,
    });
  };

  const handleAdd = async (suggestion: Suggestion) => {
    if (suggestion.ruleType === 'pair_with' && suggestion.serviceId) {
      const rule = pairRules.find(r => `pair-${r.id}` === suggestion.id);
      const suggested = rule?.suggested_service as any;
      if (suggested) {
        onAddService({
          type: 'service',
          id: suggested.id,
          name: suggested.name,
          price: Number(suggestion.price || suggested.price),
          quantity: 1,
        });
      }
    }
    await logAction(suggestion, 'accepted');
    toast.success('Added to cart');
  };

  const handleSkip = async (suggestion: Suggestion) => {
    await logAction(suggestion, 'skipped');
    // Remove from view by adding to logged set with skip prefix
    loggedRef.current.add(`skipped-${suggestion.id}`);
    toast('Skipped', { duration: 1500 });
  };

  if (suggestions.length === 0 || !clientId) return null;

  const visibleSuggestions = suggestions.filter(s => !loggedRef.current.has(`skipped-${s.id}`));
  if (visibleSuggestions.length === 0) return null;

  const iconMap: Record<string, React.ReactNode> = {
    pair_with: <Plus className="h-3.5 w-3.5 text-primary" />,
    package_reminder: <Package className="h-3.5 w-3.5 text-amber-500" />,
    membership_upsell: <Crown className="h-3.5 w-3.5 text-primary" />,
    points_earned: <Star className="h-3.5 w-3.5 text-yellow-500" />,
  };

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="py-3 pb-2">
        <CardTitle className="text-sm font-heading flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          Elita Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {visibleSuggestions.map(s => (
          <div
            key={s.id}
            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background border border-border/60"
          >
            <div className="mt-0.5 shrink-0">{iconMap[s.ruleType]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground leading-snug">{s.text}</p>
              {s.subtext && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.subtext}</p>
              )}
            </div>
            {s.actionable && (
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => handleAdd(s)}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] px-2"
                  onClick={() => handleSkip(s)}
                >
                  Skip
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
