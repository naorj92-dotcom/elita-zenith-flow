import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Search, Cpu, Wrench } from 'lucide-react';

interface Machine {
  id: string;
  name: string;
  machine_type: string;
  quantity: number;
  status: 'active' | 'maintenance';
  created_at: string;
  updated_at: string;
}

interface MachineFormData {
  name: string;
  machine_type: string;
  quantity: number;
  status: 'active' | 'maintenance';
}

const initialFormData: MachineFormData = {
  name: '',
  machine_type: '',
  quantity: 1,
  status: 'active',
};

const machineTypes = [
  'RF Contouring',
  'Hydra-Facial',
  'LED Therapy',
  'Microdermabrasion',
  'Body Contouring',
  'Laser',
  'Ultrasound',
  'Cryotherapy',
  'IPL',
  'EMS',
  'Other',
];

export function MachinesManagementPage() {
  const { staff: currentStaff } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState<MachineFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  if (currentStaff?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className="card-luxury">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators can manage machines.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: machines, isLoading } = useQuery({
    queryKey: ['admin-machines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('machine_type', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Machine[];
    },
  });

  const createMachineMutation = useMutation({
    mutationFn: async (data: MachineFormData) => {
      const { error } = await supabase.from('machines').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Machine added successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to add machine', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateMachineMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MachineFormData> }) => {
      const { error } = await supabase.from('machines').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Machine updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update machine', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteMachineMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('machines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Machine deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-machines'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete machine', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingMachine(null);
  };

  const openEditDialog = (machine: Machine) => {
    setEditingMachine(machine);
    setFormData({
      name: machine.name,
      machine_type: machine.machine_type,
      quantity: machine.quantity,
      status: machine.status,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.machine_type) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (editingMachine) {
      updateMachineMutation.mutate({ id: editingMachine.id, data: formData });
    } else {
      createMachineMutation.mutate(formData);
    }
  };

  const filteredMachines = machines?.filter(machine => {
    const matchesSearch = machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         machine.machine_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || machine.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalUnits = machines?.reduce((sum, m) => sum + m.quantity, 0) || 0;
  const activeUnits = machines?.filter(m => m.status === 'active').reduce((sum, m) => sum + m.quantity, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Machines Management</h1>
          <p className="text-muted-foreground mt-1">Manage treatment machines and equipment</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Machine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingMachine ? 'Edit Machine' : 'Add New Machine'}
              </DialogTitle>
              <DialogDescription>
                {editingMachine ? 'Update machine details' : 'Enter the details for the new machine'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Machine Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., RF Contour Pro X1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="machine_type">Machine Type *</Label>
                <Select
                  value={formData.machine_type}
                  onValueChange={(value) => setFormData({ ...formData, machine_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select machine type" />
                  </SelectTrigger>
                  <SelectContent>
                    {machineTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (units)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'maintenance') => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMachineMutation.isPending || updateMachineMutation.isPending}>
                  {(createMachineMutation.isPending || updateMachineMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingMachine ? 'Update Machine' : 'Add Machine'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-luxury">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Cpu className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{machines?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Machine Types</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-luxury">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Cpu className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeUnits}</p>
                <p className="text-sm text-muted-foreground">Active Units</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-luxury">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUnits - activeUnits}</p>
                <p className="text-sm text-muted-foreground">In Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search machines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Machines Table */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Machines ({filteredMachines?.length || 0})
          </CardTitle>
          <CardDescription>All treatment machines and equipment</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMachines && filteredMachines.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMachines.map((machine) => (
                    <TableRow key={machine.id} className={machine.status === 'maintenance' ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{machine.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {machine.machine_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{machine.quantity}</TableCell>
                      <TableCell className="text-center">
                        {machine.status === 'active' ? (
                          <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                        ) : (
                          <Badge className="bg-warning/10 text-warning border-warning/20">Maintenance</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(machine)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Machine</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{machine.name}"? This action cannot be undone. Services linked to this machine will need to be updated.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMachineMutation.mutate(machine.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No machines found</p>
              <p className="text-sm mt-1">Add your first machine to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
