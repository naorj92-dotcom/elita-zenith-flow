import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Gift, Copy, Check, Cake } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function BirthdayGiftBanner() {
  const { client } = useClientAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: gift } = useQuery({
    queryKey: ['client-birthday-gift', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data } = await supabase
        .from('birthday_gifts')
        .select('*')
        .eq('client_id', client.id)
        .eq('redeemed', false)
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!client?.id,
  });

  if (!gift) return null;

  const giftDescription = gift.gift_type === 'discount'
    ? `${gift.discount_percent}% off your next visit`
    : gift.gift_type === 'free_addon'
    ? 'A complimentary add-on service'
    : 'A special birthday treat';

  const handleCopy = () => {
    navigator.clipboard.writeText(gift.code);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="w-full rounded-xl bg-gradient-to-r from-warning/20 via-warning/10 to-warning/20 border border-warning/30 p-4 flex items-center gap-3 hover:border-warning/50 transition-all group"
      >
        <span className="text-2xl">🎂</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">
            Happy Birthday, {client?.first_name}! Your gift is waiting →
          </p>
        </div>
        <Gift className="h-5 w-5 text-warning group-hover:scale-110 transition-transform" />
      </button>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-2">
              <div className="h-14 w-14 rounded-full bg-warning/10 flex items-center justify-center">
                <Cake className="h-7 w-7 text-warning" />
              </div>
              Happy Birthday! 🎉
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{giftDescription}</p>

            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Your code</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-mono font-bold text-foreground tracking-wider">{gift.code}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Expires {format(new Date(gift.expiry_date), 'MMMM d, yyyy')}
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={() => { setModalOpen(false); navigate('/portal/book'); }}>
              Book & Apply
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
