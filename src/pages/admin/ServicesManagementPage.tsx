import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Clock, DollarSign, Loader2, Sparkles, Search, Cpu } from 'lucide-react';

interface Machine {
  id: string;
  name: string;
  machine_type: string;
  quantity: number;
  status: 'active' | 'maintenance';
}

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  requires_consent: boolean;
  machine_type_id: string | null;
  recovery_buffer_minutes: number;
}

const initialFormData: ServiceFormData = {
  name: '',
  description: '',
  category: 'Facial',
  duration_minutes: 60,
  price: 0,
  is_active: true,
  requires_consent: false,
  machine_type_id: null,
  recovery_buffer_minutes: 0,
};

const categories = [
  'Facials',
  'Body Treatments',
  'Skin Rejuvenation',
  'Chemical Peel',
  'LED Therapy',
  'Massage & Wellness',
  'Lash & Brow',
  'Waxing',
  'Consultation',
  'Other',
];

export function ServicesManagementPage() {
  const { staff: currentStaff } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Only admins can access this page
  if (currentStaff?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className="card-luxury">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators can manage services.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: services, isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: machines } = useQuery({
    queryKey: ['admin-machines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('status', 'active')
        .order('machine_type', { ascending: true });
      if (error) throw error;
      return data as Machine[];
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const { error } = await supabase.from('services').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Service created successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create service', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceFormData> }) => {
      const { error } = await supabase.from('services').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Service updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update service', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingService(null);
  };

  const openEditDialog = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category,
      duration_minutes: service.duration_minutes,
      price: service.price,
      is_active: service.is_active,
      requires_consent: service.requires_consent,
      machine_type_id: service.machine_type_id || null,
      recovery_buffer_minutes: service.recovery_buffer_minutes || 0,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.machine_type_id) {
      toast({ title: 'Please select a machine type', variant: 'destructive' });
      return;
    }
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createServiceMutation.mutate(formData);
    }
  };

  const getMachineName = (machineId: string | null) => {
    if (!machineId) return null;
    const machine = machines?.find(m => m.id === machineId);
    return machine ? `${machine.name} (${machine.machine_type})` : null;
  };

  const filteredServices = services?.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = [...new Set(services?.map(s => s.category) || [])];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Facials': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      'Body Treatments': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'Skin Rejuvenation': 'bg-green-500/10 text-green-500 border-green-500/20',
      'Chemical Peel': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'LED Therapy': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'Massage & Wellness': 'bg-teal-500/10 text-teal-500 border-teal-500/20',
      'Lash & Brow': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      'Waxing': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'Consultation': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    return colors[category] || 'bg-primary/10 text-primary border-primary/20';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Services Management</h1>
          <p className="text-muted-foreground mt-1">Manage treatments, pricing, and categories</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </DialogTitle>
              <DialogDescription>
                {editingService ? 'Update service details' : 'Enter the details for the new service'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Hydrafacial Deluxe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the service..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    step="5"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="machine_type">Associated Machine Type *</Label>
                <Select
                  value={formData.machine_type_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, machine_type_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select machine type" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines?.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4" />
                          {machine.name} ({machine.machine_type})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recovery_buffer">Recovery Buffer (min)</Label>
                  <Input
                    id="recovery_buffer"
                    type="number"
                    min="0"
                    step="5"
                    value={formData.recovery_buffer_minutes}
                    onChange={(e) => setFormData({ ...formData, recovery_buffer_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Requires Consent Form</Label>
                  <p className="text-sm text-muted-foreground">
                    Client must sign consent before treatment
                  </p>
                </div>
                <Switch
                  checked={formData.requires_consent}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_consent: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t pt-4">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive services won't appear for booking
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createServiceMutation.isPending || updateServiceMutation.isPending}>
                  {(createServiceMutation.isPending || updateServiceMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingService ? 'Update Service' : 'Create Service'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Services Table */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Services ({filteredServices?.length || 0})
          </CardTitle>
          <CardDescription>All available treatments and services</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredServices && filteredServices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Machine Type</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service.id} className={!service.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryColor(service.category)}>
                          {service.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getMachineName(service.machine_type_id) ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                            <Cpu className="h-3 w-3 mr-1" />
                            {getMachineName(service.machine_type_id)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{service.duration_minutes} min</span>
                          {service.recovery_buffer_minutes > 0 && (
                            <span className="text-xs">(+{service.recovery_buffer_minutes})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 font-semibold">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>{service.price.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {service.is_active ? (
                          <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(service)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No services found</p>
              <p className="text-sm mt-1">Add your first service to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
