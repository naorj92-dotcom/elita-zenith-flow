import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CalendarIcon, Upload, Lock, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/UnifiedAuthContext';

const ADVERSE_REACTIONS = [
  { value: 'none', label: 'None' },
  { value: 'mild_bruising', label: 'Mild bruising' },
  { value: 'swelling', label: 'Swelling' },
  { value: 'redness', label: 'Redness' },
  { value: 'headache', label: 'Headache' },
  { value: 'other', label: 'Other' },
];

interface ChartNoteFormProps {
  appointmentId: string;
  clientId: string;
  serviceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChartNoteForm({ appointmentId, clientId, serviceName, open, onOpenChange }: ChartNoteFormProps) {
  const { staff } = useAuth();
  const queryClient = useQueryClient();

  const [servicePerformed, setServicePerformed] = useState(serviceName);
  const [productUsed, setProductUsed] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date>();
  const [amountUnits, setAmountUnits] = useState('');
  const [treatmentAreas, setTreatmentAreas] = useState('');
  const [adverseReaction, setAdverseReaction] = useState('none');
  const [adverseReactionOther, setAdverseReactionOther] = useState('');
  const [providerNotes, setProviderNotes] = useState('');
  const [followupInstructions, setFollowupInstructions] = useState('');
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const providerName = staff ? `${staff.first_name} ${staff.last_name}` : 'Provider';

  // Check if note already exists for this appointment
  const { data: existingNote } = useQuery({
    queryKey: ['chart-note', appointmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('treatment_chart_notes')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  const isLocked = existingNote?.is_locked || 
    (existingNote && new Date(existingNote.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000));

  const uploadPhoto = async (file: File, prefix: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${clientId}/${prefix}_${appointmentId}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('treatment-photos').upload(path, file);
    if (error) { console.error('Upload error:', error); return null; }
    return path;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!staff?.id) throw new Error('No provider');
      setIsUploading(true);

      let beforePhotoUrl = existingNote?.before_photo_url || null;
      let afterPhotoUrl = existingNote?.after_photo_url || null;

      if (beforePhoto) {
        beforePhotoUrl = await uploadPhoto(beforePhoto, 'before');
      }
      if (afterPhoto) {
        afterPhotoUrl = await uploadPhoto(afterPhoto, 'after');
      }

      const noteData = {
        appointment_id: appointmentId,
        client_id: clientId,
        provider_id: staff.id,
        service_performed: servicePerformed,
        product_used: productUsed || null,
        lot_number: lotNumber || null,
        expiration_date: expirationDate ? format(expirationDate, 'yyyy-MM-dd') : null,
        amount_units: amountUnits || null,
        treatment_areas: treatmentAreas || null,
        adverse_reaction: adverseReaction,
        adverse_reaction_other: adverseReaction === 'other' ? adverseReactionOther : null,
        provider_notes: providerNotes || null,
        before_photo_url: beforePhotoUrl,
        after_photo_url: afterPhotoUrl,
        followup_instructions: followupInstructions || null,
        provider_signature: `${providerName}`,
        signed_at: new Date().toISOString(),
      };

      if (existingNote && !isLocked) {
        const { error } = await supabase
          .from('treatment_chart_notes')
          .update(noteData)
          .eq('id', existingNote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('treatment_chart_notes')
          .insert(noteData);
        if (error) throw error;
      }

      // Also create before/after photo entry for the gallery
      if (beforePhotoUrl || afterPhotoUrl) {
        await supabase.from('before_after_photos').upsert({
          client_id: clientId,
          appointment_id: appointmentId,
          before_photo_url: beforePhotoUrl,
          after_photo_url: afterPhotoUrl,
          taken_date: new Date().toISOString(),
          is_visible_to_client: true,
          notes: `Chart note: ${servicePerformed}`,
        }, { onConflict: 'appointment_id' }).select();
      }

      setIsUploading(false);
    },
    onSuccess: () => {
      toast.success('Chart note saved');
      queryClient.invalidateQueries({ queryKey: ['chart-note', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['chart-notes'] });
      onOpenChange(false);
    },
    onError: (e) => {
      setIsUploading(false);
      toast.error('Failed to save chart note');
      console.error(e);
    },
  });

  // Populate form if editing existing note
  React.useEffect(() => {
    if (existingNote) {
      setServicePerformed(existingNote.service_performed);
      setProductUsed(existingNote.product_used || '');
      setLotNumber(existingNote.lot_number || '');
      setExpirationDate(existingNote.expiration_date ? new Date(existingNote.expiration_date) : undefined);
      setAmountUnits(existingNote.amount_units || '');
      setTreatmentAreas(existingNote.treatment_areas || '');
      setAdverseReaction(existingNote.adverse_reaction);
      setAdverseReactionOther(existingNote.adverse_reaction_other || '');
      setProviderNotes(existingNote.provider_notes || '');
      setFollowupInstructions(existingNote.followup_instructions || '');
    }
  }, [existingNote]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : <ShieldCheck className="w-4 h-4 text-primary" />}
            {existingNote ? (isLocked ? 'Chart Note (Locked)' : 'Edit Chart Note') : 'Add Chart Note'}
          </DialogTitle>
        </DialogHeader>

        {isLocked && (
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            This chart note is locked and cannot be edited (created more than 24 hours ago).
          </div>
        )}

        <div className="space-y-4">
          {/* 1. Service performed */}
          <div>
            <Label className="text-xs font-medium">Service Performed</Label>
            <Input value={servicePerformed} onChange={(e) => setServicePerformed(e.target.value)} disabled={isLocked} className="mt-1" />
          </div>

          {/* 2. Product used */}
          <div>
            <Label className="text-xs font-medium">Product Used</Label>
            <Input value={productUsed} onChange={(e) => setProductUsed(e.target.value)} placeholder='e.g. "Botox", "Juvederm Ultra"' disabled={isLocked} className="mt-1" />
          </div>

          {/* 3 & 4. Lot number + Expiration date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Lot Number</Label>
              <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} disabled={isLocked} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" disabled={isLocked} className={cn("w-full justify-start text-left font-normal mt-1 h-9", !expirationDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {expirationDate ? format(expirationDate, 'MMM d, yyyy') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={expirationDate} onSelect={setExpirationDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* 5. Amount / units */}
          <div>
            <Label className="text-xs font-medium">Amount / Units Used</Label>
            <Input value={amountUnits} onChange={(e) => setAmountUnits(e.target.value)} placeholder='e.g. "20 units", "1 syringe"' disabled={isLocked} className="mt-1" />
          </div>

          {/* 6. Treatment areas */}
          <div>
            <Label className="text-xs font-medium">Treatment Areas</Label>
            <Textarea value={treatmentAreas} onChange={(e) => setTreatmentAreas(e.target.value)} placeholder='e.g. "Forehead 10u, Glabella 10u"' rows={3} disabled={isLocked} className="mt-1" />
          </div>

          {/* 7 & 8. Adverse reactions */}
          <div>
            <Label className="text-xs font-medium">Adverse Reactions</Label>
            <Select value={adverseReaction} onValueChange={setAdverseReaction} disabled={isLocked}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADVERSE_REACTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {adverseReaction === 'other' && (
              <Input value={adverseReactionOther} onChange={(e) => setAdverseReactionOther(e.target.value)} placeholder="Describe reaction..." disabled={isLocked} className="mt-2" />
            )}
          </div>

          {/* 9. Provider clinical notes */}
          <div>
            <Label className="text-xs font-medium">Provider Clinical Notes</Label>
            <Textarea value={providerNotes} onChange={(e) => setProviderNotes(e.target.value)} rows={4} disabled={isLocked} className="mt-1" />
          </div>

          {/* 10 & 11. Photo uploads */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Before Photo</Label>
              <div className="mt-1">
                {existingNote?.before_photo_url && !beforePhoto && (
                  <p className="text-[10px] text-success mb-1">✓ Photo attached</p>
                )}
                <label className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer text-xs text-muted-foreground hover:border-primary/50 transition-colors",
                  isLocked && "opacity-50 pointer-events-none"
                )}>
                  <Upload className="w-3.5 h-3.5" />
                  {beforePhoto ? beforePhoto.name.substring(0, 20) : 'Choose file'}
                  <input type="file" accept="image/*" className="hidden" disabled={isLocked}
                    onChange={(e) => setBeforePhoto(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">After Photo</Label>
              <div className="mt-1">
                {existingNote?.after_photo_url && !afterPhoto && (
                  <p className="text-[10px] text-success mb-1">✓ Photo attached</p>
                )}
                <label className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer text-xs text-muted-foreground hover:border-primary/50 transition-colors",
                  isLocked && "opacity-50 pointer-events-none"
                )}>
                  <Upload className="w-3.5 h-3.5" />
                  {afterPhoto ? afterPhoto.name.substring(0, 20) : 'Choose file'}
                  <input type="file" accept="image/*" className="hidden" disabled={isLocked}
                    onChange={(e) => setAfterPhoto(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
          </div>

          {/* 12. Follow-up instructions */}
          <div>
            <Label className="text-xs font-medium">Follow-up Instructions</Label>
            <Textarea value={followupInstructions} onChange={(e) => setFollowupInstructions(e.target.value)} placeholder="Aftercare instructions for the client..." rows={3} disabled={isLocked} className="mt-1" />
          </div>

          {/* 13. Provider signature */}
          <div className="bg-muted/30 rounded-lg px-4 py-3 border border-border/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Provider Signature</p>
            <p className="text-sm font-medium text-foreground">
              {existingNote
                ? `Signed by ${existingNote.provider_signature} on ${format(new Date(existingNote.signed_at), 'MMM d, yyyy \'at\' h:mm a')}`
                : `Signed by ${providerName} on ${format(new Date(), 'MMM d, yyyy \'at\' h:mm a')}`
              }
            </p>
          </div>

          {/* Save button */}
          {!isLocked && (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isUploading || !servicePerformed.trim()}
              className="w-full h-11 font-semibold"
            >
              {(saveMutation.isPending || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {existingNote ? 'Update Chart Note' : 'Save Chart Note'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
