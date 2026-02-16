import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowRight } from 'lucide-react';
import type { ScheduleAppointment } from '@/pages/SchedulePage';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: ScheduleAppointment | null;
  newScheduledAt: Date | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(d: Date, durationMin: number) {
  const end = new Date(d.getTime() + durationMin * 60000);
  const fmt = (dt: Date) => dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  return `${fmt(d)} – ${fmt(end)}`;
}

function formatDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function RescheduleDialog({ open, onOpenChange, appointment, newScheduledAt, onConfirm, isLoading }: RescheduleDialogProps) {
  const [sendConfirmation, setSendConfirmation] = React.useState(true);

  if (!appointment || !newScheduledAt) return null;

  const oldStart = new Date(appointment.scheduled_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Reschedule Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="font-semibold text-lg">{appointment.client_name}</p>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
            {/* Old time */}
            <div className="space-y-1 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium">{appointment.service_name}</p>
              <p className="text-sm text-foreground">{formatDate(oldStart)}</p>
              <p className="text-sm font-semibold text-destructive">{formatTime(oldStart, appointment.duration_minutes)}</p>
              <p className="text-xs text-muted-foreground">({formatDuration(appointment.duration_minutes)})</p>
              {appointment.staff_name && <p className="text-xs text-muted-foreground">{appointment.staff_name}</p>}
              <p className="text-xs text-muted-foreground">(${Number(appointment.total_amount).toFixed(0)})</p>
            </div>

            <div className="flex items-center pt-8">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* New time */}
            <div className="space-y-1 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium">{appointment.service_name}</p>
              <p className="text-sm text-foreground">{formatDate(newScheduledAt)}</p>
              <p className="text-sm font-semibold text-primary">{formatTime(newScheduledAt, appointment.duration_minutes)}</p>
              <p className="text-xs text-muted-foreground">({formatDuration(appointment.duration_minutes)})</p>
              {appointment.staff_name && <p className="text-xs text-muted-foreground">{appointment.staff_name}</p>}
              <p className="text-xs text-muted-foreground">(${Number(appointment.total_amount).toFixed(0)})</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <span className="text-sm text-muted-foreground">Send updated confirmation to:</span>
            <div className="flex items-center gap-2">
              <Checkbox
                id="send-confirm"
                checked={sendConfirmation}
                onCheckedChange={(v) => setSendConfirmation(!!v)}
              />
              <Label htmlFor="send-confirm" className="text-sm font-medium cursor-pointer">Client</Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Rescheduling...' : 'Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
