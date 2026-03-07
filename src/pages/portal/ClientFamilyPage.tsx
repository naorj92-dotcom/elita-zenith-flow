import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Users, Plus, UserPlus, Trash2, Loader2, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ClientFamilyPage() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('family');

  // Fetch family members
  const { data: familyMembers = [], isLoading } = useQuery({
    queryKey: ['family-members', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await (supabase as any)
        .from('family_members')
        .select('*, linked_client:linked_client_id(id, first_name, last_name, email, phone)')
        .eq('primary_client_id', client.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!client?.id) throw new Error('Not authenticated');
      if (!firstName.trim() || !lastName.trim()) throw new Error('Name is required');

      // Create a new client record for the family member
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        })
        .select('id')
        .single();

      if (clientError) throw clientError;

      // Link as family member
      const { error: linkError } = await (supabase as any)
        .from('family_members')
        .insert({
          primary_client_id: client.id,
          linked_client_id: newClient.id,
          relationship,
        });

      if (linkError) throw linkError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast.success('Family member added!');
      setShowAdd(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setRelationship('family');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add family member'),
  });

  const removeMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await (supabase as any)
        .from('family_members')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast.success('Family member removed');
    },
    onError: () => toast.error('Failed to remove'),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Family Accounts</h1>
              <p className="text-sm text-muted-foreground">Manage appointments for your loved ones</p>
            </div>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Family Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">First Name *</label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Last Name *</label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email (optional)</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone (optional)</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Relationship</label>
                  <Select value={relationship} onValueChange={setRelationship}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="family">Other Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => addMutation.mutate()}
                  disabled={!firstName.trim() || !lastName.trim() || addMutation.isPending}
                >
                  {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Add Family Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Family Members List */}
      {familyMembers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Family Members Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your family members to easily manage and book appointments for them.
            </p>
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Your First Family Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {familyMembers.map((member: any, i: number) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {member.linked_client?.first_name?.[0]}{member.linked_client?.last_name?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {member.linked_client?.first_name} {member.linked_client?.last_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs capitalize">{member.relationship}</Badge>
                      {member.linked_client?.email && (
                        <span className="text-xs text-muted-foreground truncate">{member.linked_client.email}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMutation.mutate(member.id)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
