import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Star } from 'lucide-react';

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
          Recommended
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

        {/* Description */}
        <div className="text-center space-y-0.5">
          <p className="text-sm text-muted-foreground">
            {tier.sessions === 1
              ? 'Try a single session'
              : tier.sessions <= 3
                ? 'Great for getting started'
                : tier.sessions <= 6
                  ? 'Ideal treatment course'
                  : 'Full transformation program'}
          </p>
        </div>

        {/* CTA */}
        <div className="w-full space-y-1.5 pt-1">
          <Button
            size="sm"
            className="w-full gap-1.5 h-10"
            variant={isBestValue ? 'default' : 'outline'}
            onClick={onPurchase}
          >
            <Send className="h-3.5 w-3.5" />
            I'm Interested
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
