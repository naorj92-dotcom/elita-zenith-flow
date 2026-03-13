import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Package, MessageCircle, FileText, Camera, Crown, Gift, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  accent?: boolean;
}

interface QuickActionsGridProps {
  pendingFormsCount?: number;
}

export function QuickActionsGrid({ pendingFormsCount = 0 }: QuickActionsGridProps) {
  const actions: QuickAction[] = [
    { label: 'Book Now', href: '/portal/book', icon: CalendarPlus, accent: true },
    { label: 'Packages', href: '/portal/packages', icon: Package },
    { label: 'Messages', href: '/portal/messages', icon: MessageCircle },
    { label: 'Forms', href: '/portal/forms', icon: FileText, badge: pendingFormsCount },
    { label: 'Photos', href: '/portal/photos', icon: Camera },
    { label: 'Membership', href: '/portal/memberships', icon: Crown },
    { label: 'Rewards', href: '/portal/rewards', icon: Gift },
    { label: 'Skin AI', href: '/portal/skin-analysis', icon: Sparkles },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            to={action.href}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 group relative",
              action.accent
                ? "bg-primary/10 hover:bg-primary/15 border border-primary/20"
                : "bg-card hover:bg-accent border border-border"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              action.accent
                ? "bg-primary/15 group-hover:bg-primary/25"
                : "bg-muted group-hover:bg-primary/10"
            )}>
              <Icon className={cn(
                "w-5 h-5 transition-colors",
                action.accent ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )} />
            </div>
            <span className={cn(
              "text-[11px] font-medium text-center leading-tight",
              action.accent ? "text-primary" : "text-foreground"
            )}>
              {action.label}
            </span>
            {action.badge && action.badge > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-[10px] bg-destructive text-destructive-foreground border-0">
                {action.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </div>
  );
}
