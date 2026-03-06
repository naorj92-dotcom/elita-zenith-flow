import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Package, Edit2, DollarSign, Trash2, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ClientPackagesTable } from '@/components/admin/ClientPackagesTable';

export interface PricingTier {
  sessions: number;
  total_price: number;
  price_per_session: number;
  value_percent: number;
}

interface PackageFormData {
  name: string;
  description: string;
  is_active: boolean;
  pricing_tiers: PricingTier[];
}

const DEFAULT_TIERS: PricingTier[] = [
  { sessions: 1, total_price: 0, price_per_session: 0, value_percent: 0 },
  { sessions: 3, total_price: 0, price_per_session: 0, value_percent: 0 },
  { sessions: 6, total_price: 0, price_per_session: 0, value_percent: 0 },
  { sessions: 10, total_price: 0, price_per_session: 0, value_percent: 0 },
];

function recalcTiers(tiers: PricingTier[]): PricingTier[] {
  const singlePrice = tiers[0]?.total_price || 0;
  return tiers.map((t) => {
    const pps = t.sessions > 0 ? Math.round((t.total_price / t.sessions) * 100) / 100 : 0;
    const valuePct = singlePrice > 0 && t.sessions > 1
      ? Math.round(((singlePrice - pps) / singlePrice) * 100)
      : 0;
    return { ...t, price_per_session: pps, value_percent: Math.max(0, valuePct) };
  });
}

