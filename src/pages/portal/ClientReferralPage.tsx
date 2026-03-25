import React, { useState, useEffect } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, MessageCircle, Share2, Check, Gift, Users, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

function generateReferralCode(firstName: string): string {
  const prefix = (firstName || 'ELITA').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).padEnd(4, 'X');
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `ELITA-${prefix}-${digits}`;
}

export function ClientReferralPage() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Fetch referral settings
  const { data: settings } = useQuery({
    queryKey: ['referral-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('value')
        .eq('key', 'referral_program')
        .maybeSingle();
      return (data?.value as any) || { enabled: true, referrer_reward: '$50 credit', referee_reward: '10% off first visit' };
    },
  });

  // Fetch or generate referral code
  const { data: referralCode, isLoading: codeLoading } = useQuery({
    queryKey: ['my-referral-code', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      // Check if client already has a code
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client.id)
        .single();

      const existing = (clientData as any)?.referral_code;
      if (existing) return existing as string;

      // Generate and save
      const code = generateReferralCode(client.first_name);
      await supabase
        .from('clients')
        .update({ referral_code: code } as any)
        .eq('id', client.id);

      return code;
    },
    enabled: !!client?.id,
  });

  // Fetch referrals
  const { data: referrals = [] } = useQuery({
    queryKey: ['my-referrals', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('referrals')
        .select('*, referred_client:clients!referrals_referred_client_id_fkey(first_name)')
        .eq('referrer_client_id', client.id)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!client?.id,
  });

  const shareUrl = referralCode ? `${window.location.origin}/portal/auth?ref=${referralCode}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSMS = () => {
    const text = `I love my results at Elita MedSpa! Book using my link and we both get rewarded: ${shareUrl}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank');
  };

  const handleWhatsApp = () => {
    const text = `I love my results at Elita MedSpa! Book using my link and we both get rewarded: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const totalRewards = referrals.filter((r: any) => r.reward_credited).length;
  const referrerReward = settings?.referrer_reward || '$50 credit';
  const refereeReward = settings?.referee_reward || '10% off first visit';

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return { label: 'Visit Complete', color: 'bg-success/10 text-success border-success/20' };
      case 'booked': return { label: 'Booked', color: 'bg-primary/10 text-primary border-primary/20' };
      default: return { label: 'Link Shared', color: 'bg-muted text-muted-foreground border-border/50' };
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-24 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Refer a Friend</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share the love and earn rewards together
        </p>
      </div>

      {/* Referral Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-primary/15">
          <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent px-6 py-5 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-foreground">My Referral Link</h2>
                <p className="text-xs text-muted-foreground">Share and earn {referrerReward}</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 space-y-5">
            {/* Code display */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/30">
              <code className="flex-1 text-sm font-mono text-foreground truncate">
                {codeLoading ? '...' : referralCode}
              </code>
              <Badge variant="outline" className="text-[10px] shrink-0 border-primary/20 text-primary">
                Your Code
              </Badge>
            </div>

            {/* Shareable URL */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border/20">
              <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">Shareable Link</p>
              <p className="text-xs text-foreground font-mono truncate">{shareUrl || '...'}</p>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" size="sm" className="h-11 rounded-xl" onClick={handleCopy} disabled={!referralCode}>
                {copied ? <Check className="h-4 w-4 mr-1.5 text-emerald-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" className="h-11 rounded-xl" onClick={handleSMS} disabled={!referralCode}>
                <MessageCircle className="h-4 w-4 mr-1.5" />
                SMS
              </Button>
              <Button variant="outline" size="sm" className="h-11 rounded-xl" onClick={handleWhatsApp} disabled={!referralCode}>
                <Share2 className="h-4 w-4 mr-1.5" />
                WhatsApp
              </Button>
            </div>

            {/* How it works */}
            <div className="pt-3 border-t border-border/30">
              <p className="text-xs font-medium text-foreground mb-3">How it works</p>
              <div className="space-y-2.5">
                {[
                  { step: '1', text: 'Share your unique link with a friend' },
                  { step: '2', text: 'They book and complete their first visit' },
                  { step: '3', text: `You get ${referrerReward}, they get ${refereeReward}` },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {s.step}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* My Referrals */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-foreground">My Referrals</h2>
          {totalRewards > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {totalRewards} reward{totalRewards !== 1 ? 's' : ''} earned
            </Badge>
          )}
        </div>

        {referrals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No referrals yet</p>
              <p className="text-xs text-muted-foreground">Share your link above to start earning rewards</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref: any, i: number) => {
              const status = getStatusLabel(ref.status);
              const friendName = ref.referred_client?.first_name || `Friend ${i + 1}`;
              return (
                <Card key={ref.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center text-sm font-semibold text-muted-foreground">
                      {friendName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{friendName}</p>
                      <Badge variant="outline" className={`text-[10px] mt-1 ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>
                    {ref.reward_credited && (
                      <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        {referrerReward}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default ClientReferralPage;
