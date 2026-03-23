import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  FileText,
  ClipboardCheck,
  FileSignature,
  Scroll,
  Check,
  Clock,
  AlertCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { FormFieldRenderer, FormField } from '@/components/forms/FormFieldRenderer';
import { CelebrationOverlay } from '@/components/shared/CelebrationOverlay';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type FormType = 'intake' | 'consent' | 'contract' | 'custom';
type FormStatus = 'pending' | 'completed' | 'expired' | 'draft';

interface ClientForm {
  id: string;
  form_id: string;
  status: FormStatus;
  responses: Record<string, any>;
  signature_data: string | null;
  signed_at: string | null;
  created_at: string;
  forms: {
    id: string;
    name: string;
    description: string | null;
    form_type: FormType;
    fields: FormField[];
    requires_signature: boolean;
  };
}

const FORM_TYPE_ICONS: Record<FormType, React.ReactNode> = {
  intake: <ClipboardCheck className="w-5 h-5" />,
  consent: <FileSignature className="w-5 h-5" />,
  contract: <Scroll className="w-5 h-5" />,
  custom: <FileText className="w-5 h-5" />,
};

const FORM_TYPE_COLORS: Record<FormType, string> = {
  intake: 'bg-blue-500/10 text-blue-500',
  consent: 'bg-amber-500/10 text-amber-500',
  contract: 'bg-purple-500/10 text-purple-500',
  custom: 'bg-emerald-500/10 text-emerald-500',
};

