import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  compact = false,
}, ref) {
  const ActionButton = actionLabel ? (
    actionHref ? (
      <Button asChild className="mt-4">
        <a href={actionHref}>{actionLabel}</a>
      </Button>
    ) : onAction ? (
      <Button onClick={onAction} className="mt-4">
        {actionLabel}
      </Button>
    ) : null
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8" : "py-16",
        className
      )}
    >
      <div className={cn(
        "rounded-2xl bg-muted/50 flex items-center justify-center mb-4",
        compact ? "w-12 h-12" : "w-16 h-16"
      )}>
        <Icon className={cn(
          "text-muted-foreground",
          compact ? "w-6 h-6" : "w-8 h-8"
        )} />
      </div>
      <h3 className={cn(
        "font-medium text-foreground mb-1",
        compact ? "text-base" : "text-lg"
      )}>
        {title}
      </h3>
      <p className={cn(
        "text-muted-foreground max-w-xs",
        compact ? "text-xs" : "text-sm"
      )}>
        {description}
      </p>
      {ActionButton}
    </motion.div>
  );
});
