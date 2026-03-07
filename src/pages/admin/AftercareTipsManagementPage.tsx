import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Heart } from 'lucide-react';
import { toast } from 'sonner';

interface TipForm {
  service_id: string | null;
  day_number: number;
  title: string;
  description: string;
  icon: string;
}

const emptyForm: TipForm = {
  service_id: null,
  day_number: 1,
  title: '',
  description: '',
  icon: 'info',
};

const iconOptions = ['info', 'sun', 'droplets', 'shield', 'heart', 'thermometer', 'eye', 'sparkles'];

export function AftercareTipsManagementPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TipForm>(emptyForm);
  const [filterService, setFilterService] = useState<string>('all');

  const { data: tips = [], isLoading } = useQuery({
    queryKey: ['admin-aftercare-tips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aftercare_tips')
        .select('*, services(name)')
        .order('day_number');
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
    mutationFn: async (tip: TipForm & { id?: string }) => {
      if (tip.id) {
        const { error } = await supabase.from('aftercare_tips').update(tip).eq('id', tip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('aftercare_tips').insert(tip);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-aftercare-tips'] });
      toast.success(editId ? 'Tip updated' : 'Tip created');
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('aftercare_tips').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-aftercare-tips'] });
      toast.success('Tip deleted');
    },
  });

  function resetForm() {
    setForm(emptyForm);
    setEditId(null);
  }

  function openEdit(tip: any) {
    setEditId(tip.id);
    setForm({
      service_id: tip.service_id,
      day_number: tip.day_number,
      title: tip.title,
      description: tip.description,
      icon: tip.icon || 'info',
    });
    setOpen(true);
  }

  const filtered = filterService === 'all' ? tips : tips.filter((t: any) => t.service_id === filterService);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            Aftercare Tips
          </h1>
          <p className="text-muted-foreground">Post-treatment care instructions shown to clients</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Tip</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Tip' : 'Create Tip'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Service</Label>
                <Select value={form.service_id || 'none'} onValueChange={v => setForm(f => ({ ...f, service_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General (all services)</SelectItem>
                    {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Day Number</Label>
                  <Input type="number" min={1} value={form.day_number} onChange={e => setForm(f => ({ ...f, day_number: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select value={form.icon} onValueChange={v => setForm(f => ({ ...f, icon: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Avoid Sun Exposure" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Stay out of direct sunlight for 24 hours..." />
              </div>
              <Button
                className="w-full"
                disabled={!form.title || !form.description}
                onClick={() => saveMutation.mutate({ ...form, ...(editId ? { id: editId } : {}) })}
              >
                {editId ? 'Update Tip' : 'Create Tip'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Filter by service:</Label>
        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No tips yet</TableCell></TableRow>
              ) : filtered.map((tip: any) => (
                <TableRow key={tip.id}>
                  <TableCell><Badge variant="outline">Day {tip.day_number}</Badge></TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tip.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{tip.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>{tip.services?.name || 'General'}</TableCell>
                  <TableCell>{tip.icon}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tip)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(tip.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
