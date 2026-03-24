import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, AlertTriangle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

const CATEGORIES = ['Toxin', 'Filler', 'Skincare', 'Device Consumable', 'Retail', 'Other'];
const UNIT_TYPES = ['units', 'mL', 'syringes', 'bottles', 'vials'];

interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  unit_type: string;
  reorder_threshold: number;
  notes: string | null;
  is_active: boolean;
}

interface InventoryBatch {
  id: string;
  product_id: string;
  lot_number: string;
  expiration_date: string;
  quantity_received: number;
  quantity_remaining: number;
  cost_per_unit: number | null;
  date_received: string;
  is_active: boolean;
}

export function InventoryManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('stock');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'expiry'>('name');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Product form state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', category: 'Other', unit_type: 'units', reorder_threshold: 5, notes: '' });

  // Batch form state
  const [showAddBatch, setShowAddBatch] = useState<string | null>(null);
  const [batchForm, setBatchForm] = useState({ lot_number: '', expiration_date: '', quantity_received: 0, cost_per_unit: '', date_received: format(new Date(), 'yyyy-MM-dd') });

  const { data: products = [] } = useQuery({
    queryKey: ['inventory-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_products').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data as InventoryProduct[];
    },
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['inventory-batches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_batches').select('*').eq('is_active', true).order('expiration_date', { ascending: true });
      if (error) throw error;
      return data as InventoryBatch[];
    },
  });

  const { data: deductions = [] } = useQuery({
    queryKey: ['inventory-deductions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_deductions').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const addProductMutation = useMutation({
    mutationFn: async (form: typeof productForm) => {
      const { error } = await supabase.from('inventory_products').insert({
        name: form.name,
        category: form.category,
        unit_type: form.unit_type,
        reorder_threshold: form.reorder_threshold,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      setShowAddProduct(false);
      setProductForm({ name: '', category: 'Other', unit_type: 'units', reorder_threshold: 5, notes: '' });
      toast.success('Product added');
    },
    onError: () => toast.error('Failed to add product'),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_products').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      toast.success('Product removed');
    },
  });

  const addBatchMutation = useMutation({
    mutationFn: async ({ productId, form }: { productId: string; form: typeof batchForm }) => {
      const { error } = await supabase.from('inventory_batches').insert({
        product_id: productId,
        lot_number: form.lot_number,
        expiration_date: form.expiration_date,
        quantity_received: form.quantity_received,
        quantity_remaining: form.quantity_received,
        cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null,
        date_received: form.date_received,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      setShowAddBatch(null);
      setBatchForm({ lot_number: '', expiration_date: '', quantity_received: 0, cost_per_unit: '', date_received: format(new Date(), 'yyyy-MM-dd') });
      toast.success('Batch added');
    },
    onError: () => toast.error('Failed to add batch'),
  });

  // Compute stock data per product
  const stockData = products.map(p => {
    const productBatches = batches.filter(b => b.product_id === p.id);
    const totalStock = productBatches.reduce((s, b) => s + b.quantity_remaining, 0);
    const earliestExpiry = productBatches.length > 0
      ? productBatches.reduce((min, b) => b.expiration_date < min ? b.expiration_date : min, productBatches[0].expiration_date)
      : null;
    const expiringIn30 = earliestExpiry ? differenceInDays(new Date(earliestExpiry), new Date()) <= 30 : false;

    let status: 'red' | 'yellow' | 'green' = 'green';
    if (totalStock <= p.reorder_threshold) status = 'red';
    else if (totalStock <= p.reorder_threshold * 1.2) status = 'yellow';

    return { ...p, totalStock, earliestExpiry, expiringIn30, status, batches: productBatches };
  });

  const filtered = stockData
    .filter(p => categoryFilter === 'all' || p.category === categoryFilter)
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock') return a.totalStock - b.totalStock;
      if (sortBy === 'expiry') return (a.earliestExpiry || '9999') < (b.earliestExpiry || '9999') ? -1 : 1;
      return 0;
    });

  const statusDot = (s: 'red' | 'yellow' | 'green') => (
    <span className={cn('inline-block w-2.5 h-2.5 rounded-full', {
      'bg-red-500': s === 'red',
      'bg-amber-500': s === 'yellow',
      'bg-emerald-500': s === 'green',
    })} />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage clinical products, stock batches, and usage</p>
        </div>
        <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Product Name</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Botox 100U" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={productForm.category} onValueChange={v => setProductForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit Type</Label>
                  <Select value={productForm.unit_type} onValueChange={v => setProductForm(f => ({ ...f, unit_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIT_TYPES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reorder Threshold</Label><Input type="number" value={productForm.reorder_threshold} onChange={e => setProductForm(f => ({ ...f, reorder_threshold: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Notes (optional)</Label><Textarea value={productForm.notes} onChange={e => setProductForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              <Button className="w-full" onClick={() => addProductMutation.mutate(productForm)} disabled={!productForm.name || addProductMutation.isPending}>
                {addProductMutation.isPending ? 'Adding...' : 'Add Product'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stock">Current Stock</TabsTrigger>
          <TabsTrigger value="log">Usage Log</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="stock">Sort by Stock</SelectItem>
                <SelectItem value="expiry">Sort by Expiry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{products.length}</p>
              <p className="text-xs text-muted-foreground">Products</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stockData.filter(s => s.status === 'red').length}</p>
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stockData.filter(s => s.expiringIn30).length}</p>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
            </CardContent></Card>
          </div>

          {/* Stock table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead>Earliest Expiry</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
                  )}
                  {filtered.map(item => (
                    <React.Fragment key={item.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedProduct(expandedProduct === item.id ? null : item.id)}
                      >
                        <TableCell>{statusDot(item.status)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.unit_type}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {item.totalStock}
                          {item.status === 'red' && <AlertTriangle className="inline h-3 w-3 ml-1 text-red-500" />}
                        </TableCell>
                        <TableCell>
                          {item.earliestExpiry ? (
                            <span className={cn('text-sm', item.expiringIn30 && 'text-amber-600 font-medium')}>
                              {format(new Date(item.earliestExpiry), 'MMM d, yyyy')}
                              {item.expiringIn30 && ' ⚠'}
                            </span>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              {expandedProduct === item.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Expanded batch details */}
                      {expandedProduct === item.id && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">Batches for {item.name}</h4>
                                <div className="flex gap-2">
                                  <Dialog open={showAddBatch === item.id} onOpenChange={v => setShowAddBatch(v ? item.id : null)}>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" className="gap-1"><Plus className="h-3 w-3" />Add Batch</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader><DialogTitle>Add Batch — {item.name}</DialogTitle></DialogHeader>
                                      <div className="space-y-3">
                                        <div><Label>Lot Number</Label><Input value={batchForm.lot_number} onChange={e => setBatchForm(f => ({ ...f, lot_number: e.target.value }))} /></div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div><Label>Quantity Received</Label><Input type="number" value={batchForm.quantity_received} onChange={e => setBatchForm(f => ({ ...f, quantity_received: parseInt(e.target.value) || 0 }))} /></div>
                                          <div><Label>Cost per Unit ($)</Label><Input value={batchForm.cost_per_unit} onChange={e => setBatchForm(f => ({ ...f, cost_per_unit: e.target.value }))} placeholder="Optional" /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div><Label>Date Received</Label><Input type="date" value={batchForm.date_received} onChange={e => setBatchForm(f => ({ ...f, date_received: e.target.value }))} /></div>
                                          <div><Label>Expiration Date</Label><Input type="date" value={batchForm.expiration_date} onChange={e => setBatchForm(f => ({ ...f, expiration_date: e.target.value }))} /></div>
                                        </div>
                                        <Button className="w-full" onClick={() => addBatchMutation.mutate({ productId: item.id, form: batchForm })} disabled={!batchForm.lot_number || !batchForm.expiration_date || batchForm.quantity_received <= 0}>
                                          Add Batch
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Remove this product?')) deleteProductMutation.mutate(item.id); }}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {item.batches.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No batches yet. Add one to start tracking stock.</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Lot #</TableHead>
                                      <TableHead>Received</TableHead>
                                      <TableHead>Expires</TableHead>
                                      <TableHead className="text-right">Qty Left</TableHead>
                                      <TableHead className="text-right">Cost/Unit</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {item.batches.map(b => (
                                      <TableRow key={b.id}>
                                        <TableCell className="font-mono text-xs">{b.lot_number}</TableCell>
                                        <TableCell className="text-sm">{format(new Date(b.date_received), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className={cn('text-sm', differenceInDays(new Date(b.expiration_date), new Date()) <= 30 && 'text-amber-600 font-medium')}>
                                          {format(new Date(b.expiration_date), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{b.quantity_remaining}/{b.quantity_received}</TableCell>
                                        <TableCell className="text-right text-sm">{b.cost_per_unit ? `$${b.cost_per_unit}` : '—'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Usage Log</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Lot #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No usage recorded yet</TableCell></TableRow>
                  )}
                  {deductions.map(d => {
                    const product = products.find(p => p.id === d.product_id);
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{format(new Date(d.created_at), 'MMM d, h:mm a')}</TableCell>
                        <TableCell className="font-medium text-sm">{product?.name || 'Unknown'}</TableCell>
                        <TableCell className="font-mono text-xs">{d.lot_number || '—'}</TableCell>
                        <TableCell className="text-sm">{d.client_name || '—'}</TableCell>
                        <TableCell className="text-sm">{d.provider_name || '—'}</TableCell>
                        <TableCell className="text-right font-mono">{d.amount_deducted}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
