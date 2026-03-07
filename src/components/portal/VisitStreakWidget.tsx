import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Star } from 'lucide-react';

export function VisitStreakWidget() {
  const { client } = useClientAuth();

  const { data: streak } = useQuery({
    queryKey: ['client-visit-streak', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data } = await supabase
        .from('visit_streaks' as any)
        .select('*')
        .eq('client_id', client.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!client?.id,
  });

  // Also compute from appointments if no streak record
  const { data: monthsVisited } = useQuery({
    queryKey: ['client-months-visited', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data } = await supabase
        .from('appointments')
        .select('scheduled_at')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .gte('scheduled_at', sixMonthsAgo.toISOString())
        .order('scheduled_at', { ascending: false });
      if (!data) return 0;
      const months = new Set(data.map(a => {
        const d = new Date(a.scheduled_at);
        return `${d.getFullYear()}-${d.getMonth()}`;
      }));
      return months.size;
    },
    enabled: !!client?.id,
  });

  const currentStreak = streak?.current_streak || monthsVisited || 0;
  const longestStreak = streak?.longest_streak || currentStreak;

  if (currentStreak === 0) return null;

  const getStreakEmoji = (s: number) => {
    if (s >= 6) return '🏆';
    if (s >= 3) return '🔥';
    return '⭐';
  };

  const getStreakMessage = (s: number) => {
    if (s >= 6) return 'Incredible dedication!';
    if (s >= 3) return "You're on fire!";
    if (s >= 2) return 'Keep it going!';
    return 'Great start!';
  };

  return (
    <Card className="card-luxury overflow-hidden bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border-amber-500/20">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-2xl">
              {getStreakEmoji(currentStreak)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-heading font-bold">{currentStreak}</span>
                <span className="text-sm font-medium text-muted-foreground">month streak</span>
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-sm text-muted-foreground">{getStreakMessage(currentStreak)}</p>
            </div>
          </div>
          {longestStreak > currentStreak && (
            <Badge variant="outline" className="text-xs gap-1">
              <Trophy className="h-3 w-3" />
              Best: {longestStreak}
            </Badge>
          )}
        </div>
        {currentStreak >= 3 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-500/10 rounded-lg px-3 py-2">
            <Star className="h-3.5 w-3.5" />
            <span>You earned {currentStreak * 10} bonus loyalty points for your streak!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
