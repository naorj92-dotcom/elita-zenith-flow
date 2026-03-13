import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, CalendarPlus, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface ActivePackageCardProps {
  pkg: any;
}

export function ActivePackageCard({ pkg }: ActivePackageCardProps) {
  const progress = (pkg.sessions_used / pkg.sessions_total) * 100;
  const remaining = pkg.sessions_total - pkg.sessions_used;

  return (
    <Card className="group relative overflow-hidden border-primary/20 bg-card transition-all hover:shadow-md">
      {/* Subtle accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <CardContent className="p-6 pt-7 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-heading font-semibold text-foreground">
                {pkg.packages?.name || 'Package'}
              </h3>
              <Badge className="bg-success/10 text-success border-success/20 text-[11px] font-medium">
                Active
              </Badge>
            </div>
            {pkg.packages?.description && (
              <p className="text-sm text-muted-foreground">{pkg.packages.description}</p>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Progress</p>
              <p className="text-2xl font-heading font-bold text-foreground">
                {pkg.sessions_used}
                <span className="text-base font-normal text-muted-foreground">
                  /{pkg.sessions_total} sessions
                </span>
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 bg-primary/8 text-primary px-3 py-1.5 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-sm font-semibold">{remaining} left</span>
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Purchased {format(new Date(pkg.purchase_date), 'MMM d, yyyy')}</span>
            {pkg.expiry_date && (
              <>
                <span className="mx-1">·</span>
                <span>Expires {format(new Date(pkg.expiry_date), 'MMM d, yyyy')}</span>
              </>
            )}
          </div>
          {remaining > 0 && (
            <Link to="/portal/book">
              <Button size="sm" className="gap-1.5 h-9">
                <CalendarPlus className="h-3.5 w-3.5" />
                Book Session
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
