import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Mail, MessageSquare, Plus, Edit2, Eye, Send, Clock, CheckCircle, XCircle, Bell } from 'lucide-react';
import { format } from 'date-fns';

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms';
  category: string;
  subject: string | null;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationLog {
  id: string;
  template_id: string | null;
  client_id: string | null;
  type: string;
  category: string;
  recipient: string;
  subject: string | null;
  body: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const categories = [
  { value: 'appointment_reminder', label: 'Appointment Reminder' },
  { value: 'appointment_confirmation', label: 'Appointment Confirmation' },
  { value: 'membership_renewal', label: 'Membership Renewal' },
  { value: 'loyalty_update', label: 'Loyalty Update' },
  { value: 'general', label: 'General' },
];

export default function NotificationsManagementPage() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'email' as 'email' | 'sms',
    category: 'general',
    subject: '',
    body: '',
    is_active: true,
  });

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  // Fetch logs
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['notification-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as NotificationLog[];
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Partial<NotificationTemplate> & { id: string }) => {
      const { error } = await supabase
        .from('notification_templates')
        .update({
          name: template.name,
          type: template.type,
          category: template.category,
          subject: template.subject,
          body: template.body,
          is_active: template.is_active,
        })
        .eq('id', template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template updated successfully');
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update template: ' + error.message);
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('notification_templates')
        .insert({
          name: template.name,
          type: template.type,
          category: template.category,
          subject: template.subject,
          body: template.body,
          is_active: template.is_active,
          variables: template.variables,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template created successfully');
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to create template: ' + error.message);
    },
  });

  const handleEdit = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      type: template.type,
      category: template.category,
      subject: template.subject || '',
      body: template.body,
      is_active: template.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setEditForm({
      name: '',
      type: 'email',
      category: 'general',
      subject: '',
      body: '',
      is_active: true,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({
        id: selectedTemplate.id,
        ...editForm,
      });
    } else {
      createTemplateMutation.mutate({
        ...editForm,
        variables: extractVariables(editForm.body + (editForm.subject || '')),
      });
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/{{(\w+)}}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/{{|}}/g, '')))];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    return categories.find(c => c.value === category)?.label || category;
  };

  const emailTemplates = templates.filter(t => t.type === 'email');
  const smsTemplates = templates.filter(t => t.type === 'sms');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Manage email and SMS templates for client communications</p>
        </div>
        <Button onClick={handleNewTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Bell className="h-4 w-4" />
            Notification Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          {templatesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {emailTemplates.map(template => (
                <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>{getCategoryLabel(template.category)}</CardDescription>
                      </div>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Subject</p>
                        <p className="text-sm truncate">{template.subject || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Variables</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(template.variables as string[]).slice(0, 5).map(v => (
                            <Badge key={v} variant="outline" className="text-xs">
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                          {(template.variables as string[]).length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{(template.variables as string[]).length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedTemplate(template); setIsPreviewOpen(true); }}>
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          {templatesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {smsTemplates.map(template => (
                <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>{getCategoryLabel(template.category)}</CardDescription>
                      </div>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Message</p>
                        <p className="text-sm line-clamp-2">{template.body}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Characters</p>
                        <p className="text-sm">{template.body.length} / 160</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>View sent notifications and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No notifications sent yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className="capitalize">{log.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.type === 'email' ? (
                            <Mail className="h-4 w-4" />
                          ) : (
                            <MessageSquare className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>{getCategoryLabel(log.category)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.recipient}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{log.subject || 'N/A'}</TableCell>
                        <TableCell>
                          {log.sent_at ? format(new Date(log.sent_at), 'MMM d, h:mm a') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {selectedTemplate ? 'Modify the notification template' : 'Create a new notification template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g., Appointment Reminder"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={(v: 'email' | 'sms') => setEditForm({ ...editForm, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editForm.type === 'email' && (
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  placeholder="e.g., Your appointment is confirmed!"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Body {editForm.type === 'sms' && `(${editForm.body.length}/160 chars)`}</Label>
              <Textarea
                value={editForm.body}
                onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                rows={8}
                placeholder="Use {{variable_name}} for dynamic content..."
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {`{{client_name}}, {{appointment_date}}, {{appointment_time}}, {{service_name}}, {{staff_name}}, {{amount}}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {selectedTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>{selectedTemplate?.name}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="border rounded-lg p-6 bg-muted/30">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subject</p>
                  <p className="font-medium">{selectedTemplate.subject}</p>
                </div>
                <div className="border-t pt-4">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {selectedTemplate.body}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
