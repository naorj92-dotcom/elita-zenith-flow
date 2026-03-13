import React, { useMemo } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  Award, 
  Star, 
  Flame, 
  Crown, 
  Heart, 
  Zap, 
  Gift, 
  Camera,
  Users,
  Sparkles,
  Trophy,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  requirement: (data: BadgeData) => boolean;
  progress: (data: BadgeData) => number; // 0-100
}

interface BadgeData {
  visitCount: number;
  totalSpent: number;
  photosCount: number;
  referralsCount: number;
  reviewsCount: number;
  streakCurrent: number;
  packagesCount: number;
  membershipActive: boolean;
}

const BADGES: BadgeDefinition[] = [
  {
    id: 'first-visit',
    name: 'Welcome',
    description: 'Complete your first visit',
    icon: Star,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    requirement: (d) => d.visitCount >= 1,
    progress: (d) => Math.min(100, (d.visitCount / 1) * 100),
  },
  {
    id: 'regular',
    name: 'Regular',
    description: 'Complete 5 visits',
    icon: Heart,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    requirement: (d) => d.visitCount >= 5,
    progress: (d) => Math.min(100, (d.visitCount / 5) * 100),
  },
  {
    id: 'loyal',
    name: 'Loyal Client',
    description: 'Complete 10 visits',
    icon: Award,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    requirement: (d) => d.visitCount >= 10,
    progress: (d) => Math.min(100, (d.visitCount / 10) * 100),
  },
  {
    id: 'vip',
    name: 'VIP Status',
    description: 'Complete 25 visits',
    icon: Crown,
    color: 'text-primary',
    bgColor: 'bg-primary/15',
    requirement: (d) => d.visitCount >= 25,
    progress: (d) => Math.min(100, (d.visitCount / 25) * 100),
  },
  {
    id: 'big-spender',
    name: 'Investor',
    description: 'Spend $1,000+',
    icon: Zap,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    requirement: (d) => d.totalSpent >= 1000,
    progress: (d) => Math.min(100, (d.totalSpent / 1000) * 100),
  },
  {
    id: 'elite-spender',
    name: 'Elite',
    description: 'Spend $5,000+',
    icon: Trophy,
    color: 'text-primary',
    bgColor: 'bg-primary/15',
    requirement: (d) => d.totalSpent >= 5000,
    progress: (d) => Math.min(100, (d.totalSpent / 5000) * 100),
  },
  {
    id: 'streak-3',
    name: 'On Fire',
    description: '3-month visit streak',
    icon: Flame,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    requirement: (d) => d.streakCurrent >= 3,
    progress: (d) => Math.min(100, (d.streakCurrent / 3) * 100),
  },
  {
    id: 'photo-lover',
    name: 'Glow Up',
    description: 'Have 5+ progress photos',
    icon: Camera,
    color: 'text-info',
    bgColor: 'bg-info/10',
    requirement: (d) => d.photosCount >= 5,
    progress: (d) => Math.min(100, (d.photosCount / 5) * 100),
  },
  {
    id: 'referrer',
    name: 'Ambassador',
    description: 'Refer 3 friends',
    icon: Users,
    color: 'text-success',
    bgColor: 'bg-success/10',
    requirement: (d) => d.referralsCount >= 3,
    progress: (d) => Math.min(100, (d.referralsCount / 3) * 100),
  },
  {
    id: 'reviewer',
    name: 'Voice',
    description: 'Leave 3 reviews',
    icon: Sparkles,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    requirement: (d) => d.reviewsCount >= 3,
    progress: (d) => Math.min(100, (d.reviewsCount / 3) * 100),
  },
  {
    id: 'member',
    name: 'Member',
    description: 'Activate a membership',
    icon: Gift,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    requirement: (d) => d.membershipActive,
    progress: (d) => d.membershipActive ? 100 : 0,
  },
  {
    id: 'package-pro',
    name: 'Committed',
    description: 'Purchase 3 packages',
    icon: Target,
    color: 'text-success',
    bgColor: 'bg-success/10',
    requirement: (d) => d.packagesCount >= 3,
    progress: (d) => Math.min(100, (d.packagesCount / 3) * 100),
  },
];

export function AchievementBadgesWidget() {
  const { client } = useClientAuth();

  const { data: badgeData } = useQuery({
    queryKey: ['client-badge-data', client?.id],
    queryFn: async (): Promise<BadgeData> => {
      if (!client?.id) return {
        visitCount: 0, totalSpent: 0, photosCount: 0, referralsCount: 0,
        reviewsCount: 0, streakCurrent: 0, packagesCount: 0, membershipActive: false,
      };

      const [photos, referrals, reviews, streak, packages, memberships] = await Promise.all([
        supabase.from('before_after_photos').select('*', { count: 'exact', head: true })
          .eq('client_id', client.id).eq('is_visible_to_client', true),
        supabase.from('referrals').select('*', { count: 'exact', head: true })
          .eq('referrer_client_id', client.id),
        supabase.from('client_reviews').select('*', { count: 'exact', head: true })
          .eq('client_id', client.id),
        supabase.from('visit_streaks').select('current_streak').eq('client_id', client.id).maybeSingle(),
        supabase.from('client_packages').select('*', { count: 'exact', head: true })
          .eq('client_id', client.id),
        supabase.from('client_memberships').select('*', { count: 'exact', head: true })
          .eq('client_id', client.id).eq('status', 'active'),
      ]);

      return {
        visitCount: client.visit_count || 0,
        totalSpent: client.total_spent || 0,
        photosCount: photos.count || 0,
        referralsCount: referrals.count || 0,
        reviewsCount: reviews.count || 0,
        streakCurrent: streak.data?.current_streak || 0,
        packagesCount: packages.count || 0,
        membershipActive: (memberships.count || 0) > 0,
      };
    },
    enabled: !!client?.id,
  });

  const { earned, inProgress } = useMemo(() => {
    if (!badgeData) return { earned: [], inProgress: [] };
    const e = BADGES.filter(b => b.requirement(badgeData));
    const ip = BADGES.filter(b => !b.requirement(badgeData))
      .sort((a, b) => b.progress(badgeData) - a.progress(badgeData))
      .slice(0, 4);
    return { earned: e, inProgress: ip };
  }, [badgeData]);

  if (!badgeData) return null;

  return (
    <Card className="card-luxury">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-heading flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Achievements
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {earned.length}/{BADGES.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Earned Badges */}
        {earned.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Earned</p>
            <div className="flex flex-wrap gap-3">
              {earned.map((badge, i) => {
                const Icon = badge.icon;
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
                    className="group relative"
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform hover:scale-110",
                      badge.bgColor,
                    )}>
                      <Icon className={cn("w-6 h-6", badge.color)} />
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {badge.name}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45 -mt-1" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* In Progress */}
        {inProgress.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">In Progress</p>
            <div className="space-y-2.5">
              {inProgress.map((badge) => {
                const Icon = badge.icon;
                const progress = badge.progress(badgeData);
                return (
                  <div key={badge.id} className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center opacity-40",
                      badge.bgColor,
                    )}>
                      <Icon className={cn("w-4 h-4", badge.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{badge.name}</span>
                        <span className="text-[10px] text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary/50"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
