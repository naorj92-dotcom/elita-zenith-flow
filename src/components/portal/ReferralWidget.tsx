import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Share2, Users, CheckCircle2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export function ReferralWidget() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();

  const { data: referrals } = useQuery({
    queryKey: ['client-referrals', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('referrals' as any)
        .select('*')
        .eq('referrer_client_id', client.id)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!client?.id,
  });

  // Generate or get referral code
  const referralCode = client ? `ELITA-${client.first_name?.toUpperCase().slice(0, 3)}${client.id?.slice(-4).toUpperCase()}` : '';
  const referralLink = `${window.location.origin}/portal/auth?ref=${referralCode}`;

  const handleGenerateCode = async () => {
    if (!client?.id) return;
    // Check if they already have a referral code
    const existing = referrals?.find((r: any) => r.status === 'pending' && !r.referred_client_id);
    if (existing) {
      handleCopyLink();
      return;
    }
    const { error } = await supabase.from('referrals' as any).insert({
      referrer_client_id: client.id,
      referral_code: referralCode,
      reward_amount: 50,
    });
    if (error && !error.message?.includes('duplicate')) {
      toast.error('Could not generate referral code');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['client-referrals'] });
    handleCopyLink();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me at Elita MedSpa!',
          text: `Use my referral code ${referralCode} to get $50 off your first treatment!`,
          url: referralLink,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const completedReferrals = referrals?.filter((r: any) => r.status === 'completed' || r.status === 'rewarded') || [];
  const pendingReferrals = referrals?.filter((r: any) => ['pending', 'signed_up', 'booked'].includes(r.status)) || [];
  const totalEarned = completedReferrals.reduce((sum: number, r: any) => sum + (r.reward_amount || 0), 0);

  return (
    <Card className="card-luxury overflow-hidden">
      <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="h-5 w-5 text-primary" />
          <span className="font-heading font-semibold text-lg">Give $50, Get $50</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Share your referral link with friends. When they book their first treatment, you both earn $50!
        </p>
      </div>
      <CardContent className="p-4 space-y-4">
        {/* Referral Code */}
        <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Your referral code</p>
            <p className="font-mono font-bold text-lg">{referralCode}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleCopyLink}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <Users className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{(referrals?.length || 0)}</p>
            <p className="text-[10px] text-muted-foreground">Referred</p>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <CheckCircle2 className="h-4 w-4 mx-auto text-success mb-1" />
            <p className="text-lg font-bold">{completedReferrals.length}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <DollarSign className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">${totalEarned}</p>
            <p className="text-[10px] text-muted-foreground">Earned</p>
          </div>
        </div>

        {pendingReferrals.length > 0 && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {pendingReferrals.length} referral{pendingReferrals.length !== 1 ? 's' : ''} pending
          </div>
        )}
      </CardContent>
    </Card>
  );
}
