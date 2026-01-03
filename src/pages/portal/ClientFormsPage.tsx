import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  FileText, 
  ClipboardCheck,
  FileSignature,
  Scroll,
  Check,
  Clock,
  AlertCircle
} from 'lucide-react';
import { FormFieldRenderer, FormField } from '@/components/forms/FormFieldRenderer';
import { SignaturePad } from '@/components/forms/SignaturePad';
import { format } from 'date-fns';

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

const STATUS_CONFIG: Record<FormStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, color: 'bg-amber-500/10 text-amber-500', label: 'Pending' },
  completed: { icon: <Check className="w-4 h-4" />, color: 'bg-success/10 text-success', label: 'Completed' },
  expired: { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-destructive/10 text-destructive', label: 'Expired' },
  draft: { icon: <FileText className="w-4 h-4" />, color: 'bg-muted text-muted-foreground', label: 'Draft' },
};

// Demo data for client forms
const DEMO_CLIENT_FORMS: ClientForm[] = [
  {
    id: 'demo-cf-1',
    form_id: 'demo-form-1',
    status: 'pending',
    responses: {},
    signature_data: null,
    signed_at: null,
    created_at: new Date().toISOString(),
    forms: {
      id: 'demo-form-1',
      name: 'New Client Intake Form',
      description: 'Complete health history and personal information',
      form_type: 'intake',
      fields: [
        { id: 'emergency_contact', type: 'text', label: 'Emergency Contact Name', required: true },
        { id: 'emergency_phone', type: 'text', label: 'Emergency Contact Phone', required: true },
        { id: 'allergies', type: 'textarea', label: 'Known Allergies', required: false },
        { id: 'medications', type: 'textarea', label: 'Current Medications', required: false },
        { id: 'medical_conditions', type: 'textarea', label: 'Medical Conditions', required: false },
      ],
      requires_signature: true,
    },
  },
  {
    id: 'demo-cf-2',
    form_id: 'demo-form-2',
    status: 'pending',
    responses: {},
    signature_data: null,
    signed_at: null,
    created_at: new Date().toISOString(),
    forms: {
      id: 'demo-form-2',
      name: 'Botox Consent Form',
      description: 'Informed consent for Botox treatment',
      form_type: 'consent',
      fields: [
        { id: 'understand_risks', type: 'checkbox', label: 'I understand the risks and potential side effects of Botox treatment', required: true },
        { id: 'no_pregnancy', type: 'checkbox', label: 'I confirm I am not pregnant or breastfeeding', required: true },
        { id: 'disclosed_medications', type: 'checkbox', label: 'I have disclosed all medications and supplements I am taking', required: true },
      ],
      requires_signature: true,
    },
  },
  {
    id: 'demo-cf-3',
    form_id: 'demo-form-3',
    status: 'completed',
    responses: { accept_policies: true, photo_consent: true, hipaa_acknowledgment: true },
    signature_data: 'data:image/png;base64,demo',
    signed_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    forms: {
      id: 'demo-form-3',
      name: 'Service Agreement',
      description: 'General terms and conditions',
      form_type: 'contract',
      fields: [
        { id: 'accept_policies', type: 'checkbox', label: 'I accept the cancellation and refund policies', required: true },
        { id: 'photo_consent', type: 'checkbox', label: 'I consent to before/after photos for my records', required: true },
        { id: 'hipaa_acknowledgment', type: 'checkbox', label: 'I acknowledge receipt of HIPAA privacy practices', required: true },
      ],
      requires_signature: true,
    },
  },
];

