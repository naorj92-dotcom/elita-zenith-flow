import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GoogleCalendarEvent } from '@/hooks/useCalendarSync';
import { AppointmentPopover } from './AppointmentPopover';
import type { ScheduleAppointment, ScheduleStaff } from '@/pages/SchedulePage';

interface CalendarTimeGridProps {
  dates: Date[];
  appointments: ScheduleAppointment[];
  googleEvents: GoogleCalendarEvent[];
  isLoading: boolean;
  staffList: ScheduleStaff[];
  onAppointmentDrop?: (appointmentId: string, newScheduledAt: Date, newStaffId?: string | null) => void;
  onClientChanged?: () => void;
  onStatusChange?: (id: string, status: string) => void;
  clientDetailsMap?: Record<string, { phone?: string | null; email?: string | null; visit_count?: number; total_spent?: number; date_of_birth?: string | null }>;
  providerColorFn?: (staffId: string, index: number) => string;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const SLOT_HEIGHT = 64;
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

// Parse Google Calendar event description for phone/email
function parseGoogleEventDescription(desc?: string): { phone?: string; email?: string } {
  if (!desc) return {};
  const phoneMatch = desc.match(/Phone:-?\s*([\d\s\-()]+)/i);
  const emailMatch = desc.match(/Email:-?\s*([\w.+\-@]+)/i);
  return {
    phone: phoneMatch ? phoneMatch[1].trim() : undefined,
    email: emailMatch ? emailMatch[1].trim() : undefined,
  };
}

// Convert a Google Calendar event to a ScheduleAppointment-like object for the popover
function googleEventToAppointment(event: GoogleCalendarEvent): ScheduleAppointment {
  const startStr = event.start?.dateTime || event.start?.date || '';
  const endStr = event.end?.dateTime || event.end?.date || '';
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date(start.getTime() + 3600000);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

  // Parse "Client Name - Service Name" from summary
  const parts = (event.summary || '').split(' - ');
  const clientName = parts[0]?.trim() || event.summary || 'Unknown';
  const serviceName = parts[1]?.trim() || 'Google Calendar Event';

  return {
    id: `gcal-${event.id}`,
    scheduled_at: start.toISOString(),
    duration_minutes: durationMin,
    status: event.status === 'confirmed' ? 'confirmed' : 'scheduled',
    notes: event.description || null,
    total_amount: 0,
    client_name: clientName,
    service_name: serviceName,
    staff_name: '',
    staff_id: null,
    client_id: null,
    room_name: null,
  };
}

export function CalendarTimeGrid({ dates, appointments, googleEvents, isLoading, staffList, onAppointmentDrop, onClientChanged, onStatusChange, clientDetailsMap, formStatusMap, providerColorFn }: CalendarTimeGridProps & { formStatusMap?: Record<string, 'complete' | 'pending' | 'none'> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const [selectedApt, setSelectedApt] = useState<ScheduleAppointment | null>(null);
  const [selectedGoogleDetails, setSelectedGoogleDetails] = useState<{ phone?: string; email?: string } | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);

  const isDayView = dates.length === 1;
  const isWeekView = dates.length === 7;
  const visibleStaff = staffList.length > 0
    ? (isWeekView ? staffList.slice(0, MAX_STAFF_WEEK) : staffList)
    : [];
  const showProviderColumns = visibleStaff.length > 0;
  const staffColWidth = isWeekView ? 80 : isDayView ? 160 : 100;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = SLOT_HEIGHT * 1;
  }, []);

  useEffect(() => {
    const grid = scrollRef.current;
    const header = headerScrollRef.current;
    if (!grid || !header) return;
    const onScroll = () => { header.scrollLeft = grid.scrollLeft; };
    grid.addEventListener('scroll', onScroll);
    return () => grid.removeEventListener('scroll', onScroll);
  }, []);

  // Close popover on outside click (delayed to avoid closing on the opening click)
  useEffect(() => {
    if (!selectedApt) return;
    const handler = (e: MouseEvent) => {
      // Don't close if clicking inside the popover
      const popoverEl = document.querySelector('[data-appointment-popover]');
      if (popoverEl && popoverEl.contains(e.target as Node)) return;
      setSelectedApt(null);
    };
    // Delay adding listener so the opening click doesn't immediately close it
    const timer = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handler); };
  }, [selectedApt]);

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

  const handleAptClick = (apt: ScheduleAppointment, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const gridRect = scrollRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    let x = e.clientX - gridRect.left + (scrollRef.current?.scrollLeft || 0);
    let y = e.clientY - gridRect.top + (scrollRef.current?.scrollTop || 0);
    setPopoverPos({ x, y });
    setSelectedApt(apt);
    setSelectedGoogleDetails(null);
  };

  const handleGoogleEventClick = (event: GoogleCalendarEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const gridRect = scrollRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    let x = e.clientX - gridRect.left + (scrollRef.current?.scrollLeft || 0);
    let y = e.clientY - gridRect.top + (scrollRef.current?.scrollTop || 0);
    setPopoverPos({ x, y });
    const fakeApt = googleEventToAppointment(event);
    const details = parseGoogleEventDescription(event.description);
    setSelectedApt(fakeApt);
    setSelectedGoogleDetails(details);
  };

  // Drag state
  const dragRef = useRef<{ apt: ScheduleAppointment; startY: number; startTop: number; colDate: Date } | null>(null);
  const [dragGhostTop, setDragGhostTop] = useState<number | null>(null);
  const [draggingApt, setDraggingApt] = useState<string | null>(null);
  const [dragTargetDate, setDragTargetDate] = useState<Date | null>(null);
  const [dragCursorPos, setDragCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [dragTargetStaffId, setDragTargetStaffId] = useState<string | null>(null);
  const [dragOriginStaffId, setDragOriginStaffId] = useState<string | null>(null);

  // Build a ref of column rects so we can detect which date column the cursor is over
  const columnRectsRef = useRef<{ date: Date; left: number; right: number; staffId?: string }[]>([]);

  const updateColumnRects = useCallback(() => {
    const grid = scrollRef.current;
    if (!grid) return;
    const cols = grid.querySelectorAll<HTMLElement>('[data-date-col]');
    const rects: { date: Date; left: number; right: number; staffId?: string }[] = [];
    cols.forEach((col) => {
      const dateStr = col.getAttribute('data-date-col');
      if (!dateStr) return;
      // Check for staff sub-columns
      const staffCols = col.querySelectorAll<HTMLElement>('[data-staff-col]');
      if (staffCols.length > 0) {
        staffCols.forEach((sc) => {
          const staffId = sc.getAttribute('data-staff-col') || undefined;
          const rect = sc.getBoundingClientRect();
          rects.push({ date: new Date(dateStr), left: rect.left, right: rect.right, staffId });
        });
      } else {
        const rect = col.getBoundingClientRect();
        rects.push({ date: new Date(dateStr), left: rect.left, right: rect.right });
      }
    });
    columnRectsRef.current = rects;
  }, []);

  const findColumnAtX = useCallback((clientX: number): { date: Date; staffId?: string } | null => {
    for (const col of columnRectsRef.current) {
      if (clientX >= col.left && clientX < col.right) return { date: col.date, staffId: col.staffId };
    }
    return null;
  }, []);

  const findDateAtX = useCallback((clientX: number): Date | null => {
    const col = findColumnAtX(clientX);
    return col?.date || null;
  }, [findColumnAtX]);

  const handleDragStart = (apt: ScheduleAppointment, colDate: Date, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const start = new Date(apt.scheduled_at);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const top = ((startMin - 7 * 60) / 60) * SLOT_HEIGHT;
    const startX = e.clientX;
    const startY = e.clientY;
    let isDragging = false;

    // Snapshot column rects at drag start
    updateColumnRects();

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      // Start dragging after 5px threshold in any direction
      if (!isDragging && Math.sqrt(dx * dx + dy * dy) < 5) return;
      if (!isDragging) {
        isDragging = true;
        dragRef.current = { apt, startY, startTop: top, colDate };
        setDraggingApt(apt.id);
        setDragOriginStaffId(apt.staff_id || null);
      }
      const newTop = top + dy;
      const snapped = Math.round(newTop / (SLOT_HEIGHT / 4)) * (SLOT_HEIGHT / 4);
      setDragGhostTop(Math.max(0, snapped));
      setDragCursorPos({ x: ev.clientX, y: ev.clientY });

      // Detect horizontal date/staff column change
      const hoveredCol = findColumnAtX(ev.clientX);
      setDragTargetDate(hoveredCol?.date || null);
      setDragTargetStaffId(hoveredCol?.staffId || null);
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (isDragging && dragRef.current) {
        const dy = ev.clientY - startY;
        const newTop = top + dy;
        const snapped = Math.round(newTop / (SLOT_HEIGHT / 4)) * (SLOT_HEIGHT / 4);
        const finalTop = Math.max(0, snapped);
        const minutesFromStart = (finalTop / SLOT_HEIGHT) * 60;
        const totalMinutes = 7 * 60 + minutesFromStart;
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.round(totalMinutes % 60);

        // Use the column the cursor is over, or fall back to the original column
        const targetCol = findColumnAtX(ev.clientX);
        const targetDate = targetCol?.date || dragRef.current.colDate;
        const targetStaffId = targetCol?.staffId || null;
        const newDate = new Date(targetDate);
        newDate.setHours(hours, mins, 0, 0);

        const oldStart = new Date(dragRef.current.apt.scheduled_at);
        const hasChange = oldStart.getTime() !== newDate.getTime() || (targetStaffId && targetStaffId !== dragRef.current.apt.staff_id);
        if (hasChange) {
          onAppointmentDrop?.(dragRef.current.apt.id, newDate, targetStaffId);
        }
      }
      setDraggingApt(null);
      setDragGhostTop(null);
      setDragTargetDate(null);
      setDragCursorPos(null);
      setDragTargetStaffId(null);
      setDragOriginStaffId(null);
      dragRef.current = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
      {/* Column Headers */}
      <div ref={headerScrollRef} className="border-b border-border bg-card sticky top-0 z-10 overflow-x-hidden">
        <div style={{ minWidth: totalMinWidth }}>
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
                <p className={cn(
                  'text-xs uppercase tracking-wide',
                  isToday(date) ? 'text-primary font-semibold' : 'text-muted-foreground'
                )}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <div className="flex items-center justify-center">
                  <span className={cn(
                    'text-lg font-semibold w-9 h-9 flex items-center justify-center rounded-full',
                    isToday(date) 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-foreground'
                  )}>
                    {date.getDate()}
                  </span>
                </div>
              </div>
            ))}
          </div>

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
                      <Avatar className={cn('border-2', isWeekView ? 'h-6 w-6' : 'h-7 w-7')}
                        style={{ borderColor: providerColorFn ? providerColorFn(s.id, sIdx) : undefined }}
                      >
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback className={cn('text-primary', isWeekView ? 'text-[8px]' : 'text-[10px]')}
                          style={{ backgroundColor: providerColorFn ? `${providerColorFn(s.id, sIdx)}20` : undefined }}
                        >
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

            // Compute drop shadow for the target column
            const computeDropShadow = (staffId?: string): { top: number; height: number; timeLabel: string } | null => {
              if (!draggingApt || dragGhostTop === null || !dragRef.current) return null;
              const apt = dragRef.current.apt;
              // Show shadow in target column: either same staff with different date, or different staff
              const isTargetStaff = staffId ? dragTargetStaffId === staffId : true;
              const isTargetDate = dragTargetDate ? isSameDay(dragTargetDate, date) : isSameDay(dragRef.current.colDate, date);
              if (!isTargetStaff || !isTargetDate) return null;
              // Don't show if still in exact original position
              const origStart = new Date(apt.scheduled_at);
              const origTop = ((origStart.getHours() * 60 + origStart.getMinutes() - 7 * 60) / 60) * SLOT_HEIGHT;
              const isOrigCol = staffId ? apt.staff_id === staffId : true;
              const isOrigDate = isSameDay(origStart, date);
              if (isOrigCol && isOrigDate && Math.abs(dragGhostTop - origTop) < 2) return null;

              const minutesFromStart = (dragGhostTop / SLOT_HEIGHT) * 60;
              const totalMin = 7 * 60 + minutesFromStart;
              const h = Math.floor(totalMin / 60);
              const m = Math.round(totalMin % 60);
              const isPM = h >= 12;
              const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
              const timeLabel = `${dh}:${m.toString().padStart(2, '0')}${isPM ? 'pm' : 'am'}`;
              const height = Math.max((apt.duration_minutes / 60) * SLOT_HEIGHT, 24);
              return { top: dragGhostTop, height, timeLabel };
            };

            if (showProviderColumns) {
              return (
                <div
                  key={dateIdx}
                  data-date-col={date.toISOString()}
                  className={cn('flex border-r border-border last:border-r-0', isToday(date) && 'bg-primary/[0.02]')}
                  style={{ width: visibleStaff.length * staffColWidth, minWidth: visibleStaff.length * staffColWidth }}
                >
                  {visibleStaff.map((s, sIdx) => (
                    <ProviderColumn
                      key={s.id}
                      date={date}
                      staffId={s.id}
                      staffIndex={sIdx}
                      appointments={getApptsForDateAndStaff(date, s.id)}
                      googleEvents={sIdx === 0 ? dayGoogle : []}
                      isLast={sIdx === visibleStaff.length - 1}
                      nowTop={nowTop}
                      showStaffName={false}
                      colWidth={staffColWidth}
                      onAptClick={handleAptClick}
                      onGoogleEventClick={handleGoogleEventClick}
                     onDragStart={handleDragStart}
                      draggingApt={draggingApt}
                      dragGhostTop={dragGhostTop}
                      isDropTarget={!!draggingApt && dragTargetStaffId === s.id && dragOriginStaffId !== s.id}
                      dropShadow={computeDropShadow(s.id)}
                      formStatusMap={formStatusMap}
                      providerColorFn={providerColorFn}
                      allStaff={visibleStaff}
                    />
                  ))}
                </div>
              );
            }

            return (
              <div key={dateIdx} data-date-col={date.toISOString()} className="flex-1 border-r border-border last:border-r-0">
                <ProviderColumn
                  date={date}
                  appointments={getApptsForDate(date)}
                  googleEvents={dayGoogle}
                  isLast={dateIdx === dates.length - 1}
                  nowTop={nowTop}
                  showStaffName
                  className="h-full"
                  onAptClick={handleAptClick}
                  onGoogleEventClick={handleGoogleEventClick}
                  onDragStart={handleDragStart}
                  draggingApt={draggingApt}
                  dragGhostTop={dragGhostTop}
                  dropShadow={computeDropShadow()}
                  formStatusMap={formStatusMap}
                  providerColorFn={providerColorFn}
                  allStaff={visibleStaff}
                />
              </div>
            );
          })}
        </div>

        {/* Appointment Popover (floating) */}
        {selectedApt && popoverPos && (
          <div
            className="absolute z-30"
            style={{ left: Math.min(popoverPos.x, (scrollRef.current?.scrollWidth || 400) - 330), top: popoverPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <AppointmentPopover
              appointment={selectedApt}
              clientDetails={selectedGoogleDetails || clientDetailsMap?.[selectedApt.id] || null}
              onClose={() => { setSelectedApt(null); setSelectedGoogleDetails(null); }}
              onStatusChange={selectedApt.id.startsWith('gcal-') ? undefined : onStatusChange}
              onClientChanged={onClientChanged}
            />
          </div>
        )}
      </div>

      {/* Floating drag ghost that follows cursor */}
      {draggingApt && dragCursorPos && dragRef.current && dragGhostTop !== null && (() => {
        const apt = dragRef.current!.apt;
        const minutesFromStart = (dragGhostTop / SLOT_HEIGHT) * 60;
        const totalMinutes = 7 * 60 + minutesFromStart;
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.round(totalMinutes % 60);
        const isPM = hours >= 12;
        const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const timeLabel = `${displayHour}:${mins.toString().padStart(2, '0')}${isPM ? 'pm' : 'am'}`;
        const height = Math.max((apt.duration_minutes / 60) * SLOT_HEIGHT, 36);
        const isMovingProvider = dragTargetStaffId && dragOriginStaffId && dragTargetStaffId !== dragOriginStaffId;
        const targetStaff = isMovingProvider ? visibleStaff.find(s => s.id === dragTargetStaffId) : null;

        return (
          <div
            className="fixed z-50 pointer-events-none"
            style={{ left: dragCursorPos.x + 14, top: dragCursorPos.y - 20 }}
          >
            <div
              className={cn(
                'rounded-md border-l-[3px] px-1.5 py-1 shadow-xl opacity-90 w-[140px] overflow-hidden',
                STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled
              )}
              style={{ height }}
            >
              <p className="text-[9px] text-muted-foreground font-medium">{timeLabel}</p>
              <p className="text-[10px] font-semibold truncate">{apt.client_name}</p>
              {height > 36 && <p className="text-[9px] opacity-70 truncate">{apt.service_name}</p>}
            </div>
            {isMovingProvider && targetStaff && (
              <div className="flex items-center gap-1 mt-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-lg w-fit">
                <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
                  <path d="M3 8h10M10 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{targetStaff.first_name} {targetStaff.last_name}</span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

interface ProviderColumnProps {
  date: Date;
  staffId?: string;
  staffIndex?: number;
  appointments: ScheduleAppointment[];
  googleEvents: GoogleCalendarEvent[];
  isLast: boolean;
  nowTop: number;
  showStaffName: boolean;
  className?: string;
  colWidth?: number;
  onAptClick?: (apt: ScheduleAppointment, e: React.MouseEvent) => void;
  onGoogleEventClick?: (event: GoogleCalendarEvent, e: React.MouseEvent) => void;
  onDragStart?: (apt: ScheduleAppointment, colDate: Date, e: React.MouseEvent) => void;
  draggingApt?: string | null;
  dragGhostTop?: number | null;
  isDropTarget?: boolean;
  dropShadow?: { top: number; height: number; timeLabel: string } | null;
  formStatusMap?: Record<string, 'complete' | 'pending' | 'none'>;
  providerColorFn?: (staffId: string, index: number) => string;
  allStaff?: ScheduleStaff[];
}

function ProviderColumn({ date, staffId, staffIndex, appointments: dayAppts, googleEvents: dayGoogle, isLast, nowTop, showStaffName, className, colWidth, onAptClick, onGoogleEventClick, onDragStart, draggingApt, dragGhostTop, isDropTarget, dropShadow, formStatusMap, providerColorFn, allStaff }: ProviderColumnProps) {
  return (
    <div
      data-staff-col={staffId}
      className={cn(
        'relative transition-colors duration-150',
        !isLast && !className && 'border-r border-border/50',
        isToday(date) && 'bg-primary/[0.02]',
        isDropTarget && 'bg-primary/10 ring-2 ring-inset ring-primary/30',
        className
      )}
      style={colWidth ? { width: colWidth, minWidth: colWidth } : undefined}
    >
      {HOURS.map((hour) => (
        <div key={hour} className="absolute w-full border-t border-border/40" style={{ top: (hour - 7) * SLOT_HEIGHT }} />
      ))}

      {isToday(date) && nowTop >= 0 && nowTop <= HOURS.length * SLOT_HEIGHT && (
        <div className="absolute left-0 right-0 z-10 flex items-center pointer-events-none" style={{ top: nowTop }}>
          <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
          <div className="flex-1 h-px bg-destructive" />
        </div>
      )}

      {/* Drop shadow indicator */}
      {dropShadow && (
        <div
          className="absolute left-0.5 right-0.5 rounded-md border-2 border-dashed border-primary/50 bg-primary/10 pointer-events-none z-10 flex flex-col items-center justify-center"
          style={{ top: dropShadow.top, height: dropShadow.height }}
        >
          <p className="text-[10px] font-semibold text-primary">{dropShadow.timeLabel}</p>
        </div>
      )}

      {dayAppts.map((apt) => {
        const start = new Date(apt.scheduled_at);
        const startMin = start.getHours() * 60 + start.getMinutes();
        const top = ((startMin - 7 * 60) / 60) * SLOT_HEIGHT;
        const height = Math.max((apt.duration_minutes / 60) * SLOT_HEIGHT, 24);
        const timeLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
        const isDragging = draggingApt === apt.id;
        const isCheckedIn = apt.status === 'checked_in';

        const aptStaffIdx = allStaff ? allStaff.findIndex(s => s.id === apt.staff_id) : -1;
        const providerColor = providerColorFn && apt.staff_id ? providerColorFn(apt.staff_id, aptStaffIdx >= 0 ? aptStaffIdx : 0) : undefined;

        return (
          <div
            key={apt.id}
            className={cn(
              'absolute left-0.5 right-0.5 rounded-md px-1 py-0.5 overflow-hidden cursor-grab transition-shadow select-none border-l-[3px]',
              !providerColor && (STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled),
              isDragging && 'opacity-50 cursor-grabbing shadow-lg z-20',
              isCheckedIn && 'ring-2 ring-sky-400/50',
            )}
            style={{
              top: isDragging && dragGhostTop !== null ? dragGhostTop : top,
              height,
              ...(providerColor ? {
                backgroundColor: `${providerColor}30`,
                borderLeftColor: providerColor,
                borderLeftWidth: '4px',
                color: 'var(--foreground)',
              } : {}),
            }}
            onClick={(e) => onAptClick?.(apt, e)}
            onMouseDown={(e) => {
              if (e.button === 0) onDragStart?.(apt, date, e);
            }}
          >
            <div className="flex items-center gap-0.5">
              {isCheckedIn && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
              )}
              <p className="text-[9px] text-muted-foreground truncate flex-1">
                {isCheckedIn ? 'ARRIVED' : timeLabel}
              </p>
              {formStatusMap && formStatusMap[apt.id] === 'pending' && (
                <span className="w-2 h-2 rounded-full bg-destructive shrink-0" title="Forms pending" />
              )}
              {formStatusMap && formStatusMap[apt.id] === 'complete' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Forms complete" />
              )}
            </div>
            <p className="text-[10px] font-semibold truncate">{apt.client_name}</p>
            {height > 36 && <p className="text-[9px] opacity-70 truncate">{apt.service_name}</p>}
            {showStaffName && height > 48 && apt.staff_name && (
              <p className="text-[8px] opacity-60 truncate">{apt.staff_name}</p>
            )}
          </div>
        );
      })}

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
        const fakeApt = googleEventToAppointment(event);
        const isDragging = draggingApt === fakeApt.id;

        return (
          <div
            key={event.id}
            className={cn(
              'absolute left-0.5 right-0.5 rounded-md border-l-[3px] border-accent-foreground/20 bg-accent/60 px-1 py-0.5 overflow-hidden cursor-grab hover:shadow-md transition-shadow select-none',
              isDragging && 'opacity-50 cursor-grabbing shadow-lg z-20'
            )}
            style={{ top: isDragging && dragGhostTop !== null ? dragGhostTop : top, height }}
            onClick={(e) => onGoogleEventClick?.(event, e)}
            onMouseDown={(e) => {
              if (e.button === 0) onDragStart?.(fakeApt, date, e);
            }}
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
