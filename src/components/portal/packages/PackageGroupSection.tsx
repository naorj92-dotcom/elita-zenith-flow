import React from 'react';
import { PricingTierCard } from './PricingTierCard';

interface PricingTier {
  sessions: number;
  total_price: number;
  price_per_session: number;
  value_percent: number;
}

interface PackageGroupSectionProps {
  groupName: string;
  packages: any[];
  onPurchase: (pkg: any, tier: PricingTier) => void;
  onInquire: (pkg: any, tier: PricingTier) => void;
  getTiers: (pkg: any) => PricingTier[];
}

export function PackageGroupSection({ groupName, packages, onPurchase, onInquire, getTiers }: PackageGroupSectionProps) {
  return (
    <div className="space-y-5">
      {/* Group Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-primary" />
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">{groupName}</h3>
          {packages.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Available in {packages.map((p: any) => p.sizeName).join(', ')}
            </p>
          )}
        </div>
      </div>

      {packages.map((pkg: any) => {
        const tiers = getTiers(pkg);
        return (
          <div key={pkg.id} className="space-y-3">
            {packages.length > 1 && (
              <p className="text-sm font-medium text-foreground pl-1">
                {pkg.sizeName || pkg.name}
                {pkg.description && (
                  <span className="text-muted-foreground font-normal ml-1.5">— {pkg.description}</span>
                )}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tiers.map((tier, idx) => (
                <PricingTierCard
                  key={idx}
                  tier={tier}
                  isBestValue={idx === tiers.length - 1 && tiers.length > 1}
                  isPopular={idx === Math.floor(tiers.length / 2) && tiers.length > 2}
                  onPurchase={() => onPurchase(pkg, tier)}
                  onInquire={() => onInquire(pkg, tier)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
