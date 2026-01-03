import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Crown, Users, Sparkles } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface MembershipFormData {
  name: string;
  description: string;
  price: number;
  billing_period: string;
  monthly_service_credits: number;
  retail_discount_percent: number;
  priority_booking: boolean;
  benefits: string[];
  is_active: boolean;
}

const initialFormData: MembershipFormData = {
  name: '',
  description: '',
  price: 0,
  billing_period: 'monthly',
  monthly_service_credits: 1,
  retail_discount_percent: 0,
  priority_booking: false,
  benefits: [''],
  is_active: true,
};

export function MembershipsManagementPage() {
  const { staff } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MembershipFormData>(initialFormData);

  if (staff?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .order('price', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: clientMemberships } = useQuery({
    queryKey: ['client-memberships-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_memberships')
        .select('membership_id, status')
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MembershipFormData) => {
      const { error } = await supabase.from('memberships').insert({
        name: data.name,
        description: data.description,
        price: data.price,
        billing_period: data.billing_period,
        monthly_service_credits: data.monthly_service_credits,
        retail_discount_percent: data.retail_discount_percent,
        priority_booking: data.priority_booking,
        benefits: data.benefits.filter(b => b.trim()) as unknown as Json,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      toast.success('Membership tier created');
      resetForm();
    },
    onError: () => toast.error('Failed to create membership'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MembershipFormData }) => {
      const { error } = await supabase
        .from('memberships')
        .update({
          name: data.name,
          description: data.description,
          price: data.price,
          billing_period: data.billing_period,
          monthly_service_credits: data.monthly_service_credits,
          retail_discount_percent: data.retail_discount_percent,
          priority_booking: data.priority_booking,
          benefits: data.benefits.filter(b => b.trim()) as unknown as Json,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      toast.success('Membership tier updated');
      resetForm();
    },
    onError: () => toast.error('Failed to update membership'),
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setIsDialogOpen(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const openEditDialog = (membership: any) => {
    const benefits = Array.isArray(membership.benefits) 
      ? membership.benefits as string[]
      : [];
    setFormData({
      name: membership.name,
      description: membership.description || '',
      price: membership.price,
      billing_period: membership.billing_period,
      monthly_service_credits: membership.monthly_service_credits,
      retail_discount_percent: membership.retail_discount_percent || 0,
      priority_booking: membership.priority_booking,
      benefits: benefits.length > 0 ? benefits : [''],
      is_active: membership.is_active,
    });
    setIsEditing(true);
    setEditingId(membership.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addBenefit = () => {
    setFormData(prev => ({ ...prev, benefits: [...prev.benefits, ''] }));
  };

  const updateBenefit = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map((b, i) => (i === index ? value : b)),
    }));
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  const getMemberCount = (membershipId: string) => {
    return clientMemberships?.filter(cm => cm.membership_id === membershipId).length || 0;
  };

  const getTierColor = (index: number) => {
    const colors = ['bg-secondary', 'bg-elita-gold/10 border-elita-gold/30', 'bg-primary/10 border-primary/30'];
    return colors[index] || colors[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Membership Tiers</h1>
          <p className="text-muted-foreground mt-1">Manage recurring membership plans</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setFormData(initialFormData); setIsEditing(false); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit' : 'Create'} Membership Tier</DialogTitle>
              <DialogDescription>Configure membership benefits and pricing</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tier Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Glow Essentials"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Monthly Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this tier"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_period">Billing Period</Label>
                  <Select
                    value={formData.billing_period}
                    onValueChange={value => setFormData(prev => ({ ...prev, billing_period: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credits">Monthly Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="0"
                    value={formData.monthly_service_credits}
                    onChange={e => setFormData(prev => ({ ...prev, monthly_service_credits: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Retail Discount %</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.retail_discount_percent}
                    onChange={e => setFormData(prev => ({ ...prev, retail_discount_percent: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="priority"
                    checked={formData.priority_booking}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, priority_booking: checked }))}
                  />
                  <Label htmlFor="priority">Priority Booking</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Benefits</Label>
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={benefit}
                      onChange={e => updateBenefit(index, e.target.value)}
                      placeholder="e.g., 1 signature facial per month"
                    />
                    {formData.benefits.length > 1 && (
                      <Button type="button" variant="outline" size="icon" onClick={() => removeBenefit(index)}>
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
                  + Add Benefit
                </Button>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit">{isEditing ? 'Update' : 'Create'} Tier</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tier Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {memberships?.map((membership, index) => {
          const benefits = Array.isArray(membership.benefits) ? membership.benefits as string[] : [];
          return (
            <Card key={membership.id} className={`card-luxury relative overflow-hidden ${getTierColor(index)}`}>
              {index === (memberships.length - 1) && (
                <div className="absolute top-4 right-4">
                  <Crown className="h-5 w-5 text-elita-gold" />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-xl">{membership.name}</CardTitle>
                  <Badge variant={membership.is_active ? 'default' : 'secondary'}>
                    {membership.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription>{membership.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-semibold">${membership.price}</span>
                  <span className="text-muted-foreground">/{membership.billing_period}</span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{getMemberCount(membership.id)} members</span>
                  </div>
                  {membership.priority_booking && (
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      VIP
                    </Badge>
                  )}
                </div>

                <ul className="space-y-2 text-sm">
                  {benefits.slice(0, 4).map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                  {benefits.length > 4 && (
                    <li className="text-muted-foreground">+{benefits.length - 4} more benefits</li>
                  )}
                </ul>

                <div className="pt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(membership)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading membership tiers...</div>
      )}
    </div>
  );
}