export function PackagesManagementPage() {
  const { staff } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    is_active: true,
    pricing_tiers: [...DEFAULT_TIERS],
  });

  if (staff?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('packages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Package deleted');
    },
    onError: () => toast.error('Failed to delete package'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      const tiers = recalcTiers(data.pricing_tiers);
      const singleTier = tiers[0];
      // price = single session price, total_sessions = 1 (base), tiers stored in pricing_tiers
      const payload = {
        name: data.name,
        description: data.description,
        is_active: data.is_active,
        price: singleTier?.total_price || 0,
        total_sessions: 1,
        pricing_tiers: JSON.stringify(tiers),
        services: [] as any[],
        updated_at: new Date().toISOString(),
      };

      if (editingPackage) {
        const { error } = await supabase
          .from('packages')
          .update(payload)
          .eq('id', editingPackage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('packages').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(editingPackage ? 'Package updated' : 'Package created');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to save package');
      console.error(error);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      pricing_tiers: [...DEFAULT_TIERS],
    });
    setEditingPackage(null);
    setDialogOpen(false);
  };

  const handleEdit = (pkg: any) => {
    setEditingPackage(pkg);
    const tiers: PricingTier[] = (pkg.pricing_tiers && Array.isArray(pkg.pricing_tiers) && pkg.pricing_tiers.length > 0)
      ? pkg.pricing_tiers
      : [
          { sessions: 1, total_price: pkg.price, price_per_session: pkg.price, value_percent: 0 },
          { sessions: 3, total_price: pkg.price * 3 * 0.8, price_per_session: 0, value_percent: 0 },
          { sessions: 6, total_price: pkg.price * 6 * 0.75, price_per_session: 0, value_percent: 0 },
          { sessions: 10, total_price: pkg.price * 10 * 0.7, price_per_session: 0, value_percent: 0 },
        ];
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      is_active: pkg.is_active,
      pricing_tiers: recalcTiers(tiers),
    });
    setDialogOpen(true);
  };

  const handleTierChange = (index: number, field: 'sessions' | 'total_price', value: number) => {
    const updated = [...formData.pricing_tiers];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, pricing_tiers: recalcTiers(updated) });
  };

  const addTier = () => {
    const lastSessions = formData.pricing_tiers[formData.pricing_tiers.length - 1]?.sessions || 1;
    const updated = [...formData.pricing_tiers, { sessions: lastSessions + 5, total_price: 0, price_per_session: 0, value_percent: 0 }];
    setFormData({ ...formData, pricing_tiers: updated });
  };

  const removeTier = (index: number) => {
    if (formData.pricing_tiers.length <= 1) return;
    const updated = formData.pricing_tiers.filter((_, i) => i !== index);
    setFormData({ ...formData, pricing_tiers: recalcTiers(updated) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getTiers = (pkg: any): PricingTier[] => {
    if (pkg.pricing_tiers && Array.isArray(pkg.pricing_tiers) && pkg.pricing_tiers.length > 0) {
      return pkg.pricing_tiers;
    }
    return [{ sessions: pkg.total_sessions, total_price: pkg.price, price_per_session: pkg.price / pkg.total_sessions, value_percent: 0 }];
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Packages</h1>
          <p className="text-muted-foreground mt-1">
            Manage service packages with tiered session pricing
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? 'Edit Package' : 'Create Package'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service / Package Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Cryo Sculpt (Small)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Package details..."
                  rows={2}
                />
              </div>

              {/* Pricing Tiers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-primary" />
                    Program Pricing Tiers
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTier}>
                    <Plus className="w-3 h-3 mr-1" /> Add Tier
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set the total price for each session count. Per-session price and value % are calculated automatically.
                </p>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Sessions</TableHead>
                        <TableHead>Total Price</TableHead>
                        <TableHead>Per Session</TableHead>
                        <TableHead className="w-[80px]">Value</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.pricing_tiers.map((tier, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={tier.sessions}
                              onChange={(e) => handleTierChange(idx, 'sessions', parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <Input
                                type="number"
                                step="1"
                                min={0}
                                value={tier.total_price}
                                onChange={(e) => handleTierChange(idx, 'total_price', parseFloat(e.target.value) || 0)}
                                className="pl-6 h-8"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-medium">
                            {formatCurrency(tier.price_per_session)}
                          </TableCell>
                          <TableCell>
                            {tier.value_percent > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                {tier.value_percent}%
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {formData.pricing_tiers.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => removeTier(idx)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{packages?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Packages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <Package className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {packages?.filter(p => p.is_active).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Active Packages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <DollarSign className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    packages?.reduce((sum, p) => sum + (p.is_active ? p.price : 0), 0) || 0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Base Price Total (Active)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Table — Grouped by Service */}
      <Card>
        <CardHeader>
          <CardTitle>All Packages — Program Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading packages...</div>
          ) : packages?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No packages found. Create your first package to get started.
            </div>
          ) : (() => {
            // Group packages by base name (e.g. "Cryo Sculpt" from "Cryo Sculpt (Small)")
            const grouped = (packages || []).reduce((acc: Record<string, any[]>, pkg: any) => {
              const match = pkg.name.match(/^(.+?)\s*\((.+)\)$/);
              const groupName = match ? match[1].trim() : pkg.name;
              if (!acc[groupName]) acc[groupName] = [];
              acc[groupName].push({ ...pkg, sizeName: match ? match[2].trim() : '' });
              return acc;
            }, {} as Record<string, any[]>);

            return (
              <div className="space-y-6">
                {Object.entries(grouped).map(([groupName, pkgs]) => (
                  <div key={groupName} className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-muted/50">
                      <p className="font-semibold text-foreground text-lg">{groupName}</p>
                      <p className="text-sm text-muted-foreground">
                        {(pkgs as any[]).length > 1
                          ? `${(pkgs as any[]).length} size variants: ${(pkgs as any[]).map((p: any) => p.sizeName).join(', ')}`
                          : (pkgs as any[])[0]?.description || ''}
                      </p>
                    </div>
                    {(pkgs as any[]).map((pkg: any) => {
                      const tiers = getTiers(pkg);
                      return (
                        <div key={pkg.id}>
                          <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-t">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {pkg.sizeName || pkg.name}
                              </span>
                              <Badge variant={pkg.is_active ? 'default' : 'secondary'} className="text-xs">
                                {pkg.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(pkg)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Package?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this package definition.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePackageMutation.mutate(pkg.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sessions</TableHead>
                                <TableHead>Total Price</TableHead>
                                <TableHead>Price / Session</TableHead>
                                <TableHead>Program Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tiers.map((tier, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{tier.sessions}</TableCell>
                                  <TableCell className="font-medium">{formatCurrency(tier.total_price)}</TableCell>
                                  <TableCell>{formatCurrency(tier.price_per_session)}</TableCell>
                                  <TableCell>
                                    {tier.value_percent > 0 ? (
                                      <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                                        {tier.value_percent}% Value
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Client Package Assignments */}
      <ClientPackagesTable />
    </div>
  );
}

export default PackagesManagementPage;
