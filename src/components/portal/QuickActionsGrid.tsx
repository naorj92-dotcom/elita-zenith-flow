import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Package, MessageCircle, FileText, Camera, Crown, Gift, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  accent?: boolean;
  gradient?: string;
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
    <div className="grid grid-cols-4 gap-2.5">
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Link
              to={action.href}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 group relative",
                "active:scale-95",
                action.accent
                  ? "bg-primary/10 hover:bg-primary/15 border border-primary/20 shadow-sm shadow-primary/5"
                  : "bg-card hover:bg-accent border border-border hover:border-primary/20 hover:shadow-sm"
              )}
            >
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                  action.accent
                    ? "bg-primary/15 group-hover:bg-primary/25"
                    : "bg-muted group-hover:bg-primary/10"
                )}
                whileHover={{ scale: 1.1, rotate: 3 }}
                whileTap={{ scale: 0.9 }}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  action.accent ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )} />
              </motion.div>
              <span className={cn(
                "text-[11px] font-medium text-center leading-tight",
                action.accent ? "text-primary" : "text-foreground"
              )}>
                {action.label}
              </span>
              {action.badge && action.badge > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, delay: 0.3 }}
                >
                  <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1.5 text-[10px] bg-destructive text-destructive-foreground border-2 border-background shadow-sm">
                    {action.badge}
                  </Badge>
                </motion.div>
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
