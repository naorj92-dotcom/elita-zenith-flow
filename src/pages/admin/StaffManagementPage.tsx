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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Staff, StaffRole } from '@/types';
import { Plus, Pencil, User, Phone, Mail, DollarSign, Percent, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { staffSchema, validateInput } from '@/lib/validations';

interface StaffFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  pin: string;
  role: StaffRole;
  hourly_rate: number;
  is_active: boolean;
  service_commission_tier1: number;
  service_commission_tier2: number;
  service_commission_tier3: number;
  service_tier1_threshold: number;
  service_tier2_threshold: number;
  retail_commission_rate: number;
}

const initialFormData: StaffFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  pin: '',
  role: 'provider',
  hourly_rate: 0,
  is_active: true,
  service_commission_tier1: 40,
  service_commission_tier2: 45,
  service_commission_tier3: 50,
  service_tier1_threshold: 5000,
  service_tier2_threshold: 10000,
  retail_commission_rate: 10,
};

export function StaffManagementPage() {
  const { staff: currentStaff } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(initialFormData);

  // Only admins can access this page
  if (currentStaff?.role !== 'admin') {
    return (
      <Card className="card-luxury">
        <CardContent className="py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can manage staff.</p>
        </CardContent>
      </Card>
    );
  }

  const { data: staffList, isLoading } = useQuery({
    queryKey: ['admin-staff-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('first_name', { ascending: true });
      if (error) throw error;
      return data as Staff[];
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      // Validate input before database operation
      const result = staffSchema.safeParse(data);
      if (!result.success) {
        throw new Error(result.error.errors[0]?.message || 'Validation failed');
      }
      
      const { error } = await supabase.from('staff').insert(result.data as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Staff member created successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-staff-list'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create staff member', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StaffFormData> }) => {
      // Validate input before database operation
      const result = staffSchema.partial().safeParse(data);
      if (!result.success) {
        throw new Error(result.error.errors[0]?.message || 'Validation failed');
      }
      
      const { error } = await supabase.from('staff').update(result.data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Staff member updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['admin-staff-list'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update staff member', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingStaff(null);
  };

  const openEditDialog = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email || '',
      phone: staff.phone || '',
      pin: staff.pin,
      role: staff.role,
      hourly_rate: staff.hourly_rate,
      is_active: staff.is_active,
      service_commission_tier1: staff.service_commission_tier1,
      service_commission_tier2: staff.service_commission_tier2,
      service_commission_tier3: staff.service_commission_tier3,
      service_tier1_threshold: staff.service_tier1_threshold,
      service_tier2_threshold: staff.service_tier2_threshold,
      retail_commission_rate: staff.retail_commission_rate,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, data: formData });
    } else {
      createStaffMutation.mutate(formData);
    }
  };

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-elita-gold/20 text-elita-gold border-elita-gold/30">Admin</Badge>;
      case 'provider':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Provider</Badge>;
      case 'front_desk':
        return <Badge variant="secondary">Front Desk</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Staff Management</h1>
          <p className="text-muted-foreground mt-1">Manage employees, PINs, and commission rates</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
              <DialogDescription>
                {editingStaff ? 'Update employee information and settings' : 'Enter the details for the new employee'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN Code</Label>
                  <Input
                    id="pin"
                    type="text"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    required
                    placeholder="4 digits"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: StaffRole) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="provider">Provider</SelectItem>
                      <SelectItem value="front_desk">Front Desk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Commission Settings */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Commission Settings
                </h4>
                
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Tier 1 Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.service_commission_tier1}
                      onChange={(e) => setFormData({ ...formData, service_commission_tier1: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tier 2 Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.service_commission_tier2}
                      onChange={(e) => setFormData({ ...formData, service_commission_tier2: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tier 3 Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.service_commission_tier3}
                      onChange={(e) => setFormData({ ...formData, service_commission_tier3: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 mt-4">
                  <div className="space-y-2">
                    <Label>Tier 1 Threshold ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.service_tier1_threshold}
                      onChange={(e) => setFormData({ ...formData, service_tier1_threshold: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tier 2 Threshold ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.service_tier2_threshold}
                      onChange={(e) => setFormData({ ...formData, service_tier2_threshold: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Retail Commission (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.retail_commission_rate}
                      onChange={(e) => setFormData({ ...formData, retail_commission_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive staff cannot log in
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
                <Button type="submit" disabled={createStaffMutation.isPending || updateStaffMutation.isPending}>
                  {(createStaffMutation.isPending || updateStaffMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingStaff ? 'Update Staff' : 'Create Staff'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="card-luxury">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-12 w-12 bg-muted rounded-full"></div>
                  <div className="h-5 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffList?.map((staff) => (
            <Card key={staff.id} className={`card-luxury ${!staff.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{staff.first_name} {staff.last_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleBadge(staff.role)}
                        {!staff.is_active && <Badge variant="outline">Inactive</Badge>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(staff)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  {staff.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{staff.email}</span>
                    </div>
                  )}
                  {staff.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{staff.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>${staff.hourly_rate}/hr</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    PIN: <span className="font-mono">{staff.pin}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Commission: {staff.service_commission_tier1}% / {staff.service_commission_tier2}% / {staff.service_commission_tier3}%
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
