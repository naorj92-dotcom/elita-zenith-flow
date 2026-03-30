import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle2, Clock, User, Sparkles, ArrowLeft, ChevronLeft, AlertTriangle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { FormFieldRenderer, FormField } from '@/components/forms/FormFieldRenderer';
import { SignaturePad } from '@/components/forms/SignaturePad';
import elitaLogo from '@/assets/elita-logo.png';

type KioskScreen = 'welcome' | 'find' | 'confirm' | 'forms' | 'done';

interface KioskAppointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  client_id: string;
  service_id: string;
  client_first_name: string;
  client_last_name: string;
  service_name: string;
  staff_name: string;
}

interface PendingForm {
  id: string;
  form_id: string;
  form_name: string;
  fields: FormField[];
  requires_signature: boolean;
}

export default function CheckInKioskPage() {
  const [screen, setScreen] = useState<KioskScreen>('welcome');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<KioskAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<KioskAppointment | null>(null);
  const [pendingForms, setPendingForms] = useState<PendingForm[]>([]);
  const [formResponses, setFormResponses] = useState<Record<string, Record<string, any>>>({});
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  const fetchTodayAppointments = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('appointments')
      .select(`
        id, scheduled_at, duration_minutes, status, client_id, service_id,
        clients (first_name, last_name),
        services (name),
        staff (first_name, last_name)
      `)
      .gte('scheduled_at', today.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_at', { ascending: true });

    if (data) {
      setAppointments(data.map((apt: any) => ({
        id: apt.id,
        scheduled_at: apt.scheduled_at,
        duration_minutes: apt.duration_minutes,
        status: apt.status,
        client_id: apt.client_id || '',
        service_id: apt.service_id || '',
        client_first_name: apt.clients?.first_name || 'Walk',
        client_last_name: apt.clients?.last_name || 'in',
        service_name: apt.services?.name || 'Service',
        staff_name: apt.staff
          ? `${apt.staff.first_name} ${apt.staff.last_name}`
          : 'Any Provider',
      })));
    }
    setLoading(false);
  }, []);

  // Auto-refresh every 60s on welcome screen
  useEffect(() => {
    fetchTodayAppointments();
    const interval = setInterval(fetchTodayAppointments, 60000);
    return () => clearInterval(interval);
  }, [fetchTodayAppointments]);

  const handleSelectAppointment = async (apt: KioskAppointment) => {
    setSelected(apt);

    // 1. Check service_form_links for any consent forms tied to this service
    //    that haven't been assigned as client_forms yet
    const { data: serviceFormLinks } = await supabase
      .from('service_form_links')
      .select('form_id')
      .eq('service_id', apt.service_id);

    if (serviceFormLinks && serviceFormLinks.length > 0) {
      // Get already-assigned form_ids for this client + appointment
      const { data: existingForms } = await supabase
        .from('client_forms')
        .select('form_id')
        .eq('client_id', apt.client_id)
        .eq('appointment_id', apt.id);

      const existingFormIds = new Set((existingForms || []).map(f => f.form_id));

      // Auto-assign missing service-linked forms
      const missing = serviceFormLinks
        .filter(sfl => !existingFormIds.has(sfl.form_id))
        .map(sfl => ({
          client_id: apt.client_id,
          form_id: sfl.form_id,
          appointment_id: apt.id,
          status: 'pending' as const,
        }));

      if (missing.length > 0) {
        await supabase.from('client_forms').insert(missing);
      }
    }

    // 2. Fetch all pending forms for this client (appointment-linked + general)
    const { data: forms } = await supabase
      .from('client_forms')
      .select('id, form_id, forms(name, fields, requires_signature)')
      .eq('status', 'pending')
      .eq('client_id', apt.client_id)
      .or(`appointment_id.eq.${apt.id},appointment_id.is.null`);

    if (forms && forms.length > 0) {
      const mapped: PendingForm[] = forms.map((cf: any) => ({
        id: cf.id,
        form_id: cf.form_id,
        form_name: cf.forms?.name || 'Form',
        fields: (cf.forms?.fields as FormField[]) || [],
        requires_signature: cf.forms?.requires_signature ?? false,
      }));
      setPendingForms(mapped);
      const initial: Record<string, Record<string, any>> = {};
      mapped.forEach(f => { initial[f.id] = {}; });
      setFormResponses(initial);
    } else {
      setPendingForms([]);
      setFormResponses({});
    }

    setSignatureData(null);
    setScreen('confirm');
  };

  const handleConfirmCheckIn = async () => {
    if (!selected) return;
    setChecking(true);

    try {
      // 1. Update appointment status
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
        .eq('id', selected.id);

      if (error) throw error;

      // 2. Save form responses + signature
      for (const form of pendingForms) {
        const responses = formResponses[form.id] || {};
        const updateData: any = {
          responses,
          status: 'completed',
          signed_at: new Date().toISOString(),
        };
        if (signatureData) {
          updateData.signature_data = signatureData;
        }
        await supabase.from('client_forms').update(updateData).eq('id', form.id);
      }

      // 3. Send staff notification
      const timeStr = format(new Date(selected.scheduled_at), 'h:mm a');
      const clientName = `${selected.client_first_name} ${selected.client_last_name}`;

      // Notify all owners via in_app_notifications
      const { data: owners } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'owner')
        .eq('is_active', true);

      if (owners) {
        const notifications = owners.map(o => ({
          user_id: o.user_id,
          recipient_type: 'staff',
          category: 'check_in',
          title: 'Client Checked In',
          body: `${clientName} has checked in for ${selected.service_name} at ${timeStr}`,
          icon: 'user-check',
          action_url: '/schedule',
          related_entity_type: 'appointment',
          related_entity_id: selected.id,
        }));
        await supabase.from('in_app_notifications').insert(notifications);
      }

      // Also notify assigned provider
      if (selected.staff_name !== 'Any Provider') {
        const { data: staffRole } = await supabase
          .from('user_roles')
          .select('user_id, staff!inner(first_name, last_name)')
          .eq('is_active', true)
          .limit(10);

        // Find the matching staff member
        if (staffRole) {
          const match = staffRole.find((sr: any) =>
            `${sr.staff?.first_name} ${sr.staff?.last_name}` === selected.staff_name
          );
          if (match) {
            await supabase.from('in_app_notifications').insert({
              user_id: match.user_id,
              recipient_type: 'staff',
              category: 'check_in',
              title: 'Client Checked In',
              body: `${clientName} has checked in for ${selected.service_name} at ${timeStr}`,
              icon: 'user-check',
              action_url: '/schedule',
              related_entity_type: 'appointment',
              related_entity_id: selected.id,
            });
          }
        }
      }

      setScreen('done');

      // Auto-return to welcome after 8 seconds
      setTimeout(() => {
        setScreen('welcome');
        setSelected(null);
        setPendingForms([]);
        setFormResponses({});
        setSignatureData(null);
        setSearchQuery('');
        fetchTodayAppointments();
      }, 8000);
    } catch {
      toast.error('Check-in failed. Please see the front desk.');
    } finally {
      setChecking(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${apt.client_first_name} ${apt.client_last_name}`.toLowerCase();
    return name.includes(q);
  });

  // SCREEN 1 — Welcome
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 select-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8 max-w-lg"
        >
          <img src={elitaLogo} alt="Elita Medical Spa" className="h-16 object-contain mx-auto" />
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground leading-tight">
            Welcome to Elita Medical Spa
          </h1>
          <p className="text-lg text-muted-foreground">
            Tap below to check in for your appointment
          </p>
          <Button
            size="lg"
            className="h-20 px-16 text-xl rounded-2xl gap-3"
            onClick={() => { setScreen('find'); setLoading(true); fetchTodayAppointments(); }}
          >
            <User className="w-7 h-7" />
            Check In
          </Button>
        </motion.div>
      </div>
    );
  }

  // SCREEN 4 — Done
  if (screen === 'done') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8 select-none">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-28 h-28 rounded-full bg-success/15 flex items-center justify-center mx-auto"
          >
            <CheckCircle2 className="w-14 h-14 text-success" />
          </motion.div>
          <h1 className="text-3xl font-heading font-bold text-foreground">You're Checked In!</h1>
          <p className="text-lg text-muted-foreground">
            {selected?.staff_name} will be with you shortly.
          </p>
          <div className="p-5 rounded-2xl bg-muted/40 text-sm">
            <p className="font-semibold text-foreground">{selected?.service_name}</p>
            <p className="text-muted-foreground mt-1">
              {selected && format(new Date(selected.scheduled_at), 'h:mm a')}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // SCREEN 3 — Confirm appointment
  if (screen === 'confirm' && selected) {
    const hasForms = pendingForms.length > 0;

    return (
      <div className="min-h-screen bg-background p-6 md:p-10 select-none">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setScreen('find')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              Hi {selected.client_first_name}!
            </h1>
            <p className="text-muted-foreground mb-8">Confirm your appointment:</p>

            <Card className="mb-8">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground text-lg">{selected.service_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {format(new Date(selected.scheduled_at), 'h:mm a')} · {selected.duration_minutes} min
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">{selected.staff_name}</span>
                </div>
              </CardContent>
            </Card>

            {hasForms ? (
              <Button
                size="lg"
                className="w-full h-16 text-lg rounded-2xl gap-3"
                onClick={() => setScreen('forms')}
              >
                <FileText className="w-6 h-6" />
                Continue — Complete Forms ({pendingForms.length})
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full h-16 text-lg rounded-2xl"
                onClick={handleConfirmCheckIn}
                disabled={checking}
              >
                {checking ? 'Checking in…' : 'Confirm Check-In'}
              </Button>
            )}

            {hasForms && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                {pendingForms.length} form{pendingForms.length > 1 ? 's' : ''} required before check-in
              </p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // SCREEN 3b — Forms
  if (screen === 'forms' && selected) {
    const anySignature = pendingForms.some(f => f.requires_signature);

    const formsComplete = pendingForms.every(form => {
      const responses = formResponses[form.id] || {};
      return form.fields
        .filter(f => f.required)
        .every(f => {
          const val = responses[f.id];
          return val !== undefined && val !== null && val !== '';
        });
    });
    const signatureComplete = !anySignature || !!signatureData;
    const canCheckIn = formsComplete && signatureComplete;

    const completedFormCount = pendingForms.filter(form => {
      const responses = formResponses[form.id] || {};
      return form.fields
        .filter(f => f.required)
        .every(f => {
          const val = responses[f.id];
          return val !== undefined && val !== null && val !== '';
        });
    }).length;

    return (
      <div className="min-h-screen bg-background p-6 md:p-10 select-none">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setScreen('confirm')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Appointment</span>
          </button>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-heading font-bold text-foreground">
                📋 Please Complete Your Forms
              </h1>
            </div>
            <p className="text-muted-foreground mb-8">
              These forms are required before we can check you in for <span className="font-medium text-foreground">{selected.service_name}</span>.
            </p>

            <div className="space-y-6 mb-8">
              {/* Progress indicator */}
              <div className="flex items-center gap-3 px-1">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedFormCount / pendingForms.length) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {completedFormCount}/{pendingForms.length} complete
                </span>
              </div>

              {pendingForms.map(form => {
                const responses = formResponses[form.id] || {};
                const thisFormComplete = form.fields.filter(f => f.required).every(f => {
                  const val = responses[f.id];
                  return val !== undefined && val !== null && val !== '';
                });
                const isExpanded = activeFormId === form.id;

                return (
                  <Card key={form.id} className={thisFormComplete ? 'border-success/30' : ''}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <h3 className="font-semibold text-foreground">{form.form_name}</h3>
                        </div>
                        {thisFormComplete ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-success">
                            <CheckCircle2 className="w-4 h-4" /> Complete
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant={isExpanded ? 'secondary' : 'default'}
                            onClick={() => setActiveFormId(isExpanded ? null : form.id)}
                          >
                            {isExpanded ? 'Collapse' : 'Fill Now'}
                          </Button>
                        )}
                      </div>

                      <AnimatePresence>
                        {isExpanded && !thisFormComplete && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-4 pt-5 border-t mt-4">
                              {form.fields.map(field => (
                                <FormFieldRenderer
                                  key={field.id}
                                  field={field}
                                  value={formResponses[form.id]?.[field.id]}
                                  onChange={(val) =>
                                    setFormResponses(prev => ({
                                      ...prev,
                                      [form.id]: { ...prev[form.id], [field.id]: val },
                                    }))
                                  }
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                );
              })}

              {anySignature && (
                <Card className={signatureData ? 'border-success/30' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-foreground">Signature</h3>
                      {signatureData ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-success">
                          <CheckCircle2 className="w-4 h-4" /> Signed
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-destructive">Required</span>
                      )}
                    </div>
                    <SignaturePad onSignatureChange={setSignatureData} />
                  </CardContent>
                </Card>
              )}
            </div>

            <Button
              size="lg"
              className="w-full h-16 text-lg rounded-2xl"
              onClick={handleConfirmCheckIn}
              disabled={checking || !canCheckIn}
            >
              {checking ? 'Checking in…' : !canCheckIn ? 'Complete All Forms to Check In' : '✅ Submit Forms & Check In'}
            </Button>
            {!canCheckIn && (
              <p className="text-xs text-destructive text-center mt-2">
                Please fill in all required fields{anySignature && !signatureData ? ' and sign' : ''} above
              </p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // SCREEN 2 — Find appointment
  return (
    <div className="min-h-screen bg-background p-6 md:p-10 select-none">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setScreen('welcome')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <img src={elitaLogo} alt="Logo" className="h-8 object-contain" />
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Find Your Appointment</h1>
          <p className="text-muted-foreground">Tap your name below to check in</p>
        </motion.div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search your name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-12 h-14 text-lg rounded-xl"
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {filteredAppointments.map((apt, i) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  className="cursor-pointer hover:border-primary/30 active:scale-[0.98] transition-all"
                  onClick={() => handleSelectAppointment(apt)}
                >
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground">
                        {apt.client_first_name} {apt.client_last_name.charAt(0)}.
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(apt.scheduled_at), 'h:mm a')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          {apt.service_name}
                        </span>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {!loading && filteredAppointments.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">No matching appointments found</p>
              <p className="text-sm mt-1">Please check with the front desk for assistance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
