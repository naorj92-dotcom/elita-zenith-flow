import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedImage } from '@/components/photos/SignedImage';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface TimelineVisit {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  total_amount: number;
  status: string;
  services?: { name?: string; category?: string } | null;
  staff?: { first_name?: string; last_name?: string } | null;
  chartNote?: {
    followup_instructions?: string | null;
    before_photo_url?: string | null;
    after_photo_url?: string | null;
  } | null;
  journeyStage?: string | null;
  pointsEarned?: number;
}

interface VisitTimelineProps {
  visits: TimelineVisit[];
}

function VisitCard({ visit }: { visit: TimelineVisit }) {
  const [careOpen, setCareOpen] = useState(false);
  const [photoDialog, setPhotoDialog] = useState<string | null>(null);

  const providerName = visit.staff
    ? `${visit.staff.first_name} ${visit.staff.last_name}`
    : null;

  const hasPhotos = visit.chartNote?.before_photo_url || visit.chartNote?.after_photo_url;
  const hasAftercare = visit.chartNote?.followup_instructions;

  return (
    <>
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-heading text-lg font-semibold text-foreground leading-tight">
              {visit.services?.name || 'Appointment'}
            </h3>
            {providerName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                with {providerName}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            {visit.total_amount > 0 && (
              <p className="text-sm font-semibold text-foreground">
                ${visit.total_amount}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {visit.duration_minutes} min
            </p>
          </div>
        </div>

        {/* Stage badge */}
        {visit.journeyStage && (
          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
              <Sparkles className="w-3 h-3" />
              {visit.journeyStage}
            </span>
          </div>
        )}

        {/* Before/After photos */}
        {hasPhotos && (
          <div className="flex items-center gap-2 mt-3">
            {visit.chartNote?.before_photo_url && (
              <button
                onClick={() => setPhotoDialog(visit.chartNote!.before_photo_url!)}
                className="w-14 h-14 rounded-lg overflow-hidden border border-border/40 hover:ring-2 hover:ring-primary/30 transition-all"
              >
                <SignedImage
                  src={visit.chartNote.before_photo_url}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
              </button>
            )}
            {visit.chartNote?.after_photo_url && (
              <button
                onClick={() => setPhotoDialog(visit.chartNote!.after_photo_url!)}
                className="w-14 h-14 rounded-lg overflow-hidden border border-border/40 hover:ring-2 hover:ring-primary/30 transition-all"
              >
                <SignedImage
                  src={visit.chartNote.after_photo_url}
                  alt="After"
                  className="w-full h-full object-cover"
                />
              </button>
            )}
          </div>
        )}

        {/* Aftercare notes */}
        {hasAftercare && (
          <div className="mt-3 border-t border-border/30 pt-2">
            <button
              onClick={() => setCareOpen(!careOpen)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              {careOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Care Notes
            </button>
            {careOpen && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed pl-5">
                {visit.chartNote!.followup_instructions}
              </p>
            )}
          </div>
        )}

        {/* Points */}
        {(visit.pointsEarned ?? 0) > 0 && (
          <div className="flex justify-end mt-3">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
              +{visit.pointsEarned} pts
            </span>
          </div>
        )}
      </div>

      {/* Photo full-screen dialog */}
      <Dialog open={!!photoDialog} onOpenChange={() => setPhotoDialog(null)}>
        <DialogContent className="max-w-lg p-2 bg-black/90 border-none">
          {photoDialog && (
            <SignedImage
              bucket="treatment-photos"
              path={photoDialog}
              alt="Treatment photo"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function VisitTimeline({ visits }: VisitTimelineProps) {
  // Group by year
  const grouped = visits.reduce<Record<string, TimelineVisit[]>>((acc, v) => {
    const year = new Date(v.scheduled_at).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(v);
    return acc;
  }, {});

  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-8">
      {years.map((year) => (
        <div key={year}>
          {/* Year divider */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-sm font-heading font-bold text-muted-foreground tracking-wide">
              {year}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Timeline entries */}
          <div className="relative pl-8">
            {/* Vertical line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

            <div className="space-y-6">
              {grouped[year].map((visit) => (
                <div key={visit.id} className="relative">
                  {/* Circle on the line */}
                  <div className="absolute -left-8 top-3 flex flex-col items-center">
                    <div className="w-[18px] h-[18px] rounded-full border-2 border-primary/50 bg-card flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary/70" />
                    </div>
                  </div>

                  {/* Date pill */}
                  <div className="mb-2">
                    <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
                      {format(new Date(visit.scheduled_at), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Visit card */}
                  <VisitCard visit={visit} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
