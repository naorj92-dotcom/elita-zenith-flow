import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { CalendarCheck, DollarSign, Star } from 'lucide-react';

interface DashboardStatsRowProps {
  visitCount: number;
  totalSpent: number;
  lastVisitDate?: string | null;
  loyaltyPoints: number;
}

export function DashboardStatsRow({ visitCount, totalSpent, lastVisitDate, loyaltyPoints }: DashboardStatsRowProps) {
  const stats = [
    {
      icon: CalendarCheck,
      value: visitCount.toString(),
      label: 'Visits',
    },
    {
      icon: DollarSign,
      value: `$${totalSpent.toLocaleString()}`,
      label: 'Invested',
    },
    {
      icon: Star,
      value: loyaltyPoints.toLocaleString(),
      label: 'Points',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground leading-none">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
