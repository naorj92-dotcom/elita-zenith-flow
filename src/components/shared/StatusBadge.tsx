import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Crown, Clock, AlertTriangle, CheckCircle, XCircle, Play, UserCheck } from 'lucide-react';

export type AppointmentStatusType = 
  | 'scheduled' 
  | 'confirmed' 
  | 'checked_in' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show'
  | 'late';

export type MembershipStatusType = 'member' | 'vip' | 'none';

interface StatusBadgeProps {
  status: AppointmentStatusType | MembershipStatusType | string;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { 
  label: string; 
  className: string; 
  icon?: React.ComponentType<{ className?: string }> 
}> = {
  // Appointment statuses
  scheduled: {
    label: 'Scheduled',
    className: 'bg-muted text-muted-foreground border border-border',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-success/10 text-success border border-success/20',
    icon: CheckCircle,
  },
  checked_in: {
    label: 'Checked In',
    className: 'bg-info/10 text-info border border-info/20',
    icon: UserCheck,
  },
  in_progress: {
    label: 'In Treatment',
    className: 'bg-primary/15 text-primary border border-primary/30 font-medium',
    icon: Play,
  },
  completed: {
    label: 'Completed',
    className: 'bg-muted text-muted-foreground border border-border',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/10 text-destructive border border-destructive/20',
    icon: XCircle,
  },
  no_show: {
    label: 'No Show',
    className: 'bg-destructive/10 text-destructive border border-destructive/20',
    icon: XCircle,
  },
  late: {
    label: 'Late',
    className: 'bg-warning/10 text-warning border border-warning/20',
    icon: AlertTriangle,
  },
  // Membership statuses
  member: {
    label: 'Member',
    className: 'bg-primary/10 text-primary border border-primary/20',
    icon: Crown,
  },
  vip: {
    label: 'VIP',
    className: 'bg-primary/15 text-primary border border-primary/30 font-medium',
    icon: Crown,
  },
};

export function StatusBadge({ status, showIcon = false, className, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status.replace(/_/g, ' '),
    className: 'bg-muted text-muted-foreground border border-border',
  };

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize rounded-full',
        config.className,
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'px-2.5 py-0.5',
        className
      )}
    >
      {showIcon && Icon && <Icon className={cn("mr-1", size === 'sm' ? "w-3 h-3" : "w-3.5 h-3.5")} />}
      {config.label}
    </Badge>
  );
}

// Quick helper for membership badges
export function MembershipBadge({ 
  isMember, 
  isVip, 
  className 
}: { 
  isMember?: boolean; 
  isVip?: boolean; 
  className?: string;
}) {
  if (isVip) {
    return <StatusBadge status="vip" showIcon className={className} size="sm" />;
  }
  if (isMember) {
    return <StatusBadge status="member" showIcon className={className} size="sm" />;
  }
  return null;
}
