import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GoogleCalendarEvent } from '@/hooks/useCalendarSync';
import type { ScheduleAppointment, ScheduleStaff } from '@/pages/SchedulePage';

interface CalendarTimeGridProps {
  dates: Date[];
  appointments: ScheduleAppointment[];
  googleEvents: GoogleCalendarEvent[];
  isLoading: boolean;
  staffList: ScheduleStaff[];
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am–9pm
const SLOT_HEIGHT = 64; // px per hour
const MAX_STAFF_WEEK = 3;

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-foreground',
  confirmed: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-foreground',
  checked_in: 'bg-sky-100 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-foreground',
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

export function CalendarTimeGrid({ dates, appointments, googleEvents, isLoading, staffList }: CalendarTimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const isDayView = dates.length === 1;
  const isWeekView = dates.length === 7;
  const visibleStaff = staffList.length > 0
    ? (isWeekView ? staffList.slice(0, MAX_STAFF_WEEK) : staffList)
    : [];
  const showProviderColumns = visibleStaff.length > 0;
  const staffColWidth = isWeekView ? 80 : isDayView ? 160 : 100;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SLOT_HEIGHT * 1;
    }
  }, []);

  // Sync horizontal scroll between header and grid
  useEffect(() => {
    const grid = scrollRef.current;
    const header = headerScrollRef.current;
    if (!grid || !header) return;
    const onScroll = () => { header.scrollLeft = grid.scrollLeft; };
    grid.addEventListener('scroll', onScroll);
    return () => grid.removeEventListener('scroll', onScroll);
  }, []);

  const getApptsForDateAndStaff = (date: Date, staffId: string) =>
    appointments.filter((a) => isSameDay(new Date(a.scheduled_at), date) && a.staff_id === staffId);

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

  const totalMinWidth = showProviderColumns
    ? 56 + dates.length * visibleStaff.length * staffColWidth
    : undefined;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
      {/* Column Headers */}
      <div ref={headerScrollRef} className="border-b border-border bg-card sticky top-0 z-10 overflow-x-hidden">
        <div style={{ minWidth: totalMinWidth }}>
          {/* Date row */}
          <div className="flex">
            <div className="w-14 shrink-0 border-r border-border" />
            {dates.map((date, i) => (
              <div
                key={i}
                className={cn(
                  'text-center py-2 border-r border-border last:border-r-0',
                  isToday(date) && 'bg-primary/5'
                )}
                style={{
                  width: showProviderColumns ? visibleStaff.length * staffColWidth : undefined,
                  minWidth: showProviderColumns ? visibleStaff.length * staffColWidth : 80,
                  flex: showProviderColumns ? 'none' : 1,
                }}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className={cn('text-lg font-semibold', isToday(date) ? 'text-primary' : 'text-foreground')}>
                  {date.getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* Provider sub-headers */}
          {showProviderColumns && (
            <div className="flex border-t border-border">
              <div className="w-14 shrink-0 border-r border-border" />
              {dates.map((date, dateIdx) => (
                <div
                  key={dateIdx}
                  className="flex border-r border-border last:border-r-0"
                  style={{ width: visibleStaff.length * staffColWidth, minWidth: visibleStaff.length * staffColWidth }}
                >
                  {visibleStaff.map((s, sIdx) => (
                    <div
                      key={s.id}
                      className={cn(
                        'flex flex-col items-center py-1.5 gap-0.5',
                        sIdx < visibleStaff.length - 1 && 'border-r border-border/50',
                        isToday(date) && 'bg-primary/5'
                      )}
                      style={{ width: staffColWidth, minWidth: staffColWidth }}
                    >
                      <Avatar className={cn('border-2 border-background', isWeekView ? 'h-6 w-6' : 'h-7 w-7')}>
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback className={cn('bg-primary/10 text-primary', isWeekView ? 'text-[8px]' : 'text-[10px]')}>
                          {s.first_name[0]}{s.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn('font-medium text-foreground truncate', isWeekView ? 'text-[9px] max-w-[70px]' : 'text-[11px] max-w-[90px]')}>
                        {s.first_name}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time Grid */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-card/80 z-20 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        <div className="flex relative" style={{ height: HOURS.length * SLOT_HEIGHT, minWidth: totalMinWidth }}>
          {/* Time Labels */}
          <div className="w-14 shrink-0 border-r border-border relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-2 text-xs text-muted-foreground"
                style={{ top: (hour - 7) * SLOT_HEIGHT - 8 }}
              >
                {hour === 0 ? '12am' : hour <= 12 ? `${hour}am` : `${hour - 12}pm`}
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {dates.map((date, dateIdx) => {
            const dayGoogle = getGoogleForDate(date);

            if (showProviderColumns) {
              return (
                <div
                  key={dateIdx}
                  className={cn('flex border-r border-border last:border-r-0', isToday(date) && 'bg-primary/[0.02]')}
                  style={{ width: visibleStaff.length * staffColWidth, minWidth: visibleStaff.length * staffColWidth }}
                >
                  {visibleStaff.map((s, sIdx) => (
                    <ProviderColumn
                      key={s.id}
                      date={date}
                      appointments={getApptsForDateAndStaff(date, s.id)}
                      googleEvents={sIdx === 0 ? dayGoogle : []}
                      isLast={sIdx === visibleStaff.length - 1}
                      nowTop={nowTop}
                      showStaffName={false}
                      colWidth={staffColWidth}
                    />
                  ))}
                </div>
              );
            }

            return (
              <ProviderColumn
                key={dateIdx}
                date={date}
                appointments={getApptsForDate(date)}
                googleEvents={dayGoogle}
                isLast={dateIdx === dates.length - 1}
                nowTop={nowTop}
                showStaffName
                className="flex-1 border-r border-border last:border-r-0"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ProviderColumnProps {
  date: Date;
  appointments: ScheduleAppointment[];
  googleEvents: GoogleCalendarEvent[];
  isLast: boolean;
  nowTop: number;
  showStaffName: boolean;
  className?: string;
  colWidth?: number;
}

function ProviderColumn({ date, appointments: dayAppts, googleEvents: dayGoogle, isLast, nowTop, showStaffName, className, colWidth }: ProviderColumnProps) {
  return (
    <div
      className={cn(
        'relative',
        !isLast && !className && 'border-r border-border/50',
        isToday(date) && 'bg-primary/[0.02]',
        className
      )}
      style={colWidth ? { width: colWidth, minWidth: colWidth } : undefined}
    >
      {/* Horizontal grid lines */}
      {HOURS.map((hour) => (
        <div key={hour} className="absolute w-full border-t border-border/40" style={{ top: (hour - 7) * SLOT_HEIGHT }} />
      ))}

      {/* Now indicator */}
      {isToday(date) && nowTop >= 0 && nowTop <= HOURS.length * SLOT_HEIGHT && (
        <div className="absolute left-0 right-0 z-10 flex items-center pointer-events-none" style={{ top: nowTop }}>
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
        const timeLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

        return (
          <Link
            key={apt.id}
            to={`/schedule/${apt.id}`}
            className={cn(
              'absolute left-0.5 right-0.5 rounded-md border-l-[3px] px-1 py-0.5 overflow-hidden cursor-pointer transition-all hover:shadow-md hover:z-10',
              STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled
            )}
            style={{ top, height }}
          >
            <p className="text-[9px] text-muted-foreground">{timeLabel}</p>
            <p className="text-[10px] font-semibold truncate">{apt.client_name}</p>
            {height > 36 && <p className="text-[9px] opacity-70 truncate">{apt.service_name}</p>}
            {showStaffName && height > 48 && apt.staff_name && (
              <p className="text-[8px] opacity-60 truncate">{apt.staff_name}</p>
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
            className="absolute left-0.5 right-0.5 rounded-md border-l-[3px] border-accent-foreground/20 bg-accent/60 px-1 py-0.5 overflow-hidden"
            style={{ top, height }}
          >
            <div className="flex items-center gap-1">
              <Globe className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
              <p className="text-[10px] font-medium truncate">{event.summary || 'Untitled'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
