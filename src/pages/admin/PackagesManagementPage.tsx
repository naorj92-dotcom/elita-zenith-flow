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
import { Plus, Package, Edit2, DollarSign, Hash, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ClientPackagesTable } from '@/components/admin/ClientPackagesTable';

interface PackageFormData {
  name: string;
  description: string;
  price: number;
  total_sessions: number;
  is_active: boolean;
}

export function PackagesManagementPage() {
  const { staff } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    price: 0,
    total_sessions: 1,
    is_active: true,
  });

  // Redirect non-admin users
  if (staff?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch packages
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

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      if (editingPackage) {
        const { error } = await supabase
          .from('packages')
          .update({
            name: data.name,
            description: data.description,
            price: data.price,
            total_sessions: data.total_sessions,
            is_active: data.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPackage.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('packages')
          .insert({
            name: data.name,
            description: data.description,
            price: data.price,
            total_sessions: data.total_sessions,
            is_active: data.is_active,
            services: [],
          });
        
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
      price: 0,
      total_sessions: 1,
      is_active: true,
    });
    setEditingPackage(null);
    setDialogOpen(false);
  };

  const handleEdit = (pkg: any) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price,
      total_sessions: pkg.total_sessions,
      is_active: pkg.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Packages</h1>
          <p className="text-muted-foreground mt-1">
            Manage service packages and bundles
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? 'Edit Package' : 'Create Package'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Laser Hair Removal - 6 Pack"
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
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessions">Total Sessions</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="sessions"
                      type="number"
                      min="1"
                      value={formData.total_sessions}
                      onChange={(e) => setFormData({ ...formData, total_sessions: parseInt(e.target.value) || 1 })}
                      className="pl-9"
                      required
                    />
                  </div>
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
                <p className="text-sm text-muted-foreground">Total Value (Active)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading packages...</div>
          ) : packages?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No packages found. Create your first package to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Per Session</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages?.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{pkg.name}</p>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {pkg.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(pkg.price)}
                    </TableCell>
                    <TableCell>{pkg.total_sessions}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(pkg.price / pkg.total_sessions)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(pkg.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(pkg)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PackagesManagementPage;