export function ClientFormsPage() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState<ClientForm | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCelebration, setShowCelebration] = useState(false);

  // Fetch client forms
  const { data: clientForms = [], isLoading } = useQuery({
    queryKey: ['client-forms', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from('client_forms')
        .select(`
          *,
          forms:form_id (
            id, name, description, form_type, fields, requires_signature
          )
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        forms: {
          ...item.forms,
          fields: ((item.forms as any)?.fields || []) as FormField[],
        },
      })) as unknown as ClientForm[];
    },
    enabled: !!client?.id,
  });

  // Progress calculation
  const formProgress = useMemo(() => {
    if (!selectedForm) return 0;
    const fields = selectedForm.forms.fields || [];
    if (fields.length === 0) return 100;
    const totalItems = fields.length + (selectedForm.forms.requires_signature ? 1 : 0);
    let filled = 0;
    fields.forEach(f => {
      const v = responses[f.id];
      if (f.type === 'checkbox' && v) filled++;
      else if (f.type !== 'checkbox' && v && String(v).trim()) filled++;
    });
    if (selectedForm.forms.requires_signature && signatureData) filled++;
    return Math.round((filled / totalItems) * 100);
  }, [selectedForm, responses, signatureData]);

  // Submit form mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedForm) return;
      const { error } = await supabase
        .from('client_forms')
        .update({
          responses,
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          status: 'completed' as any,
        })
        .eq('id', selectedForm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-forms'] });
      queryClient.invalidateQueries({ queryKey: ['client-pending-forms-count'] });
      setShowCelebration(true);
      toast.success('Form submitted successfully!');
      setTimeout(() => handleCloseForm(), 1500);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit form');
    },
  });

  const handleOpenForm = (form: ClientForm) => {
    setSelectedForm(form);
    setResponses(form.responses || {});
    setSignatureData(form.signature_data);
    setFieldErrors({});
  };

  const handleCloseForm = () => {
    setSelectedForm(null);
    setResponses({});
    setSignatureData(null);
    setFieldErrors({});
  };

  const validate = (): boolean => {
    if (!selectedForm) return false;
    const errors: Record<string, string> = {};
    const fields = selectedForm.forms.fields || [];

    for (const field of fields) {
      if (!field.required) continue;
      const value = responses[field.id];

      if (field.type === 'checkbox' && !value) {
        errors[field.id] = 'This must be accepted';
      } else if (field.type === 'email' && value) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[field.id] = 'Enter a valid email address';
        }
      } else if (field.type !== 'checkbox' && (!value || !String(value).trim())) {
        errors[field.id] = 'This field is required';
      }
    }

    if (selectedForm.forms.requires_signature && !signatureData) {
      errors['__signature'] = 'Please provide your signature';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fill in all required fields');
      return;
    }
    submitMutation.mutate();
  };

  const pendingForms = clientForms.filter(f => f.status === 'pending');
  const completedForms = clientForms.filter(f => f.status === 'completed');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">My Forms</h1>
          <p className="text-muted-foreground">Loading your forms...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CelebrationOverlay show={showCelebration} onComplete={() => setShowCelebration(false)} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">My Forms</h1>
        <p className="text-sm text-muted-foreground">Complete your forms, consents, and contracts</p>
      </div>

      {/* Pending Forms */}
      {pendingForms.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Action Required ({pendingForms.length})
          </h2>
          <div className="space-y-2">
            {pendingForms.map((form, index) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => handleOpenForm(form)}
                  className="w-full text-left p-4 rounded-xl border border-amber-500/30 bg-card hover:border-primary/50 hover:shadow-sm transition-all flex items-center gap-4"
                >
                  <div className={cn("p-2.5 rounded-lg shrink-0", FORM_TYPE_COLORS[form.forms.form_type])}>
                    {FORM_TYPE_ICONS[form.forms.form_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{form.forms.name}</p>
                    {form.forms.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{form.forms.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{form.forms.fields?.length || 0} fields</span>
                      {form.forms.requires_signature && (
                        <span className="flex items-center gap-1">
                          <FileSignature className="w-3 h-3" /> Signature
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-500 border-none shrink-0">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Forms */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          Completed ({completedForms.length})
        </h2>
        {completedForms.length > 0 ? (
          <div className="space-y-2">
            {completedForms.map((form, index) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => handleOpenForm(form)}
                  className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all flex items-center gap-4"
                >
                  <div className="p-2.5 rounded-lg bg-success/10 text-success shrink-0">
                    {FORM_TYPE_ICONS[form.forms.form_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{form.forms.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Signed {form.signed_at ? format(new Date(form.signed_at), 'MMMM d, yyyy') : ''}
                    </p>
                  </div>
                  <Badge className="bg-success/10 text-success border-none shrink-0">
                    <Check className="w-3 h-3 mr-1" />
                    Done
                  </Badge>
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No completed forms yet</p>
          </Card>
        )}
      </div>

      {/* Empty State */}
      {clientForms.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <FileText className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No Forms Assigned</h3>
          <p className="text-sm text-muted-foreground">
            You don't have any forms to complete at this time.
          </p>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={!!selectedForm} onOpenChange={() => handleCloseForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
          {/* Header with progress */}
          <div className="border-b border-border">
            <DialogHeader className="p-5 pb-3">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", selectedForm ? FORM_TYPE_COLORS[selectedForm.forms.form_type] : '')}>
                  {selectedForm && FORM_TYPE_ICONS[selectedForm.forms.form_type]}
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-base">{selectedForm?.forms.name}</DialogTitle>
                  {selectedForm?.forms.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedForm.forms.description}</p>
                  )}
                </div>
                {selectedForm?.status === 'completed' && (
                  <Badge className="bg-success/10 text-success border-none">
                    <Check className="w-3 h-3 mr-1" /> Complete
                  </Badge>
                )}
              </div>
            </DialogHeader>
            {selectedForm?.status === 'pending' && (
              <div className="px-5 pb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Progress</span>
                  <span>{formProgress}%</span>
                </div>
                <Progress value={formProgress} className="h-1.5" />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-5 p-5">
                {selectedForm?.forms.fields?.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <FormFieldRenderer
                      field={field}
                      value={responses[field.id]}
                      onChange={(value) => {
                        setResponses(prev => ({ ...prev, [field.id]: value }));
                        if (fieldErrors[field.id]) {
                          setFieldErrors(prev => { const n = { ...prev }; delete n[field.id]; return n; });
                        }
                      }}
                      disabled={selectedForm.status === 'completed'}
                      error={fieldErrors[field.id]}
                    />
                  </motion.div>
                ))}

                {/* Signature */}
                {selectedForm?.forms.requires_signature && (
                  <div className="space-y-2 pt-4 border-t border-border">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
                      <FileSignature className="w-4 h-4 text-primary" />
                      Signature
                      <span className="text-destructive">*</span>
                    </h3>
                    {selectedForm.status === 'completed' && selectedForm.signature_data ? (
                      <div className="border border-border rounded-lg p-4 bg-muted/30">
                        <img src={selectedForm.signature_data} alt="Signature" className="max-h-24" />
                        <p className="text-xs text-muted-foreground mt-2">
                          Signed on {format(new Date(selectedForm.signed_at!), 'MMMM d, yyyy at h:mm a')}
                        </p>
                      </div>
                    ) : (
                      <>
                        <SignaturePad
                          onSignatureChange={(data) => {
                            setSignatureData(data);
                            if (fieldErrors['__signature']) {
                              setFieldErrors(prev => { const n = { ...prev }; delete n['__signature']; return n; });
                            }
                          }}
                          initialSignature={signatureData}
                          disabled={selectedForm.status === 'completed'}
                        />
                        {fieldErrors['__signature'] && (
                          <p className="text-xs text-destructive">{fieldErrors['__signature']}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-5 pt-4 border-t border-border gap-2">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                {selectedForm?.status === 'completed' ? 'Close' : 'Cancel'}
              </Button>
              {selectedForm?.status === 'pending' && (
                <Button type="submit" disabled={submitMutation.isPending} className="gap-2">
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Submit Form
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