export function ClientFormsPage() {
  const { client, isDemo } = useClientAuth();
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState<ClientForm | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [signatureData, setSignatureData] = useState<string | null>(null);

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
            id,
            name,
            description,
            form_type,
            fields,
            requires_signature
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
    enabled: !!client?.id && !isDemo,
  });

  const displayForms = isDemo ? DEMO_CLIENT_FORMS : clientForms;

  // Submit form mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedForm || isDemo) return;

      const { error } = await supabase
        .from('client_forms')
        .update({
          responses,
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', selectedForm.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-forms'] });
      toast.success('Form submitted successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit form');
    },
  });

  const handleOpenForm = (form: ClientForm) => {
    setSelectedForm(form);
    setResponses(form.responses || {});
    setSignatureData(form.signature_data);
  };

  const handleCloseForm = () => {
    setSelectedForm(null);
    setResponses({});
    setSignatureData(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedForm) return;

    // Validate required fields
    const fields = selectedForm.forms.fields || [];
    for (const field of fields) {
      if (field.required) {
        const value = responses[field.id];
        if (field.type === 'checkbox' && !value) {
          toast.error(`Please accept: ${field.label}`);
          return;
        }
        if (field.type !== 'checkbox' && (!value || !value.toString().trim())) {
          toast.error(`Please fill in: ${field.label}`);
          return;
        }
      }
    }

    // Validate signature
    if (selectedForm.forms.requires_signature && !signatureData) {
      toast.error('Please provide your signature');
      return;
    }

    if (isDemo) {
      toast.success('Form submitted (demo mode)');
      handleCloseForm();
      return;
    }

    submitMutation.mutate();
  };

  const pendingForms = displayForms.filter(f => f.status === 'pending');
  const completedForms = displayForms.filter(f => f.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      {isDemo && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <p className="text-amber-500 text-sm font-medium">
            Demo Mode - Form submissions will not be saved
          </p>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold">My Forms</h1>
        <p className="text-muted-foreground">View and complete your forms, consents, and contracts</p>
      </div>

      {/* Pending Forms */}
      {pendingForms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Action Required ({pendingForms.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingForms.map((form, index) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:border-primary transition-colors border-amber-500/30"
                  onClick={() => handleOpenForm(form)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                        {FORM_TYPE_ICONS[form.forms.form_type]}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{form.forms.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {form.forms.description}
                        </CardDescription>
                      </div>
                      <Badge className={STATUS_CONFIG[form.status].color}>
                        {STATUS_CONFIG[form.status].icon}
                        <span className="ml-1">{STATUS_CONFIG[form.status].label}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{form.forms.fields?.length || 0} fields</span>
                      {form.forms.requires_signature && (
                        <span className="flex items-center gap-1">
                          <FileSignature className="w-4 h-4" />
                          Signature required
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Forms */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Check className="w-5 h-5 text-success" />
          Completed Forms ({completedForms.length})
        </h2>
        {completedForms.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {completedForms.map((form, index) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleOpenForm(form)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-success/10 text-success">
                        {FORM_TYPE_ICONS[form.forms.form_type]}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{form.forms.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Signed on {format(new Date(form.signed_at!), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <Badge className={STATUS_CONFIG[form.status].color}>
                        {STATUS_CONFIG[form.status].icon}
                        <span className="ml-1">{STATUS_CONFIG[form.status].label}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No completed forms yet</p>
          </Card>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={!!selectedForm} onOpenChange={() => handleCloseForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              {selectedForm && FORM_TYPE_ICONS[selectedForm.forms.form_type]}
              {selectedForm?.forms.name}
            </DialogTitle>
            {selectedForm?.forms.description && (
              <p className="text-sm text-muted-foreground">
                {selectedForm.forms.description}
              </p>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <ScrollArea className="max-h-[60vh] px-6">
              <div className="space-y-6 py-4">
                {/* Form Fields */}
                {selectedForm?.forms.fields?.map((field) => (
                  <FormFieldRenderer
                    key={field.id}
                    field={field}
                    value={responses[field.id]}
                    onChange={(value) => setResponses({ ...responses, [field.id]: value })}
                    disabled={selectedForm.status === 'completed'}
                  />
                ))}

                {/* Signature */}
                {selectedForm?.forms.requires_signature && (
                  <div className="space-y-2 pt-4 border-t">
                    <h3 className="font-medium flex items-center gap-2">
                      <FileSignature className="w-4 h-4" />
                      Signature
                    </h3>
                    {selectedForm.status === 'completed' && selectedForm.signature_data ? (
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <img 
                          src={selectedForm.signature_data} 
                          alt="Signature" 
                          className="max-h-24"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Signed on {format(new Date(selectedForm.signed_at!), 'MMMM d, yyyy at h:mm a')}
                        </p>
                      </div>
                    ) : (
                      <SignaturePad
                        onSignatureChange={setSignatureData}
                        initialSignature={signatureData}
                        disabled={selectedForm.status === 'completed'}
                      />
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                {selectedForm?.status === 'completed' ? 'Close' : 'Cancel'}
              </Button>
              {selectedForm?.status === 'pending' && (
                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Form'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {displayForms.length === 0 && !isLoading && (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Forms Assigned</h3>
          <p className="text-muted-foreground">
            You don't have any forms to complete at this time.
          </p>
        </Card>
      )}
    </div>
  );
}
