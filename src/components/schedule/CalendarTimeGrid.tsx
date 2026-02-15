import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { GoogleCalendarEvent } from '@/hooks/useCalendarSync';

interface ScheduleAppointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  total_amount: number;
  client_name: string;
  service_name: string;
  staff_name: string;
  room_name: string | null;
}

interface CalendarTimeGridProps {
  dates: Date[];
  appointments: ScheduleAppointment[];
  googleEvents: GoogleCalendarEvent[];
  isLoading: boolean;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am–9pm
const SLOT_HEIGHT = 64; // px per hour

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-primary/15 border-primary/30 text-foreground',
  confirmed: 'bg-success/15 border-success/30 text-foreground',
  checked_in: 'bg-info/15 border-info/30 text-foreground',
  in_progress: 'bg-primary/20 border-primary/40 text-foreground',
  completed: 'bg-muted border-border text-muted-foreground',
  cancelled: 'bg-destructive/10 border-destructive/20 text-muted-foreground line-through',
  no_show: 'bg-destructive/10 border-destructive/20 text-muted-foreground',
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date) {
  return isSameDay(d, new Date());
}

export function CalendarTimeGrid({ dates, appointments, googleEvents, isLoading }: CalendarTimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 8am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SLOT_HEIGHT * 1; // 1 hour past 7am = 8am
    }
  }, []);

  const getApptsForDate = (date: Date) =>
    appointments.filter((a) => isSameDay(new Date(a.scheduled_at), date));

  const getGoogleForDate = (date: Date) =>
    googleEvents.filter((e) => {
      const start = e.start?.dateTime || e.start?.date;
      return start ? isSameDay(new Date(start), date) : false;
    });

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - 7 * 60) / 60) * SLOT_HEIGHT;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
      {/* Column Headers */}
      <div className="flex border-b border-border bg-card sticky top-0 z-10">
        <div className="w-16 shrink-0 border-r border-border" />
        {dates.map((date, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 text-center py-3 border-r border-border last:border-r-0',
              isToday(date) && 'bg-primary/5'
            )}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </p>
            <p
              className={cn(
                'text-lg font-semibold mt-0.5',
                isToday(date)
                  ? 'text-primary'
                  : 'text-foreground'
              )}
            >
              {date.getDate()}
            </p>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-card/80 z-20 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        <div className="flex relative" style={{ height: HOURS.length * SLOT_HEIGHT }}>
          {/* Time Labels */}
          <div className="w-16 shrink-0 border-r border-border relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-2 text-xs text-muted-foreground"
                style={{ top: (hour - 7) * SLOT_HEIGHT - 8 }}
              >
                {hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {dates.map((date, colIdx) => {
            const dayAppts = getApptsForDate(date);
            const dayGoogle = getGoogleForDate(date);

            return (
              <div
                key={colIdx}
                className={cn(
                  'flex-1 relative border-r border-border last:border-r-0',
                  isToday(date) && 'bg-primary/[0.02]'
                )}
              >
                {/* Horizontal grid lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/60"
                    style={{ top: (hour - 7) * SLOT_HEIGHT }}
                  />
                ))}

                {/* Now indicator */}
                {isToday(date) && nowTop >= 0 && nowTop <= HOURS.length * SLOT_HEIGHT && (
                  <div
                    className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                    style={{ top: nowTop }}
                  >
                    <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                    <div className="flex-1 h-px bg-destructive" />
                  </div>
                )}

                {/* Appointment blocks */}
                {dayAppts.map((apt) => {
                  const start = new Date(apt.scheduled_at);
                  const startMin = start.getHours() * 60 + start.getMinutes();
                  const top = ((startMin - 7 * 60) / 60) * SLOT_HEIGHT;
                  const height = Math.max((apt.duration_minutes / 60) * SLOT_HEIGHT, 24);

                  return (
                    <Link
                      key={apt.id}
                      to={`/schedule/${apt.id}`}
                      className={cn(
                        'absolute left-1 right-1 rounded-md border-l-[3px] px-2 py-1 overflow-hidden cursor-pointer transition-all hover:shadow-md hover:z-10',
                        STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled
                      )}
                      style={{ top, height }}
                    >
                      <p className="text-[11px] font-semibold truncate">{apt.client_name}</p>
                      <p className="text-[10px] opacity-70 truncate">{apt.service_name}</p>
                      {height > 40 && (
                        <p className="text-[10px] opacity-60 truncate">{apt.staff_name}</p>
                      )}
                    </Link>
                  );
                })}

                {/* Google Calendar events */}
                {dayGoogle.map((event) => {
                  const startStr = event.start?.dateTime || event.start?.date || '';
                  const endStr = event.end?.dateTime || event.end?.date || '';
                  if (!startStr) return null;

                  const start = new Date(startStr);
                  const end = endStr ? new Date(endStr) : new Date(start.getTime() + 3600000);
                  const startMin = start.getHours() * 60 + start.getMinutes();
                  const durationMin = (end.getTime() - start.getTime()) / 60000;
                  const top = ((startMin - 7 * 60) / 60) * SLOT_HEIGHT;
                  const height = Math.max((durationMin / 60) * SLOT_HEIGHT, 24);

                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 rounded-md border-l-[3px] border-accent-foreground/20 bg-accent/60 px-2 py-1 overflow-hidden"
                      style={{ top, height }}
                    >
                      <div className="flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                        <p className="text-[11px] font-medium truncate">{event.summary || 'Untitled'}</p>
                      </div>
                      {height > 30 && event.location && (
                        <p className="text-[10px] opacity-60 truncate">📍 {event.location}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
