import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, X, CheckCircle, XCircle, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ScheduleAppointment } from '@/pages/SchedulePage';

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

export function AppointmentPopover({ appointment, clientDetails, onClose, onStatusChange }: AppointmentPopoverProps) {
  const start = new Date(appointment.scheduled_at);
  const end = new Date(start.getTime() + appointment.duration_minutes * 60000);
  const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  const age = calculateAge(clientDetails?.date_of_birth);
  const avgVisit = clientDetails && clientDetails.visit_count && clientDetails.visit_count > 0
    ? (clientDetails.total_spent || 0) / clientDetails.visit_count
    : 0;

  return (
    <div data-appointment-popover className="w-80 bg-popover border border-border rounded-xl shadow-xl p-4 z-50" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link to={`/clients/${appointment.id}`} className="text-base font-bold text-foreground hover:text-primary transition-colors">
            {appointment.client_name}
          </Link>
          {clientDetails?.phone && (
            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
              <Phone className="w-3 h-3" />
              {clientDetails.phone}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
        <div><span className="text-muted-foreground">Num Visits:</span> <span className="font-medium">{clientDetails?.visit_count ?? 0}</span></div>
        <div><span className="text-muted-foreground">Avg. Visit:</span> <span className="font-medium">${avgVisit.toFixed(0)}</span></div>
        {age !== null && <div><span className="text-muted-foreground">Age:</span> <span className="font-medium">{age}</span></div>}
      </div>

      <Separator className="my-2" />

      {/* Appointment details */}
      <p className="text-sm font-medium text-foreground mb-1">{dateStr}, {timeStr}</p>
      <div className="flex items-start gap-3 text-xs text-muted-foreground mb-1">
        <span>{start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}</span>
        <span className="flex-1 font-medium text-foreground">{appointment.service_name}</span>
        <span className="truncate max-w-[80px]">{appointment.staff_name}</span>
      </div>
      <p className="text-sm font-semibold mt-2">${Number(appointment.total_amount).toFixed(2)}</p>

      {/* Status badge */}
      <div className="mt-2">
        <Badge variant="outline" className="text-[10px] capitalize">
          {appointment.status.replace('_', ' ')}
        </Badge>
      </div>

      <Separator className="my-3" />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Undo">
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Cancel"
            onClick={() => onStatusChange?.(appointment.id, 'cancelled')}
          >
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Link to={`/schedule/${appointment.id}`}>
            <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
          </Link>
          {appointment.status === 'scheduled' && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onStatusChange?.(appointment.id, 'confirmed')}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Mark as Confirmed
            </Button>
          )}
          {appointment.status === 'confirmed' && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onStatusChange?.(appointment.id, 'checked_in')}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Check In
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
