import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

interface PricingTier {
  sessions: number;
  total_price: number;
  price_per_session: number;
  value_percent: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClientPackage?: any;
}

export function AssignClientPackageDialog({ open, onOpenChange, editingClientPackage }: Props) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState(editingClientPackage?.client_id || '');
  const [packageId, setPackageId] = useState(editingClientPackage?.package_id || '');
  const [selectedTierIdx, setSelectedTierIdx] = useState('0');
  const [sessionsUsed, setSessionsUsed] = useState(editingClientPackage?.sessions_used || 0);
  const [sessionsTotal, setSessionsTotal] = useState(editingClientPackage?.sessions_total || 0);
  const [status, setStatus] = useState(editingClientPackage?.status || 'active');
  const [expiryDays, setExpiryDays] = useState(180);
  const [notes, setNotes] = useState(editingClientPackage?.notes || '');

  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .order('first_name');
      return data || [];
    },
  });

  const { data: packages } = useQuery({
    queryKey: ['packages-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const selectedPackage = packages?.find(p => p.id === packageId);
  const tiers: PricingTier[] = selectedPackage?.pricing_tiers && Array.isArray(selectedPackage.pricing_tiers) && selectedPackage.pricing_tiers.length > 0
    ? selectedPackage.pricing_tiers
    : selectedPackage
      ? [{ sessions: selectedPackage.total_sessions, total_price: selectedPackage.price, price_per_session: selectedPackage.price / selectedPackage.total_sessions, value_percent: 0 }]
      : [];
  const selectedTier = tiers[parseInt(selectedTierIdx)] || tiers[0];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingClientPackage) {
        const { error } = await supabase
          .from('client_packages')
          .update({
            sessions_used: sessionsUsed,
            sessions_total: sessionsTotal,
            status,
            notes: notes || null,
          })
          .eq('id', editingClientPackage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_packages')
          .insert({
            client_id: clientId,
            package_id: packageId,
            sessions_total: selectedTier?.sessions || 1,
            sessions_used: 0,
            status: 'active',
            expiry_date: addDays(new Date(), expiryDays).toISOString(),
            notes: notes ? `${notes} | Tier: ${selectedTier?.sessions} sessions @ ${formatCurrency(selectedTier?.total_price || 0)}` : `Tier: ${selectedTier?.sessions} sessions @ ${formatCurrency(selectedTier?.total_price || 0)}`,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-packages-admin'] });
      queryClient.invalidateQueries({ queryKey: ['client-packages'] });
      toast.success(editingClientPackage ? 'Package updated' : 'Package assigned to client');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to save: ' + (error as Error).message);
    },
  });

  const handlePackageSelect = (id: string) => {
    setPackageId(id);
    setSelectedTierIdx('0');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingClientPackage ? 'Edit Client Package' : 'Assign Package to Client'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          {!editingClientPackage && (
            <>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} {c.email ? `(${c.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={packageId} onValueChange={handlePackageSelect} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tier Selection */}
              {tiers.length > 0 && (
                <div className="space-y-2">
                  <Label>Program Tier</Label>
                  <Select value={selectedTierIdx} onValueChange={setSelectedTierIdx}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.map((tier, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {tier.sessions} session{tier.sessions !== 1 ? 's' : ''} — {formatCurrency(tier.total_price)} ({formatCurrency(tier.price_per_session)}/session)
                          {tier.value_percent > 0 ? ` • ${tier.value_percent}% value` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTier && (
                    <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sessions:</span>
                        <span className="font-medium">{selectedTier.sessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-medium">{formatCurrency(selectedTier.total_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Per Session:</span>
                        <span className="font-medium">{formatCurrency(selectedTier.price_per_session)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Expiry (days from today)</Label>
                <Input
                  type="number"
                  min={30}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value) || 180)}
                />
              </div>
            </>
          )}

          {editingClientPackage && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sessions Used</Label>
                  <Input
                    type="number"
                    min={0}
                    max={sessionsTotal}
                    value={sessionsUsed}
                    onChange={(e) => setSessionsUsed(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Sessions</Label>
                  <Input
                    type="number"
                    min={1}
                    value={sessionsTotal}
                    onChange={(e) => setSessionsTotal(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editingClientPackage ? 'Update' : 'Assign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
