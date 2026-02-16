import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, Crown, MapPin, ShoppingCart, FileText, MessageCircle,
  Mail, Calendar, MoreHorizontal, User, Phone, Save, Loader2,
  Clock, Camera, Package, CreditCard, Sparkles, ClipboardList,
  Image as ImageIcon, FolderOpen, AlertTriangle, Pill, ShieldAlert
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch client
  const { data: client, isLoading } = useQuery({
    queryKey: ['client-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ['client-appointments', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('*, services(name, price), staff(first_name, last_name)')
        .eq('client_id', id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['client-messages-profile', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch memberships
  const { data: memberships = [] } = useQuery({
    queryKey: ['client-memberships-profile', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('client_memberships')
        .select('*, memberships(name, price, billing_period)')
        .eq('client_id', id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch packages
  const { data: packages = [] } = useQuery({
    queryKey: ['client-packages-profile', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('client_packages')
        .select('*, packages(name, price)')
        .eq('client_id', id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch forms
  const { data: forms = [] } = useQuery({
    queryKey: ['client-forms-profile', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('client_forms')
        .select('*, forms(name, form_type)')
        .eq('client_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch photos
  const { data: photos = [] } = useQuery({
    queryKey: ['client-photos-profile', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('before_after_photos')
        .select('*, services(name)')
        .eq('client_id', id)
        .order('taken_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Computed stats
  const scheduledAppointments = appointments.filter(
    (a) => ['scheduled', 'confirmed'].includes(a.status) && new Date(a.scheduled_at) >= new Date()
  );
  const completedAppointments = appointments.filter((a) => a.status === 'completed');
  const noShows = appointments.filter((a) => a.status === 'no_show');
  const showRate = appointments.length > 0
    ? Math.round(((appointments.length - noShows.length) / appointments.length) * 100)
    : 100;
  const avgVisitValue = completedAppointments.length > 0
    ? (completedAppointments.reduce((sum, a) => sum + Number(a.total_amount), 0) / completedAppointments.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/clients')}>
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-heading font-semibold">
                  {client.first_name} {client.last_name}
                </h1>
                {client.is_vip && (
                  <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
                    <Crown className="h-3 w-3" /> VIP
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {[client.city, client.state].filter(Boolean).join(', ') || 'Elita Medical Spa'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Icons */}
          <div className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Checkout" onClick={() => navigate('/pos')}>
              <ShoppingCart className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Forms">
              <FileText className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Messages" onClick={() => navigate('/messages')}>
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Email">
              <Mail className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Schedule" onClick={() => navigate('/schedule')}>
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border bg-card px-6 overflow-x-auto">
              <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                {[
                  { value: 'overview', label: 'Overview' },
                  { value: 'accommodations', label: 'Accommodations' },
                  { value: 'messages', label: 'Messages', count: messages.filter(m => m.sender_type === 'client' && !m.is_read).length },
                  { value: 'history', label: 'History' },
                  { value: 'wallet', label: 'Wallet' },
                  { value: 'memberships', label: 'Memberships' },
                  { value: 'packages', label: 'Packages' },
                  { value: 'products', label: 'Products' },
                  { value: 'forms', label: 'Forms & Charts' },
                  { value: 'gallery', label: 'Gallery' },
                  { value: 'files', label: 'Files' },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-xs font-medium uppercase tracking-wider"
                  >
                    {tab.label}
                    {tab.count ? (
                      <Badge variant="default" className="ml-1.5 h-5 min-w-5 text-[10px]">
                        {tab.count}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-6">
              {/* OVERVIEW */}
              <TabsContent value="overview" className="mt-0 space-y-6">
                <OverviewTab
                  client={client}
                  appointments={appointments}
                  scheduledAppointments={scheduledAppointments}
                  showRate={showRate}
                  avgVisitValue={avgVisitValue}
                />
              </TabsContent>

              {/* MESSAGES */}
              <TabsContent value="messages" className="mt-0">
                <MessagesTab messages={messages} clientName={`${client.first_name} ${client.last_name}`} clientId={client.id} />
              </TabsContent>

              {/* HISTORY */}
              <TabsContent value="history" className="mt-0">
                <HistoryTab appointments={appointments} />
              </TabsContent>

              {/* MEMBERSHIPS */}
              <TabsContent value="memberships" className="mt-0">
                <MembershipsTab memberships={memberships} />
              </TabsContent>

              {/* PACKAGES */}
              <TabsContent value="packages" className="mt-0">
                <PackagesTab packages={packages} />
              </TabsContent>

              {/* FORMS */}
              <TabsContent value="forms" className="mt-0">
                <FormsTab forms={forms} />
              </TabsContent>

              {/* GALLERY */}
              <TabsContent value="gallery" className="mt-0">
                <GalleryTab photos={photos} />
              </TabsContent>

              {/* ACCOMMODATIONS */}
              <TabsContent value="accommodations" className="mt-0">
                <EmptyState icon={ClipboardList} title="No accommodations" description="Client accommodations and special requirements will appear here." compact />
              </TabsContent>

              {/* WALLET */}
              <TabsContent value="wallet" className="mt-0">
                <EmptyState icon={CreditCard} title="No wallet items" description="Gift cards, credits, and payment methods will appear here." compact />
              </TabsContent>

              {/* PRODUCTS */}
              <TabsContent value="products" className="mt-0">
                <EmptyState icon={ShoppingCart} title="No product history" description="Product purchases and recommendations will appear here." compact />
              </TabsContent>

              {/* FILES */}
              <TabsContent value="files" className="mt-0">
                <EmptyState icon={FolderOpen} title="No files" description="Uploaded documents and files will appear here." compact />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Sidebar - Contact Info */}
        <ContactSidebar client={client} />
      </div>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────
function OverviewTab({ client, appointments, scheduledAppointments, showRate, avgVisitValue }: any) {
  const queryClient = useQueryClient();
  const [alertText, setAlertText] = useState(client.scheduling_alert || '');
  const [noteTab, setNoteTab] = useState('note');
  const [noteText, setNoteText] = useState(client.notes || '');
  const [medText, setMedText] = useState(client.medications || '');
  const [allergyText, setAllergyText] = useState(client.allergies || '');

  const saveField = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase.from('clients').update(fields).eq('id', client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-profile', client.id] });
      toast.success('Saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  // Avg revisit in weeks
  const completedDates = appointments
    .filter((a: any) => a.status === 'completed')
    .map((a: any) => new Date(a.scheduled_at).getTime())
    .sort((a: number, b: number) => a - b);
  let avgRevisitWeeks = 0;
  if (completedDates.length >= 2) {
    const diffs = [];
    for (let i = 1; i < completedDates.length; i++) {
      diffs.push((completedDates[i] - completedDates[i - 1]) / (1000 * 60 * 60 * 24 * 7));
    }
    avgRevisitWeeks = diffs.reduce((a: number, b: number) => a + b, 0) / diffs.length;
  }

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {[
          { label: 'Appointments', value: appointments.length },
          { label: 'Show Rate', value: `${showRate}%` },
          { label: 'Avg. Revisit', value: `${avgRevisitWeeks.toFixed(1)} Weeks` },
          { label: 'Avg. Visit Value', value: `$${avgVisitValue.toFixed(2)}` },
        ].map((stat) => (
          <div key={stat.label} className="bg-card p-4 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</p>
            <p className="text-xl font-heading font-semibold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Scheduled Appointments */}
      <div>
        <h3 className="text-sm font-semibold text-primary mb-3">Scheduled Appointments</h3>
        {scheduledAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
        ) : (
          <div className="space-y-2">
            {scheduledAppointments.map((appt: any) => (
              <div key={appt.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {appt.services?.name || 'Service'} with {appt.staff?.first_name || 'Staff'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const d = new Date(appt.scheduled_at);
                      return isValid(d) ? format(d, 'EEEE, MMM d @ h:mm a') : 'TBD';
                    })()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduling Alert */}
      <div>
        <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Scheduling Alert
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder={`Set an alert to appear when booking for ${client.first_name}...`}
            value={alertText}
            onChange={(e) => setAlertText(e.target.value)}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={() => saveField.mutate({ scheduling_alert: alertText.trim() || null })}
            disabled={saveField.isPending}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Client Notes */}
      <div>
        <h3 className="text-sm font-semibold text-primary mb-3">Client Notes</h3>
        <Tabs value={noteTab} onValueChange={setNoteTab}>
          <TabsList className="h-8">
            <TabsTrigger value="note" className="text-xs px-3 h-7">Note</TabsTrigger>
            <TabsTrigger value="medication" className="text-xs px-3 h-7">Medication</TabsTrigger>
            <TabsTrigger value="allergies" className="text-xs px-3 h-7">Allergies</TabsTrigger>
          </TabsList>
          <TabsContent value="note" className="mt-3">
            <Textarea
              placeholder={`Type a new note about ${client.first_name}...`}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={() => saveField.mutate({ notes: noteText.trim() || null })} disabled={saveField.isPending}>
                Save
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="medication" className="mt-3">
            <Textarea
              placeholder="Medications..."
              value={medText}
              onChange={(e) => setMedText(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={() => saveField.mutate({ medications: medText.trim() || null })} disabled={saveField.isPending}>
                Save
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="allergies" className="mt-3">
            <Textarea
              placeholder="Allergies..."
              value={allergyText}
              onChange={(e) => setAllergyText(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={() => saveField.mutate({ allergies: allergyText.trim() || null })} disabled={saveField.isPending}>
                Save
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ─── Messages Tab ────────────────────────────────────────
function MessagesTab({ messages, clientName, clientId }: { messages: any[]; clientName: string; clientId: string }) {
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState('');

  const sendReply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('messages').insert({
        client_id: clientId,
        sender_type: 'staff',
        body: replyBody.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-messages-profile', clientId] });
      setReplyBody('');
      toast.success('Reply sent');
    },
  });

  if (messages.length === 0) {
    return <EmptyState icon={MessageCircle} title="No messages" description="No conversation with this client yet." compact />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {[...messages].reverse().map((msg) => {
          const isStaff = msg.sender_type === 'staff';
          return (
            <div
              key={msg.id}
              className={cn(
                "p-3 rounded-xl max-w-[80%] text-sm",
                isStaff ? "ml-auto bg-primary/10 border border-primary/20" : "mr-auto bg-secondary border border-border"
              )}
            >
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>{isStaff ? 'You' : clientName}</span>
                <span>{format(new Date(msg.created_at), 'MMM d, h:mm a')}</span>
              </div>
              {msg.subject && <p className="font-semibold">{msg.subject}</p>}
              <p className="whitespace-pre-wrap">{msg.body}</p>
            </div>
          );
        })}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (replyBody.trim()) sendReply.mutate(); }} className="flex gap-2">
        <Textarea placeholder="Reply..." value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={2} className="resize-none" />
        <Button type="submit" size="icon" disabled={!replyBody.trim() || sendReply.isPending} className="shrink-0 self-end h-10 w-10">
          <Mail className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

// ─── History Tab ─────────────────────────────────────────
function HistoryTab({ appointments }: { appointments: any[] }) {
  const completed = appointments.filter((a) => a.status === 'completed');
  if (completed.length === 0) {
    return <EmptyState icon={Clock} title="No history" description="No completed appointments yet." compact />;
  }
  return (
    <div className="space-y-2">
      {completed.map((appt) => (
        <div key={appt.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{appt.services?.name || 'Service'}</p>
            <p className="text-xs text-muted-foreground">
              {isValid(new Date(appt.scheduled_at)) ? format(new Date(appt.scheduled_at), 'MMM d, yyyy') : '—'}
              {' · '}{appt.staff?.first_name} {appt.staff?.last_name}
            </p>
          </div>
          <span className="text-sm font-semibold">${Number(appt.total_amount).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Memberships Tab ─────────────────────────────────────
function MembershipsTab({ memberships }: { memberships: any[] }) {
  if (memberships.length === 0) {
    return <EmptyState icon={Crown} title="No memberships" description="This client has no active memberships." compact />;
  }
  return (
    <div className="space-y-3">
      {memberships.map((m) => (
        <div key={m.id} className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{m.memberships?.name}</p>
              <p className="text-xs text-muted-foreground">
                ${m.memberships?.price}/{m.memberships?.billing_period} · {m.remaining_credits} credits remaining
              </p>
            </div>
            <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Packages Tab ────────────────────────────────────────
function PackagesTab({ packages }: { packages: any[] }) {
  if (packages.length === 0) {
    return <EmptyState icon={Package} title="No packages" description="This client has no packages." compact />;
  }
  return (
    <div className="space-y-3">
      {packages.map((p) => (
        <div key={p.id} className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{p.packages?.name || 'Package'}</p>
              <p className="text-xs text-muted-foreground">
                {p.sessions_used}/{p.sessions_total} sessions used
              </p>
            </div>
            <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Forms Tab ───────────────────────────────────────────
function FormsTab({ forms }: { forms: any[] }) {
  if (forms.length === 0) {
    return <EmptyState icon={FileText} title="No forms" description="No forms or consents on file." compact />;
  }
  return (
    <div className="space-y-2">
      {forms.map((f) => (
        <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{f.forms?.name || 'Form'}</p>
            <p className="text-xs text-muted-foreground capitalize">{f.forms?.form_type} · {f.status}</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {isValid(new Date(f.created_at)) ? format(new Date(f.created_at), 'MMM d, yyyy') : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Gallery Tab ─────────────────────────────────────────
function GalleryTab({ photos }: { photos: any[] }) {
  if (photos.length === 0) {
    return <EmptyState icon={ImageIcon} title="No photos" description="No before/after photos on file." compact />;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {photos.map((p) => (
        <div key={p.id} className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="aspect-square bg-muted flex items-center justify-center">
            {p.before_photo_url ? (
              <img src={p.before_photo_url} alt="Before" className="w-full h-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="p-2">
            <p className="text-xs font-medium truncate">{p.services?.name || 'Treatment'}</p>
            <p className="text-[10px] text-muted-foreground">
              {isValid(new Date(p.taken_date)) ? format(new Date(p.taken_date), 'MMM d, yyyy') : '—'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Contact Sidebar ─────────────────────────────────────
function ContactSidebar({ client }: { client: any }) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(client.first_name);
  const [lastName, setLastName] = useState(client.last_name);
  const [email, setEmail] = useState(client.email || '');
  const [phone, setPhone] = useState(client.phone || '');
  const [dob, setDob] = useState(client.date_of_birth || '');
  const [referralSource, setReferralSource] = useState(client.referral_source || '');
  const [emailNotif, setEmailNotif] = useState(client.email_notifications ?? true);
  const [textNotif, setTextNotif] = useState(client.text_notifications ?? true);
  const [pronouns, setPronouns] = useState(client.pronouns || '');
  const [address, setAddress] = useState(client.address || '');
  const [city, setCity] = useState(client.city || '');
  const [state, setState] = useState(client.state || '');
  const [zip, setZip] = useState(client.zip || '');
  const [emergencyName, setEmergencyName] = useState(client.emergency_contact_name || '');
  const [emergencyRelationship, setEmergencyRelationship] = useState(client.emergency_contact_relationship || '');
  const [emergencyPhone, setEmergencyPhone] = useState(client.emergency_contact_phone || '');
  const [marketingOptIn, setMarketingOptIn] = useState(client.marketing_opt_in || '');
  const [tags, setTags] = useState<string[]>(client.client_tags || []);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('clients').update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      date_of_birth: dob || null,
      referral_source: referralSource || null,
      email_notifications: emailNotif,
      text_notifications: textNotif,
      pronouns: pronouns || null,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state || null,
      zip: zip.trim() || null,
      emergency_contact_name: emergencyName.trim() || null,
      emergency_contact_relationship: emergencyRelationship.trim() || null,
      emergency_contact_phone: emergencyPhone.trim() || null,
      marketing_opt_in: marketingOptIn || null,
      client_tags: tags,
    }).eq('id', client.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
    } else {
      queryClient.invalidateQueries({ queryKey: ['client-profile', client.id] });
      toast.success('Changes saved');
    }
  };

  const addTag = () => {
    const tag = newTag.trim().toUpperCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Calculate age from DOB
  const age = dob ? (() => {
    const birthDate = new Date(dob);
    const today = new Date();
    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
    return a;
  })() : null;

  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  return (
    <ScrollArea className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card">
      <div className="p-6 space-y-5">

        {/* Referral Section */}
        <h3 className="text-sm font-semibold text-primary">Referral</h3>
        <div>
          <label className="text-xs text-muted-foreground">Referral Source</label>
          <Select value={referralSource} onValueChange={setReferralSource}>
            <SelectTrigger className="h-9 mt-1">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {['Facebook', 'Instagram', 'Google', 'Friend/Family', 'Walk-in', 'Yelp', 'TikTok', 'Other'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Marketing Opt-In */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">Marketing Opt-In</label>
          <Select value={marketingOptIn} onValueChange={setMarketingOptIn}>
            <SelectTrigger className="h-9 mt-1">
              <SelectValue placeholder="Please select..." />
            </SelectTrigger>
            <SelectContent>
              {['Opted In', 'Opted Out', 'Not Specified'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Client Tags */}
        <h3 className="text-sm font-semibold text-primary">Client Tags</h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 text-xs">
              {tag}
              <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">×</button>
            </Badge>
          ))}
          <div className="flex gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag..."
              className="h-7 w-24 text-xs"
            />
            <Button size="sm" variant="outline" onClick={addTag} className="h-7 text-xs px-2">+ Add</Button>
          </div>
        </div>

        <Separator />

        {/* Personal Info */}
        <h3 className="text-sm font-semibold text-primary">Personal Info</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Birthday</label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-9 mt-1" />
            {age !== null && age > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{age} years old</p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Pronouns</label>
            <Select value={pronouns} onValueChange={setPronouns}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Not Specified" />
              </SelectTrigger>
              <SelectContent>
                {['Not Specified', 'She/Her', 'He/Him', 'They/Them', 'Other'].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Contact Info */}
        <h3 className="text-sm font-semibold text-primary">Contact Info</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">First Name *</label>
            <div className="flex items-center gap-2 mt-1">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Last Name *</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center gap-2 mt-2 ml-6">
              <Checkbox checked={emailNotif} onCheckedChange={(v) => setEmailNotif(!!v)} id="email-notif" />
              <label htmlFor="email-notif" className="text-xs text-muted-foreground">Email notifications</label>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Mobile</label>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center gap-2 mt-2 ml-6">
              <Checkbox checked={textNotif} onCheckedChange={(v) => setTextNotif(!!v)} id="text-notif" />
              <label htmlFor="text-notif" className="text-xs text-muted-foreground">Text notifications</label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Home Address */}
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Home Address
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Street Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-9 mt-1" placeholder="5980 Gales Lane" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">City</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-9 mt-1" placeholder="Columbia" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">State</label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">ZIP</label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} className="h-9 mt-1" placeholder="21045" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Emergency Contact */}
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Emergency Contact
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Emergency Contact Name</label>
            <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="h-9 mt-1" placeholder="Contact name" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Emergency Contact Relationship</label>
            <Input value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} className="h-9 mt-1" placeholder="e.g. Spouse, Parent" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Emergency Contact Phone</label>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="h-9" placeholder="(443) 865-1466" />
            </div>
          </div>
        </div>

        <Separator />

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </ScrollArea>
  );
}
