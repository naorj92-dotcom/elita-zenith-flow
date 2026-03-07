import React, { useState } from 'react'; // Deals admin
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DealForm {
  title: string;
  description: string;
  service_id: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  original_price: number | null;
  deal_price: number | null;
  starts_at: string;
  expires_at: string;
  max_claims: number | null;
  is_active: boolean;
}

const emptyForm: DealForm = {
  title: '',
  description: '',
  service_id: null,
  discount_percent: null,
  discount_amount: null,
  original_price: null,
  deal_price: null,
  starts_at: new Date().toISOString().slice(0, 16),
  expires_at: '',
  max_claims: null,
  is_active: true,
};

export function DealsManagementPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm>(emptyForm);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['admin-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exclusive_deals')
        .select('*, services(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services-list'],
    queryFn: async () => {
      const { data } = await supabase.from('services').select('id, name').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (deal: DealForm & { id?: string }) => {
      const payload = {
        ...deal,
        starts_at: new Date(deal.starts_at).toISOString(),
        expires_at: new Date(deal.expires_at).toISOString(),
      };
      if (deal.id) {
        const { error } = await supabase.from('exclusive_deals').update(payload).eq('id', deal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('exclusive_deals').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      toast.success(editId ? 'Deal updated' : 'Deal created');
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exclusive_deals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      toast.success('Deal deleted');
    },
  });

  function resetForm() {
    setForm(emptyForm);
    setEditId(null);
  }

  function openEdit(deal: any) {
    setEditId(deal.id);
    setForm({
      title: deal.title,
      description: deal.description || '',
      service_id: deal.service_id,
      discount_percent: deal.discount_percent,
      discount_amount: deal.discount_amount,
      original_price: deal.original_price,
      deal_price: deal.deal_price,
      starts_at: deal.starts_at?.slice(0, 16) || '',
      expires_at: deal.expires_at?.slice(0, 16) || '',
      max_claims: deal.max_claims,
      is_active: deal.is_active,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Exclusive Deals
          </h1>
          <p className="text-muted-foreground">Manage app-only flash sales and promotions</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Deal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Deal' : 'Create Deal'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="20% Off Hydrafacial" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Limited time offer..." />
              </div>
              <div>
                <Label>Linked Service (optional)</Label>
                <Select value={form.service_id || 'none'} onValueChange={v => setForm(f => ({ ...f, service_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Original Price</Label>
                  <Input type="number" value={form.original_price ?? ''} onChange={e => setForm(f => ({ ...f, original_price: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <Label>Deal Price</Label>
                  <Input type="number" value={form.deal_price ?? ''} onChange={e => setForm(f => ({ ...f, deal_price: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount %</Label>
                  <Input type="number" value={form.discount_percent ?? ''} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <Label>Max Claims</Label>
                  <Input type="number" value={form.max_claims ?? ''} onChange={e => setForm(f => ({ ...f, max_claims: e.target.value ? Number(e.target.value) : null }))} placeholder="Unlimited" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Starts At</Label>
                  <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
                </div>
                <div>
                  <Label>Expires At</Label>
                  <Input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
              <Button
                className="w-full"
                disabled={!form.title || !form.expires_at}
                onClick={() => saveMutation.mutate({ ...form, ...(editId ? { id: editId } : {}) })}
              >
                {editId ? 'Update Deal' : 'Create Deal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : deals.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No deals yet</TableCell></TableRow>
              ) : deals.map((deal: any) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">{deal.title}</TableCell>
                  <TableCell>{deal.services?.name || '—'}</TableCell>
                  <TableCell>
                    {deal.deal_price != null ? `$${deal.deal_price}` : deal.discount_percent ? `${deal.discount_percent}% off` : '—'}
                  </TableCell>
                  <TableCell>{format(new Date(deal.expires_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{deal.claims_count}{deal.max_claims ? `/${deal.max_claims}` : ''}</TableCell>
                  <TableCell>
                    <Badge variant={deal.is_active ? 'default' : 'secondary'}>
                      {deal.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(deal)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(deal.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
