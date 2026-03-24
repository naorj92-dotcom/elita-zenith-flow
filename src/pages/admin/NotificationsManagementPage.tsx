import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Mail, MessageSquare, Plus, Edit2, Eye, Clock, CheckCircle, XCircle, Bell, Zap, Settings2 } from 'lucide-react';
import { BirthdayCampaignSection } from '@/components/admin/BirthdayCampaignSection';
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

interface NotificationTrigger {
  id: string;
  trigger_key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  channels: string[];
  email_subject: string | null;
  email_body: string;
  sms_body: string;
  timing_description: string | null;
  google_review_url: string | null;
}

const categories = [
  { value: 'appointment_reminder', label: 'Appointment Reminder' },
  { value: 'appointment_confirmation', label: 'Appointment Confirmation' },
  { value: 'membership_renewal', label: 'Membership Renewal' },
  { value: 'loyalty_update', label: 'Loyalty Update' },
  { value: 'general', label: 'General' },
];

const sampleVars: Record<string, string> = {
  first_name: 'Sarah',
  service_name: 'Botox Treatment',
  weekday: 'Tuesday',
  time: '2:00 PM',
  provider_first_name: 'Dr. Smith',
  forms_message: 'Complete your pre-visit forms: https://portal.example.com/forms',
  portal_url: 'https://portal.example.com',
  google_review_url: 'https://g.page/r/example',
  package_name: 'Glow Package',
  sessions_remaining: '3',
  expiry_date: 'April 30, 2026',
  renewal_date: 'April 1',
  included_service: 'monthly facial',
};

