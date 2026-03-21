import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, DollarSign, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DashboardStatsRowProps {
  visitCount: number;
  totalSpent: number;
  lastVisitDate?: string | null;
  loyaltyPoints: number;
}

function AnimatedCounter({ value, prefix = '' }: { value: string; prefix?: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-lg font-bold text-foreground leading-none tabular-nums"
    >
      {prefix}{value}
    </motion.p>
  );
}

export function DashboardStatsRow({ visitCount, totalSpent, lastVisitDate, loyaltyPoints }: DashboardStatsRowProps) {
  const stats = [
    {
      icon: CalendarCheck,
      value: visitCount.toString(),
      label: 'Visits',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: DollarSign,
      value: `$${totalSpent.toLocaleString()}`,
      label: 'Invested',
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      icon: Star,
      value: loyaltyPoints.toLocaleString(),
      label: 'Points',
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <Card className="border-border/50 hover:border-primary/20 transition-colors">
              <CardContent className="p-3.5 flex items-center gap-2.5">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", stat.bg)}>
                  <Icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <div className="min-w-0">
                  <AnimatedCounter value={stat.value} />
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
