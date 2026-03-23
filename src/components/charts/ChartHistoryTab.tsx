import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronDown, Lock, FileText, Camera } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { SignedImage } from '@/components/photos/SignedImage';
import { EmptyState } from '@/components/shared/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';

const REACTION_LABELS: Record<string, string> = {
  none: 'None',
  mild_bruising: 'Mild bruising',
  swelling: 'Swelling',
  redness: 'Redness',
  headache: 'Headache',
  other: 'Other',
};

export function ChartHistoryTab({ clientId }: { clientId: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: chartNotes = [], isLoading } = useQuery({
    queryKey: ['chart-notes', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_chart_notes')
        .select('*, staff:provider_id(first_name, last_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (chartNotes.length === 0) {
    return <EmptyState icon={FileText} title="No chart notes" description="Treatment chart notes will appear here once created by a provider." compact />;
  }

  return (
    <div className="space-y-3">
      {chartNotes.map((note: any) => {
        const isExpanded = expandedId === note.id;
        const isLocked = note.is_locked || differenceInHours(new Date(), new Date(note.created_at)) >= 24;
        const providerName = note.staff ? `${note.staff.first_name} ${note.staff.last_name}` : 'Provider';

        return (
          <Card key={note.id} className="overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : note.id)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-foreground truncate">{note.service_performed}</p>
                  {isLocked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(note.created_at), 'MMM d, yyyy')} · {providerName}
                  {note.product_used && ` · ${note.product_used}`}
                  {note.amount_units && ` · ${note.amount_units}`}
                </p>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <CardContent className="pt-0 pb-4 px-4 space-y-3 border-t border-border/30">
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {note.product_used && (
                        <DetailRow label="Product" value={note.product_used} />
                      )}
                      {note.lot_number && (
                        <DetailRow label="Lot #" value={note.lot_number} />
                      )}
                      {note.expiration_date && (
                        <DetailRow label="Expiration" value={format(new Date(note.expiration_date), 'MMM d, yyyy')} />
                      )}
                      {note.amount_units && (
                        <DetailRow label="Amount/Units" value={note.amount_units} />
                      )}
                    </div>

                    {note.treatment_areas && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Treatment Areas</p>
                        <p className="text-xs text-foreground whitespace-pre-wrap">{note.treatment_areas}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Adverse Reactions</p>
                      <Badge variant={note.adverse_reaction === 'none' ? 'secondary' : 'destructive'} className="text-xs">
                        {REACTION_LABELS[note.adverse_reaction] || note.adverse_reaction}
                      </Badge>
                      {note.adverse_reaction === 'other' && note.adverse_reaction_other && (
                        <p className="text-xs text-foreground mt-1">{note.adverse_reaction_other}</p>
                      )}
                    </div>

                    {note.provider_notes && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Clinical Notes</p>
                        <p className="text-xs text-foreground whitespace-pre-wrap">{note.provider_notes}</p>
                      </div>
                    )}

                    {(note.before_photo_url || note.after_photo_url) && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          <Camera className="w-3 h-3 inline mr-1" />Photos
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {note.before_photo_url && (
                            <div>
                              <p className="text-[9px] text-muted-foreground mb-1">Before</p>
                            <SignedImage src={note.before_photo_url} alt="Before" className="rounded-lg w-full aspect-square object-cover" />
                            </div>
                          )}
                          {note.after_photo_url && (
                            <div>
                              <p className="text-[9px] text-muted-foreground mb-1">After</p>
                              <SignedImage bucket="treatment-photos" path={note.after_photo_url} alt="After" className="rounded-lg w-full aspect-square object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {note.followup_instructions && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Follow-up Instructions</p>
                        <p className="text-xs text-foreground whitespace-pre-wrap">{note.followup_instructions}</p>
                      </div>
                    )}

                    <div className="bg-muted/30 rounded-lg px-3 py-2 text-[11px] text-muted-foreground">
                      Signed by {note.provider_signature} on {format(new Date(note.signed_at), 'MMM d, yyyy \'at\' h:mm a')}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground font-medium">{value}</p>
    </div>
  );
}
