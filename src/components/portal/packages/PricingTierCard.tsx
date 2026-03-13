import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star, TrendingDown } from 'lucide-react';

interface PricingTier {
  sessions: number;
  total_price: number;
  price_per_session: number;
  value_percent: number;
}

interface PricingTierCardProps {
  tier: PricingTier;
  isBestValue: boolean;
  isPopular: boolean;
  onPurchase: () => void;
  onInquire: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

export function PricingTierCard({ tier, isBestValue, isPopular, onPurchase, onInquire }: PricingTierCardProps) {
  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 ${
        isBestValue
          ? 'border-primary shadow-md ring-1 ring-primary/15 scale-[1.02]'
          : 'border-border/80 hover:border-primary/30 hover:shadow-sm'
      }`}
    >
      {/* Badge ribbon */}
      {isBestValue && (
        <div className="bg-primary text-primary-foreground text-[10px] font-semibold text-center py-1.5 tracking-widest uppercase flex items-center justify-center gap-1">
          <Star className="h-3 w-3" />
          Best Value
        </div>
      )}
      {isPopular && !isBestValue && (
        <div className="bg-muted text-muted-foreground text-[10px] font-semibold text-center py-1.5 tracking-widest uppercase">
          Most Popular
        </div>
      )}

      <CardContent className={`p-5 flex flex-col items-center gap-4 ${isBestValue || isPopular ? '' : 'pt-6'}`}>
        {/* Session count */}
        <div className="text-center">
          <p className="text-4xl font-heading font-bold text-foreground leading-none">
            {tier.sessions}
          </p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-1.5">
            Session{tier.sessions !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-border" />

        {/* Price */}
        <div className="text-center space-y-0.5">
          <p className="text-2xl font-heading font-semibold text-foreground">
            {formatCurrency(tier.total_price)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(tier.price_per_session)} per session
          </p>
        </div>

        {/* Savings badge */}
        <div className="h-6 flex items-center">
          {tier.value_percent > 0 ? (
            <span className="inline-flex items-center gap-1 bg-success/10 text-success text-xs font-semibold px-2.5 py-1 rounded-full">
              <TrendingDown className="h-3 w-3" />
              Save {tier.value_percent}%
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Single session rate</span>
          )}
        </div>

        {/* CTA */}
        <div className="w-full space-y-1.5 pt-1">
          <Button
            size="sm"
            className="w-full gap-1.5 h-10"
            variant={isBestValue ? 'default' : 'outline'}
            onClick={onPurchase}
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-muted-foreground text-xs h-8"
            onClick={onInquire}
          >
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
