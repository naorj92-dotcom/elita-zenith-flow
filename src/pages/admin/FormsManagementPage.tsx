import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Edit2, 
  FileText, 
  ClipboardCheck,
  FileSignature,
  Scroll,
  Eye,
  Users
} from 'lucide-react';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { FormField } from '@/components/forms/FormFieldRenderer';
import { format } from 'date-fns';

type FormType = 'intake' | 'consent' | 'contract' | 'custom';

interface Form {
  id: string;
  name: string;
  description: string | null;
  form_type: FormType;
  fields: FormField[];
  requires_signature: boolean;
  is_active: boolean;
  created_at: string;
}

const FORM_TYPE_ICONS: Record<FormType, React.ReactNode> = {
  intake: <ClipboardCheck className="w-4 h-4" />,
  consent: <FileSignature className="w-4 h-4" />,
  contract: <Scroll className="w-4 h-4" />,
  custom: <FileText className="w-4 h-4" />,
};

const FORM_TYPE_COLORS: Record<FormType, string> = {
  intake: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  consent: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  contract: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  custom: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

export function FormsManagementPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FormType | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [activeTab, setActiveTab] = useState('templates');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    form_type: 'custom' as FormType,
    fields: [] as FormField[],
    requires_signature: true,
    is_active: true,
  });

  // Fetch forms
  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(form => ({
        ...form,
        fields: (Array.isArray(form.fields) ? form.fields : []) as unknown as FormField[],
      })) as Form[];
    },
  });

  // Fetch client form submissions
  const { data: submissions = [] } = useQuery({
    queryKey: ['client-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_forms')
        .select(`
          *,
          forms:form_id (name, form_type),
          clients:client_id (first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Create/Update form mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingForm) {
        const { error } = await supabase
          .from('forms')
          .update({
            name: data.name,
            description: data.description,
            form_type: data.form_type,
            fields: data.fields as any,
            requires_signature: data.requires_signature,
            is_active: data.is_active,
          })
          .eq('id', editingForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('forms')
          .insert({
            name: data.name,
            description: data.description,
            form_type: data.form_type,
            fields: data.fields as any,
            requires_signature: data.requires_signature,
            is_active: data.is_active,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success(editingForm ? 'Form updated' : 'Form created');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save form');
    },
  });

  const handleOpenDialog = (form?: Form) => {
    if (form) {
      setEditingForm(form);
      setFormData({
        name: form.name,
        description: form.description || '',
        form_type: form.form_type,
        fields: form.fields || [],
        requires_signature: form.requires_signature,
        is_active: form.is_active,
      });
    } else {
      setEditingForm(null);
      setFormData({
        name: '',
        description: '',
        form_type: 'custom',
        fields: [],
        requires_signature: true,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingForm(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a form name');
      return;
    }
    saveMutation.mutate(formData);
  };

  const filteredForms = forms.filter((form) => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         form.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || form.form_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Forms & Intake</h1>
          <p className="text-muted-foreground">Manage client forms, consents, and contracts</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Form
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Form Templates
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-2">
            <Users className="w-4 h-4" />
            Client Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search forms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FormType | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="intake">Intake Forms</SelectItem>
                <SelectItem value="consent">Consent Forms</SelectItem>
                <SelectItem value="contract">Contracts</SelectItem>
                <SelectItem value="custom">Custom Forms</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Forms Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredForms.map((form, index) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleOpenDialog(form)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${FORM_TYPE_COLORS[form.form_type]}`}>
                          {FORM_TYPE_ICONS[form.form_type]}
                        </div>
                        <div>
                          <CardTitle className="text-base">{form.name}</CardTitle>
                          <Badge variant="outline" className="mt-1 capitalize">
                            {form.form_type}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant={form.is_active ? 'default' : 'secondary'}>
                        {form.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {form.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{form.fields?.length || 0} fields</span>
                      {form.requires_signature && (
                        <span className="flex items-center gap-1">
                          <FileSignature className="w-3 h-3" />
                          Signature required
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredForms.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No forms found</h3>
              <p className="text-muted-foreground mb-4">Create your first form to get started</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Form
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission: any) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">
                      {submission.clients?.first_name} {submission.clients?.last_name}
                    </TableCell>
                    <TableCell>{submission.forms?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {submission.forms?.form_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={submission.status === 'completed' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {submission.signed_at 
                        ? format(new Date(submission.signed_at), 'MMM d, yyyy')
                        : 'Not signed'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {submissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No submissions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? 'Edit Form' : 'Create New Form'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Form Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., New Client Intake"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form_type">Form Type</Label>
                <Select
                  value={formData.form_type}
                  onValueChange={(v) => setFormData({ ...formData, form_type: v as FormType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intake">Intake Form</SelectItem>
                    <SelectItem value="consent">Consent Form</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="custom">Custom Form</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this form..."
                rows={2}
              />
            </div>

            {/* Settings */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="requires_signature"
                  checked={formData.requires_signature}
                  onCheckedChange={(v) => setFormData({ ...formData, requires_signature: v })}
                />
                <Label htmlFor="requires_signature">Requires Signature</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            {/* Form Builder */}
            <div className="space-y-2">
              <Label>Form Fields</Label>
              <FormBuilder
                fields={formData.fields}
                onChange={(fields) => setFormData({ ...formData, fields })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingForm ? 'Update Form' : 'Create Form'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
