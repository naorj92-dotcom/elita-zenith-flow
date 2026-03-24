import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Sparkles, ArrowRight } from 'lucide-react';

export default function CheckoutRulesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [form, setForm] = useState({
    trigger_service_id: '',
    suggested_service_id: '',
    display_text: '',
    suggested_price: '',
    is_active: true,
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['checkout-rules-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkout_rules')
        .select('*, trigger_service:services!checkout_rules_trigger_service_id_fkey(name), suggested_service:services!checkout_rules_suggested_service_id_fkey(name, price)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services-for-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        trigger_service_id: data.trigger_service_id,
        suggested_service_id: data.suggested_service_id,
        display_text: data.display_text,
        suggested_price: data.suggested_price ? Number(data.suggested_price) : null,
        is_active: data.is_active,
      };
      if (data.id) {
        const { error } = await supabase.from('checkout_rules').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('checkout_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout-rules-admin'] });
      toast.success(editingRule ? 'Rule updated' : 'Rule created');
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checkout_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout-rules-admin'] });
      toast.success('Rule deleted');
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRule(null);
    setForm({ trigger_service_id: '', suggested_service_id: '', display_text: '', suggested_price: '', is_active: true });
  };

  const openEdit = (rule: any) => {
    setEditingRule(rule);
    setForm({
      trigger_service_id: rule.trigger_service_id,
      suggested_service_id: rule.suggested_service_id,
      display_text: rule.display_text || '',
      suggested_price: rule.suggested_price ? String(rule.suggested_price) : '',
      is_active: rule.is_active,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checkout Rules</h1>
          <p className="text-muted-foreground">Configure "Pair With" service suggestions at checkout</p>
        </div>
        <Button onClick={() => { setEditingRule(null); setForm({ trigger_service_id: '', suggested_service_id: '', display_text: '', suggested_price: '', is_active: true }); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pair With Rules
          </CardTitle>
          <CardDescription>When a trigger service is added to the cart, the suggested service appears as a recommendation</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : rules.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No rules configured yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trigger Service</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Suggested Service</TableHead>
                  <TableHead>Display Text</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule: any) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{(rule.trigger_service as any)?.name}</TableCell>
                    <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell>{(rule.suggested_service as any)?.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{rule.display_text || '—'}</TableCell>
                    <TableCell>{rule.suggested_price ? `$${Number(rule.suggested_price).toFixed(2)}` : `$${Number((rule.suggested_service as any)?.price || 0).toFixed(2)}`}</TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(rule.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>When this service is in cart (trigger)</Label>
              <Select value={form.trigger_service_id} onValueChange={(v) => setForm({ ...form, trigger_service_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select trigger service" /></SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — ${Number(s.price).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Suggest this service</Label>
              <Select value={form.suggested_service_id} onValueChange={(v) => setForm({ ...form, suggested_service_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select suggested service" /></SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — ${Number(s.price).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Display Text</Label>
              <Input
                value={form.display_text}
                onChange={(e) => setForm({ ...form, display_text: e.target.value })}
                placeholder='e.g. "Add lip filler for a complete look?"'
              />
            </div>
            <div className="space-y-2">
              <Label>Override Price (optional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.suggested_price}
                onChange={(e) => setForm({ ...form, suggested_price: e.target.value })}
                placeholder="Leave empty to use service price"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate({ ...(editingRule ? { id: editingRule.id } : {}), ...form })}
              disabled={!form.trigger_service_id || !form.suggested_service_id}
            >
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
