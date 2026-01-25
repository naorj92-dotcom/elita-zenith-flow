import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Gift, Search, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { giftCardSchema } from '@/lib/validations';

interface GiftCardFormData {
  initial_amount: number;
  purchaser_name: string;
  purchaser_email: string;
  recipient_name: string;
  recipient_email: string;
  message: string;
}

const initialFormData: GiftCardFormData = {
  initial_amount: 100,
  purchaser_name: '',
  purchaser_email: '',
  recipient_name: '',
  recipient_email: '',
  message: '',
};

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ELITA-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function GiftCardsManagementPage() {
  const { staff } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<GiftCardFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (staff?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: giftCards, isLoading } = useQuery({
    queryKey: ['gift-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GiftCardFormData) => {
      // Validate input before database operation
      const result = giftCardSchema.safeParse(data);
      if (!result.success) {
        throw new Error(result.error.errors[0]?.message || 'Validation failed');
      }
      
      const code = generateGiftCardCode();
      const { error } = await supabase.from('gift_cards').insert({
        code,
        initial_amount: result.data.initial_amount,
        remaining_amount: result.data.initial_amount,
        purchaser_name: result.data.purchaser_name || null,
        purchaser_email: result.data.purchaser_email || null,
        recipient_name: result.data.recipient_name || null,
        recipient_email: result.data.recipient_email || null,
        message: result.data.message || null,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      });
      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      toast.success(`Gift card created: ${code}`);
      resetForm();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create gift card'),
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCards = giftCards?.filter(card => 
    card.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.purchaser_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = giftCards?.reduce((sum, card) => sum + card.remaining_amount, 0) || 0;
  const activeCards = giftCards?.filter(card => card.is_active && card.remaining_amount > 0).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Gift Cards</h1>
          <p className="text-muted-foreground mt-1">Issue and manage gift cards</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormData)}>
              <Plus className="mr-2 h-4 w-4" />
              Issue Gift Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Issue New Gift Card</DialogTitle>
              <DialogDescription>Create a gift card for purchase</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <div className="flex gap-2">
                  {[50, 100, 150, 200, 250, 500].map(amount => (
                    <Button
                      key={amount}
                      type="button"
                      variant={formData.initial_amount === amount ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, initial_amount: amount }))}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
                <Input
                  id="amount"
                  type="number"
                  min="10"
                  value={formData.initial_amount}
                  onChange={e => setFormData(prev => ({ ...prev, initial_amount: parseFloat(e.target.value) || 0 }))}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaser_name">Purchaser Name</Label>
                  <Input
                    id="purchaser_name"
                    value={formData.purchaser_name}
                    onChange={e => setFormData(prev => ({ ...prev, purchaser_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaser_email">Purchaser Email</Label>
                  <Input
                    id="purchaser_email"
                    type="email"
                    value={formData.purchaser_email}
                    onChange={e => setFormData(prev => ({ ...prev, purchaser_email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient_name">Recipient Name</Label>
                  <Input
                    id="recipient_name"
                    value={formData.recipient_name}
                    onChange={e => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient_email">Recipient Email</Label>
                  <Input
                    id="recipient_email"
                    type="email"
                    value={formData.recipient_email}
                    onChange={e => setFormData(prev => ({ ...prev, recipient_email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Personal Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Add a personal message for the recipient"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">Issue Gift Card</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-luxury">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-heading font-semibold">{giftCards?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Cards Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-luxury">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <Gift className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-heading font-semibold">{activeCards}</p>
                <p className="text-sm text-muted-foreground">Active Cards</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-luxury">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-elita-gold/10 flex items-center justify-center">
                <Gift className="h-6 w-6 text-elita-gold" />
              </div>
              <div>
                <p className="text-2xl font-heading font-semibold">${totalValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by code, recipient, or purchaser..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="card-luxury">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Purchaser</TableHead>
              <TableHead className="text-right">Original</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCards?.map(card => (
              <TableRow key={card.id}>
                <TableCell className="font-mono">
                  <div className="flex items-center gap-2">
                    <span>{card.code}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyCode(card.code)}
                    >
                      {copiedCode === card.code ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {card.recipient_name || '—'}
                  {card.recipient_email && (
                    <p className="text-xs text-muted-foreground">{card.recipient_email}</p>
                  )}
                </TableCell>
                <TableCell>
                  {card.purchaser_name || '—'}
                </TableCell>
                <TableCell className="text-right">${card.initial_amount}</TableCell>
                <TableCell className="text-right font-semibold">${card.remaining_amount}</TableCell>
                <TableCell>
                  <Badge variant={card.remaining_amount > 0 && card.is_active ? 'default' : 'secondary'}>
                    {!card.is_active ? 'Inactive' : card.remaining_amount === 0 ? 'Redeemed' : 'Active'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(card.created_at), 'MMM d, yyyy')}
                </TableCell>
              </TableRow>
            ))}
            {filteredCards?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No gift cards found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading gift cards...</div>
      )}
    </div>
  );
}
