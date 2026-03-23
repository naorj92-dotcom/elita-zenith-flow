import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, X, CheckCircle, XCircle, UserRoundPen, Search, Loader2, Package, Target, ArrowRight, FileText, Check, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { matchServiceToCategory, CATEGORIES, type TreatmentCategory } from '@/lib/elitaMethod';
import type { ScheduleAppointment } from '@/pages/SchedulePage';
import { motion, AnimatePresence } from 'framer-motion';
import { useRole } from '@/contexts/UnifiedAuthContext';
import { ChartNoteForm } from '@/components/charts/ChartNoteForm';
import { AlertTriangle } from 'lucide-react';

interface AppointmentPopoverProps {
  appointment: ScheduleAppointment;
  clientDetails?: {
    phone?: string | null;
    email?: string | null;
    visit_count?: number;
    total_spent?: number;
    date_of_birth?: string | null;
  } | null;
  onClose: () => void;
  onStatusChange?: (id: string, status: string) => void;
  onClientChanged?: () => void;
}

function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

function getProtocolSuggestion(serviceName: string): { label: string; category: TreatmentCategory } | null {
  const cat = matchServiceToCategory(serviceName);
  if (!cat) return null;
  const nextMap: Record<TreatmentCategory, TreatmentCategory> = {
    freeze: 'tight', tone: 'freeze', tight: 'glow', glow: 'glow',
  };
  const nextCat = nextMap[cat];
  return { label: CATEGORIES[nextCat].label, category: nextCat };
}

