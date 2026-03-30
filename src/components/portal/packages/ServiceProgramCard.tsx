import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles } from 'lucide-react';

interface ServiceProgramCardProps {
  groupName: string;
  description: string;
  sizeVariants: any[];
  onInquire: (pkg: any) => void;
}

export function ServiceProgramCard({ groupName, description, sizeVariants, onInquire }: ServiceProgramCardProps) {
  return (
    <Card className="overflow-hidden border-border/80 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      <CardContent className="p-6 space-y-4">
        {/* Title & Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-heading font-semibold text-foreground">{groupName}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>

        {/* Size variants */}
        {sizeVariants.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Available Sizes</p>
            <div className="flex flex-wrap gap-2">
              {sizeVariants.map((pkg: any) => (
                <Badge key={pkg.id} variant="secondary" className="text-xs font-medium">
                  {pkg.sizeName || pkg.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <Button
          className="w-full gap-2 h-10"
          onClick={() => onInquire(sizeVariants[0])}
        >
          <Send className="h-3.5 w-3.5" />
          I'm Interested — Tell Me More
        </Button>
      </CardContent>
    </Card>
  );
}