function previewText(text: string): string {
  let result = text;
  for (const [key, value] of Object.entries(sampleVars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

export default function NotificationsManagementPage() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<NotificationTrigger | null>(null);
  const [triggerForm, setTriggerForm] = useState<any>(null);
  const [previewTrigger, setPreviewTrigger] = useState<NotificationTrigger | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'email' as 'email' | 'sms',
    category: 'general',
    subject: '',
    body: '',
    is_active: true,
  });

  // Fetch triggers
  const { data: triggers = [] } = useQuery({
    queryKey: ['notification-triggers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_triggers')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as NotificationTrigger[];
    },
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

  // Toggle trigger enabled
  const toggleTriggerMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('notification_triggers')
        .update({ is_enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-triggers'] });
      toast.success('Trigger updated');
    },
  });

  // Update trigger templates
  const updateTriggerMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('notification_triggers')
        .update({
          email_subject: data.email_subject,
          email_body: data.email_body,
          sms_body: data.sms_body,
          google_review_url: data.google_review_url,
          channels: data.channels,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-triggers'] });
      toast.success('Template saved');
      setEditingTrigger(null);
      setTriggerForm(null);
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Partial<NotificationTemplate> & { id: string }) => {
      const { error } = await supabase
        .from('notification_templates')
        .update({
          name: template.name, type: template.type, category: template.category,
          subject: template.subject, body: template.body, is_active: template.is_active,
        })
        .eq('id', template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template updated');
      setIsEditDialogOpen(false);
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('notification_templates')
        .insert({
          name: template.name, type: template.type, category: template.category,
          subject: template.subject, body: template.body, is_active: template.is_active,
          variables: template.variables,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template created');
      setIsEditDialogOpen(false);
    },
  });

  const handleEdit = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name, type: template.type, category: template.category,
      subject: template.subject || '', body: template.body, is_active: template.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setEditForm({ name: '', type: 'email', category: 'general', subject: '', body: '', is_active: true });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, ...editForm });
    } else {
      createTemplateMutation.mutate({
        ...editForm,
        variables: extractVariables(editForm.body + (editForm.subject || '')),
      });
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getCategoryLabel = (category: string) =>
    categories.find(c => c.value === category)?.label || category;

  const emailTemplates = templates.filter(t => t.type === 'email');
  const smsTemplates = templates.filter(t => t.type === 'sms');

  const channelIcons: Record<string, React.ReactNode> = {
    email: <Mail className="h-3.5 w-3.5" />,
    sms: <MessageSquare className="h-3.5 w-3.5" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Manage automated triggers, templates, and message history</p>
        </div>
        <Button onClick={handleNewTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs defaultValue="triggers" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="triggers" className="gap-2">
            <Zap className="h-4 w-4" />
            Automated Triggers
          </TabsTrigger>
          <TabsTrigger value="birthday" className="gap-2">
            🎂 Birthday
          </TabsTrigger>
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
            Message Log
          </TabsTrigger>
        </TabsList>

        {/* ── Birthday Campaign Tab ── */}
        <TabsContent value="birthday">
          <BirthdayCampaignSection />
        </TabsContent>

        {/* ── Automated Triggers Tab ── */}
        <TabsContent value="triggers" className="space-y-4">
          <div className="grid gap-4">
            {triggers.map(trigger => (
              <Card key={trigger.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">{trigger.name}</CardTitle>
                        <div className="flex gap-1">
                          {(trigger.channels || []).map(ch => (
                            <Badge key={ch} variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                              {channelIcons[ch]} {ch}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <CardDescription>{trigger.description}</CardDescription>
                      {trigger.timing_description && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" /> {trigger.timing_description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={trigger.is_enabled}
                        onCheckedChange={(checked) =>
                          toggleTriggerMutation.mutate({ id: trigger.id, is_enabled: checked })
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewTrigger(trigger)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTrigger(trigger);
                          setTriggerForm({
                            id: trigger.id,
                            email_subject: trigger.email_subject || '',
                            email_body: trigger.email_body || '',
                            sms_body: trigger.sms_body || '',
                            google_review_url: trigger.google_review_url || '',
                            channels: trigger.channels || [],
                          });
                        }}
                      >
                        <Settings2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Google Review URL — shown once at bottom */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Google Review URL</CardTitle>
              <CardDescription>Used in post-visit follow-up messages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 max-w-lg">
                <Input
                  placeholder="https://g.page/r/your-business"
                  value={triggers.find(t => t.trigger_key === '24hr_post_visit_followup')?.google_review_url || ''}
                  onChange={(e) => {
                    const t = triggers.find(t => t.trigger_key === '24hr_post_visit_followup');
                    if (t) {
                      supabase
                        .from('notification_triggers')
                        .update({ google_review_url: e.target.value })
                        .eq('id', t.id)
                        .then(() => queryClient.invalidateQueries({ queryKey: ['notification-triggers'] }));
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email Templates Tab ── */}
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
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedTemplate(template); setIsPreviewOpen(true); }}>
                          <Eye className="h-4 w-4 mr-1" /> Preview
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                          <Edit2 className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── SMS Templates Tab ── */}
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
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>{template.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm line-clamp-2">{template.body}</p>
                      <p className="text-xs text-muted-foreground">{template.body.length} / 160 chars</p>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                        <Edit2 className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Message Log Tab ── */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>All sent notifications and their delivery status</CardDescription>
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
                          {log.type === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                        </TableCell>
                        <TableCell>{getCategoryLabel(log.category)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.recipient}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{log.subject || 'N/A'}</TableCell>
                        <TableCell>{log.sent_at ? format(new Date(log.sent_at), 'MMM d, h:mm a') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit Trigger Dialog ── */}
      <Dialog open={!!editingTrigger} onOpenChange={(open) => { if (!open) { setEditingTrigger(null); setTriggerForm(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit: {editingTrigger?.name}</DialogTitle>
            <DialogDescription>{editingTrigger?.description}</DialogDescription>
          </DialogHeader>
          {triggerForm && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">Channels:</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={triggerForm.channels.includes('email')}
                    onCheckedChange={(checked) => {
                      const ch = checked
                        ? [...triggerForm.channels, 'email']
                        : triggerForm.channels.filter((c: string) => c !== 'email');
                      setTriggerForm({ ...triggerForm, channels: ch });
                    }}
                  />
                  <Label className="text-sm">Email</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={triggerForm.channels.includes('sms')}
                    onCheckedChange={(checked) => {
                      const ch = checked
                        ? [...triggerForm.channels, 'sms']
                        : triggerForm.channels.filter((c: string) => c !== 'sms');
                      setTriggerForm({ ...triggerForm, channels: ch });
                    }}
                  />
                  <Label className="text-sm">SMS</Label>
                </div>
              </div>

              {triggerForm.channels.includes('email') && (
                <>
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input
                      value={triggerForm.email_subject}
                      onChange={(e) => setTriggerForm({ ...triggerForm, email_subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Body</Label>
                    <Textarea
                      value={triggerForm.email_body}
                      onChange={(e) => setTriggerForm({ ...triggerForm, email_body: e.target.value })}
                      rows={8}
                    />
                  </div>
                </>
              )}

              {triggerForm.channels.includes('sms') && (
                <div className="space-y-2">
                  <Label>SMS Body ({triggerForm.sms_body.length}/160 chars)</Label>
                  <Textarea
                    value={triggerForm.sms_body}
                    onChange={(e) => setTriggerForm({ ...triggerForm, sms_body: e.target.value })}
                    rows={4}
                  />
                </div>
              )}

              {editingTrigger?.trigger_key === '24hr_post_visit_followup' && (
                <div className="space-y-2">
                  <Label>Google Review URL</Label>
                  <Input
                    value={triggerForm.google_review_url}
                    onChange={(e) => setTriggerForm({ ...triggerForm, google_review_url: e.target.value })}
                    placeholder="https://g.page/r/your-business"
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Variables: {`{{first_name}}, {{service_name}}, {{weekday}}, {{time}}, {{provider_first_name}}, {{forms_message}}, {{portal_url}}, {{google_review_url}}, {{package_name}}, {{sessions_remaining}}, {{expiry_date}}, {{renewal_date}}, {{included_service}}`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingTrigger(null); setTriggerForm(null); }}>Cancel</Button>
            <Button onClick={() => updateTriggerMutation.mutate(triggerForm)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview Trigger Dialog ── */}
      <Dialog open={!!previewTrigger} onOpenChange={(open) => { if (!open) setPreviewTrigger(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewTrigger?.name}</DialogTitle>
            <DialogDescription>Sample data applied to templates</DialogDescription>
          </DialogHeader>
          {previewTrigger && (
            <div className="space-y-4">
              {previewTrigger.channels?.includes('email') && previewTrigger.email_body && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                  <Badge variant="outline" className="gap-1"><Mail className="h-3 w-3" /> Email</Badge>
                  <p className="text-sm font-medium">{previewText(previewTrigger.email_subject || '')}</p>
                  <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {previewText(previewTrigger.email_body)}
                  </div>
                </div>
              )}
              {previewTrigger.channels?.includes('sms') && previewTrigger.sms_body && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                  <Badge variant="outline" className="gap-1"><MessageSquare className="h-3 w-3" /> SMS</Badge>
                  <div className="text-sm whitespace-pre-wrap">
                    {previewText(previewTrigger.sms_body)}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTrigger(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit/Create Manual Template Dialog ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={(v: 'email' | 'sms') => setEditForm({ ...editForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Body {editForm.type === 'sms' && `(${editForm.body.length}/160 chars)`}</Label>
              <Textarea value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} rows={8} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editForm.is_active} onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{selectedTemplate ? 'Save Changes' : 'Create Template'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview Manual Template Dialog ── */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>{selectedTemplate?.name}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="border rounded-lg p-6 bg-muted/30 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subject</p>
                <p className="font-medium">{selectedTemplate.subject}</p>
              </div>
              <div className="border-t pt-4 prose prose-sm max-w-none whitespace-pre-wrap">
                {selectedTemplate.body}
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