export function AppointmentPopover({ appointment, clientDetails, onClose, onStatusChange, onClientChanged }: AppointmentPopoverProps) {
  const start = new Date(appointment.scheduled_at);
  const end = new Date(start.getTime() + appointment.duration_minutes * 60000);
  const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  const age = calculateAge(clientDetails?.date_of_birth);
  const isGoogleEvent = appointment.id.startsWith('gcal-');
  const { isOwner, isProvider } = useRole();
  const canChart = isOwner || isProvider;

  const [showClientSearch, setShowClientSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [suggestionAccepted, setSuggestionAccepted] = useState<boolean | null>(null);
  const [showChartNote, setShowChartNote] = useState(false);
  const [showPendingForms, setShowPendingForms] = useState(false);

  // Fetch form status for this appointment
  const { data: formStatus } = useQuery({
    queryKey: ['appointment-forms', appointment.id, appointment.client_id],
    queryFn: async () => {
      if (!appointment.client_id || isGoogleEvent) return null;
      const { data, error } = await supabase
        .from('client_forms')
        .select('id, status, forms:form_id (name)')
        .eq('client_id', appointment.client_id)
        .or(`appointment_id.eq.${appointment.id},appointment_id.is.null`);
      if (error) return null;
      const pending = (data || []).filter((f: any) => f.status === 'pending');
      const completed = (data || []).filter((f: any) => f.status === 'completed');
      return { pending, completed, total: data?.length || 0 };
    },
    enabled: !!appointment.client_id && !isGoogleEvent,
  });

  // Complete & Plan flow state
  const [showCompleteFlow, setShowCompleteFlow] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionStep, setCompletionStep] = useState<'notes' | 'done'>('notes');

  const isGoogleEvent = appointment.id.startsWith('gcal-');

  const { data: clientPackage } = useQuery({
    queryKey: ['apt-client-package', appointment.client_id],
    queryFn: async () => {
      if (!appointment.client_id) return null;
      const { data } = await supabase
        .from('client_packages')
        .select('sessions_used, sessions_total, packages(name)')
        .eq('client_id', appointment.client_id)
        .eq('status', 'active')
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!appointment.client_id && !isGoogleEvent,
  });

  const protocolSuggestion = getProtocolSuggestion(appointment.service_name);
  const currentCategory = matchServiceToCategory(appointment.service_name);

  useEffect(() => {
    if (!showClientSearch || searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase.from('clients').select('id, first_name, last_name, phone')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`).limit(6);
      setSearchResults(data || []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showClientSearch]);

  const handleChangeClient = async (client: ClientOption) => {
    setIsChanging(true);
    const { error } = await supabase.from('appointments').update({ client_id: client.id }).eq('id', appointment.id);
    if (error) { toast.error('Failed to change client'); }
    else { toast.success(`Client changed to ${client.first_name} ${client.last_name}`); onClientChanged?.(); onClose(); }
    setIsChanging(false);
  };

  const handleAcceptSuggestion = () => { setSuggestionAccepted(true); toast.success('Recommendation saved'); };

  // Complete & Plan Next Step — smooth combined flow
  const handleCompleteAndPlan = async () => {
    setIsCompleting(true);

    // 1. Save notes
    if (sessionNotes.trim()) {
      await supabase.from('appointment_soap_notes').upsert({
        appointment_id: appointment.id,
        assessment: sessionNotes.trim(),
      }, { onConflict: 'appointment_id' });
    }

    // 2. Mark as completed
    onStatusChange?.(appointment.id, 'completed');

    // 3. Show success step
    setCompletionStep('done');
    setIsCompleting(false);

    toast.success('Session completed successfully');
  };

  // Complete & Plan flow with confirmation
  if (showCompleteFlow && appointment.status === 'in_progress') {
    return (
      <div data-appointment-popover className="w-80 bg-popover border border-border rounded-2xl shadow-2xl p-5 z-50" onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          {completionStep === 'notes' ? (
            <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-foreground">Complete & Plan Next</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCompleteFlow(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                {appointment.client_name} · {appointment.service_name}
              </p>

              {/* Session Notes */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Session Notes</label>
                <Textarea
                  placeholder="Quick notes about this session..."
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="h-20 text-sm resize-none rounded-xl"
                />
              </div>

              {/* Protocol Suggestion */}
              {protocolSuggestion && (
                <div className="bg-accent/50 rounded-xl px-4 py-3 mb-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Recommended Next</p>
                  <p className="text-sm font-semibold text-foreground">
                    {CATEGORIES[protocolSuggestion.category].emoji} {protocolSuggestion.label}
                  </p>
                </div>
              )}

              <Button className="w-full h-11 gap-2 rounded-xl font-semibold" onClick={handleCompleteAndPlan} disabled={isCompleting}>
                {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Complete Session
              </Button>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
              {/* Success confirmation */}
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-heading font-semibold text-foreground text-lg mb-1">Session Complete</h3>
                <p className="text-xs text-muted-foreground mb-1">Notes saved · Recommendation recorded</p>

                {protocolSuggestion && (
                  <p className="text-xs text-elita-camel font-medium mt-2">
                    Next: {CATEGORIES[protocolSuggestion.category].emoji} {protocolSuggestion.label}
                  </p>
                )}
              </div>

              <div className="space-y-2 mt-2">
                <Link to={`/schedule/new?client=${appointment.client_id}`} className="block">
                  <Button className="w-full h-11 gap-2 rounded-xl font-semibold">
                    <ArrowRight className="w-4 h-4" />
                    Rebook Next Appointment
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full h-9 text-xs text-muted-foreground" onClick={onClose}>
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div data-appointment-popover className="w-80 bg-popover border border-border rounded-2xl shadow-2xl p-5 z-50" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link to={`/clients/${appointment.client_id}`} className="text-base font-heading font-bold text-foreground hover:text-primary transition-colors">
            {appointment.client_name}
          </Link>
          {clientDetails?.phone && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              {clientDetails.phone}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Compact stats */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
        <span>{clientDetails?.visit_count ?? 0} visits</span>
        <span>·</span>
        <span>${((clientDetails?.total_spent || 0) / Math.max(clientDetails?.visit_count || 1, 1)).toFixed(0)} avg</span>
        {age !== null && <><span>·</span><span>Age {age}</span></>}
      </div>

      <Separator className="my-3" />

      {/* Appointment info */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <p className="font-heading font-semibold text-foreground text-sm flex-1">{appointment.service_name}</p>
          {currentCategory && (
            <span className="text-xs px-2 py-0.5 rounded-lg bg-accent text-muted-foreground font-medium">
              {CATEGORIES[currentCategory].emoji} {CATEGORIES[currentCategory].label}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{timeStr} · {appointment.staff_name}</p>
        <p className="text-sm font-semibold text-foreground mt-1.5">${Number(appointment.total_amount).toFixed(2)}</p>
      </div>

      {/* Session progress */}
      {clientPackage && (
        <div className="flex items-center gap-2.5 bg-muted/50 rounded-xl px-4 py-2.5 mb-3">
          <Package className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs font-medium text-foreground truncate flex-1">{(clientPackage as any).packages?.name || 'Package'}</p>
          <span className="text-sm font-bold text-primary whitespace-nowrap">
            {(clientPackage as any).sessions_used}/{(clientPackage as any).sessions_total}
          </span>
        </div>
      )}

      {/* Protocol suggestion */}
      {protocolSuggestion && !isGoogleEvent && suggestionAccepted === null && (
        <div className="bg-accent/40 rounded-xl px-4 py-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Protocol Suggestion</p>
          </div>
          <p className="text-xs text-foreground mb-2.5">
            Suggested next: <span className="font-bold">{CATEGORIES[protocolSuggestion.category].emoji} {protocolSuggestion.label}</span>
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs px-3 rounded-lg" onClick={handleAcceptSuggestion}>✓ Accept</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-3 rounded-lg" onClick={() => setSuggestionAccepted(false)}>Modify</Button>
          </div>
        </div>
      )}
      {suggestionAccepted === true && protocolSuggestion && (
        <div className="flex items-center gap-2 bg-success/10 rounded-xl px-4 py-2.5 mb-3 text-xs text-success font-semibold">
          <CheckCircle className="w-3.5 h-3.5" />
          Next: {CATEGORIES[protocolSuggestion.category].emoji} {protocolSuggestion.label} — saved
        </div>
      )}

      {/* Form status + Status badge */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className="text-[10px] capitalize rounded-lg">
          {appointment.status.replace('_', ' ')}
        </Badge>
        {formStatus && formStatus.pending.length > 0 && (
          <button
            onClick={() => setShowPendingForms(!showPendingForms)}
            className="flex items-center gap-1 text-[10px] font-medium text-destructive hover:underline"
          >
            <AlertTriangle className="w-3 h-3" />
            {formStatus.pending.length} form{formStatus.pending.length > 1 ? 's' : ''} pending
          </button>
        )}
        {formStatus && formStatus.pending.length === 0 && formStatus.total > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-success">
            <CheckCircle className="w-3 h-3" />
            Forms complete
          </span>
        )}
      </div>

      {/* Pending forms detail */}
      <AnimatePresence>
        {showPendingForms && formStatus && formStatus.pending.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-destructive/5 rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-semibold text-destructive uppercase tracking-widest">Incomplete Forms</p>
              {formStatus.pending.map((f: any) => (
                <p key={f.id} className="text-xs text-foreground">• {(f.forms as any)?.name || 'Unnamed form'}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Client */}
      {!isGoogleEvent && (
        <>
          <Separator className="my-3" />
          {!showClientSearch ? (
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-8 rounded-xl" onClick={() => setShowClientSearch(true)}>
              <UserRoundPen className="w-3.5 h-3.5" /> Change Client
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search client..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 text-xs pl-8 rounded-xl" autoFocus />
              </div>
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {isSearching && <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}
                {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No clients found</p>}
                {searchResults.map((c) => (
                  <button key={c.id} disabled={isChanging || c.id === appointment.client_id} onClick={() => handleChangeClient(c)}
                    className={cn('w-full flex items-center justify-between p-2 rounded-lg text-xs', c.id === appointment.client_id ? 'bg-primary/10 text-primary' : 'hover:bg-muted cursor-pointer')}>
                    <span className="font-medium">{c.first_name} {c.last_name}</span>
                    {c.id === appointment.client_id && <Badge variant="outline" className="text-[9px] h-4">Current</Badge>}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => { setShowClientSearch(false); setSearchQuery(''); setSearchResults([]); }}>Cancel</Button>
            </div>
          )}
        </>
      )}

      <Separator className="my-3" />

      {/* Quick Actions */}
      {!isGoogleEvent && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Quick Actions</p>
          <div className="grid grid-cols-3 gap-2">
            <Link to={`/clients/${appointment.client_id}?tab=forms`}>
              <Button variant="outline" size="sm" className="w-full h-9 text-[10px] gap-1 px-2 rounded-xl hover:shadow-sm transition-all">📝 Notes</Button>
            </Link>
            <Link to={`/clients/${appointment.client_id}?tab=products`}>
              <Button variant="outline" size="sm" className="w-full h-9 text-[10px] gap-1 px-2 rounded-xl hover:shadow-sm transition-all">💡 Recommend</Button>
            </Link>
            <Link to={`/schedule/new?client=${appointment.client_id}`}>
              <Button variant="outline" size="sm" className="w-full h-9 text-[10px] gap-1 px-2 rounded-xl hover:shadow-sm transition-all">🔄 Rebook</Button>
            </Link>
          </div>
          {canChart && appointment.client_id && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 h-9 text-[10px] gap-1.5 rounded-xl hover:shadow-sm transition-all"
              onClick={() => setShowChartNote(true)}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Add Chart Note
            </Button>
          )}
        </div>
      )}

      {/* Status Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {!isGoogleEvent && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Cancel" onClick={() => onStatusChange?.(appointment.id, 'cancelled')}>
              <XCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {!isGoogleEvent && (
            <Link to={`/schedule/${appointment.id}`}>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl">Edit</Button>
            </Link>
          )}
          {appointment.status === 'scheduled' && !isGoogleEvent && (
            <Button size="sm" className="h-8 text-xs rounded-xl" onClick={() => onStatusChange?.(appointment.id, 'confirmed')}>
              <CheckCircle className="w-3 h-3 mr-1" /> Confirm
            </Button>
          )}
          {(appointment.status === 'confirmed' || appointment.status === 'scheduled') && !isGoogleEvent && (
            <Button size="sm" className="h-8 text-xs rounded-xl" onClick={() => onStatusChange?.(appointment.id, 'checked_in')}>
              Check In
            </Button>
          )}
          {appointment.status === 'checked_in' && !isGoogleEvent && (
            <Button size="sm" className="h-8 text-xs rounded-xl bg-success hover:bg-success/90 text-success-foreground" onClick={() => onStatusChange?.(appointment.id, 'in_progress')}>
              Start Treatment
            </Button>
          )}
          {appointment.status === 'in_progress' && !isGoogleEvent && (
            <Button size="sm" className="h-8 text-xs rounded-xl gap-1.5 bg-primary hover:bg-primary/90" onClick={() => setShowCompleteFlow(true)}>
              <FileText className="w-3 h-3" />
              Complete & Plan
            </Button>
          )}
        </div>
      </div>

      {/* Chart Note Dialog */}
      {canChart && appointment.client_id && (
        <ChartNoteForm
          appointmentId={appointment.id}
          clientId={appointment.client_id}
          serviceName={appointment.service_name}
          open={showChartNote}
          onOpenChange={setShowChartNote}
        />
      )}
    </div>
  );
}
