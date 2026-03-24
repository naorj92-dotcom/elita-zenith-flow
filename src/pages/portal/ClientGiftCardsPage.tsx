import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Gift, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';

const PRESET_AMOUNTS = [50, 100, 150, 200];

export function ClientGiftCardsPage() {
  const { client } = useClientAuth();
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const amount = isCustom ? (parseFloat(customAmount) || 0) : selectedAmount;

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!client?.id) throw new Error('Not logged in');
      if (amount < 10) throw new Error('Minimum amount is $10');
      // Submit as a purchase request (Stripe integration pending)
      const { error } = await supabase.from('purchase_requests' as any).insert({
        client_id: client.id,
        request_type: 'gift_card',
        tier_total_price: amount,
        notes: `GIFT CARD: $${amount} for ${recipientName || 'unspecified recipient'}${recipientEmail ? ` (${recipientEmail})` : ''}${message ? ` — "${message}"` : ''}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Gift card purchase request submitted!');
    },
    onError: (e: any) => toast.error(e.message || 'Could not submit request'),
  });

  if (submitted) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-semibold">Gift Cards</h1>
        <Card className="card-luxury">
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-heading font-semibold">Request Submitted!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your ${amount} Elita gift card request has been received. Our team will process it and send the gift card code to {recipientEmail || 'the recipient'} shortly.
            </p>
            <Button variant="outline" onClick={() => { setSubmitted(false); setRecipientName(''); setRecipientEmail(''); setMessage(''); }}>
              Buy Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Gift Cards</h1>
        <p className="text-muted-foreground mt-1">Give the gift of beauty and self-care</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gift Card Preview */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 p-8 text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium tracking-wider uppercase">Elita MedSpa</span>
            </div>
            <div className="bg-white/60 dark:bg-white/10 backdrop-blur rounded-2xl p-8 mx-auto max-w-xs shadow-lg border border-amber-200/50 dark:border-amber-700/30">
              <Gift className="h-10 w-10 mx-auto mb-3 text-amber-600 dark:text-amber-400" />
              <p className="text-3xl font-heading font-bold text-amber-800 dark:text-amber-300">${amount}</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-2 uppercase tracking-widest">Gift Card</p>
              <div className="mt-4 pt-4 border-t border-amber-200/40 dark:border-amber-700/30">
                <p className="text-[11px] text-amber-600/60 dark:text-amber-400/60">Never expires</p>
              </div>
            </div>
            {recipientName && (
              <p className="text-sm text-amber-700/80 dark:text-amber-400/80 italic">For {recipientName}</p>
            )}
          </div>
        </Card>

        {/* Purchase Form */}
        <Card className="card-luxury">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Purchase Gift Card
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Amount Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Amount</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map(amt => (
                  <Button
                    key={amt}
                    variant={!isCustom && selectedAmount === amt ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setSelectedAmount(amt); setIsCustom(false); }}
                  >
                    ${amt}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={isCustom ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsCustom(true)}
                >
                  Custom
                </Button>
                {isCustom && (
                  <Input
                    type="number"
                    min="10"
                    max="1000"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    className="w-32"
                  />
                )}
              </div>
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="Who is this gift for?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="We'll send the gift card code here"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Add a heartfelt note..."
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              disabled={amount < 10 || purchaseMutation.isPending}
              onClick={() => purchaseMutation.mutate()}
            >
              {purchaseMutation.isPending ? 'Submitting...' : `Purchase $${amount} Gift Card`}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Payment will be processed by our team. Gift card codes never expire.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
