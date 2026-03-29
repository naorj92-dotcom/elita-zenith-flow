import React from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, ChevronLeft, ChevronRight, Users, CalendarDays, Palette, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ScheduleStaff } from '@/pages/SchedulePage';

export type CalendarView = 'day' | '4day' | 'week';

interface ScheduleHeaderProps {
  selectedDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSync: () => void;
  isSyncing: boolean;
  staffList?: ScheduleStaff[];
  selectedStaffIds?: string[];
  onSelectedStaffChange?: (ids: string[]) => void;
  isFullCalendar?: boolean;
  onFullCalendarChange?: (val: boolean) => void;
  showStaffFilter?: boolean;
  onNewAppointment?: () => void;
  providerColors?: { getColor: (id: string, idx: number) => string; setColor: (id: string, color: string) => void; availableColors: string[] };
}

export function ScheduleHeader({
  ...props
}: ScheduleHeaderProps) {
  const { selectedDate, view, onViewChange, onPrev, onNext, onToday, onSync, isSyncing, staffList = [], selectedStaffIds = [], onSelectedStaffChange, isFullCalendar = false, onFullCalendarChange, showStaffFilter = true, onNewAppointment, providerColors } = props;
  const navigate = useNavigate();
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onSync,
  isSyncing,
  staffList = [],
  selectedStaffIds = [],
  onSelectedStaffChange,
  isFullCalendar = false,
  onFullCalendarChange,
  showStaffFilter = true,
  onNewAppointment,
  providerColors,
}: ScheduleHeaderProps) {
  const formatHeaderDate = () => {
    if (view === 'day') {
      return selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const endDate = new Date(selectedDate);
    endDate.setDate(endDate.getDate() + (view === '4day' ? 3 : 6));
    const sameMonth = selectedDate.getMonth() === endDate.getMonth();
    if (sameMonth) {
      return `${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${endDate.getDate()}, ${endDate.getFullYear()}`;
    }
    return `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const toggleStaff = (id: string) => {
    if (!onSelectedStaffChange) return;
    if (selectedStaffIds.includes(id)) {
      if (selectedStaffIds.length > 1) {
        onSelectedStaffChange(selectedStaffIds.filter((s) => s !== id));
      }
    } else {
      onSelectedStaffChange([...selectedStaffIds, id]);
    }
  };

  const toggleAll = () => {
    if (!onSelectedStaffChange) return;
    if (selectedStaffIds.length === staffList.length) return;
    onSelectedStaffChange(staffList.map((s) => s.id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onPrev}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <h1 className="font-heading text-xl md:text-2xl text-foreground">{formatHeaderDate()}</h1>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Staff Filter */}
        {showStaffFilter && staffList.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="w-4 h-4" />
                {isFullCalendar ? 'Elita Medical Spa' : `Staff (${selectedStaffIds.length})`}
                {!isFullCalendar && (
                  <div className="flex -space-x-1.5 ml-1">
                    {staffList
                      .filter((s) => selectedStaffIds.includes(s.id))
                      .slice(0, 3)
                      .map((s) => (
                        <Avatar key={s.id} className="h-5 w-5 border-2 border-background">
                          <AvatarImage src={s.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                            {s.first_name[0]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    {selectedStaffIds.length > 3 && (
                      <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-medium text-muted-foreground">
                        +{selectedStaffIds.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="space-y-1">
                {/* General Staff / Spa-wide view */}
                <div className="px-2 py-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">General Staff</span>
                </div>
                <button
                  onClick={() => onFullCalendarChange?.(!isFullCalendar)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors text-sm',
                    isFullCalendar ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                  )}
                >
                  <CalendarDays className="w-4 h-4" />
                  Elita Medical Spa
                </button>

                <Separator className="my-1.5" />

                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Providers</span>
                  <button
                    onClick={() => { onFullCalendarChange?.(false); toggleAll(); }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Select All
                  </button>
                </div>
                {staffList.map((s, sIdx) => (
                  <div key={s.id} className="flex items-center gap-1">
                    <label
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors flex-1',
                        !isFullCalendar && selectedStaffIds.includes(s.id) ? 'bg-primary/5' : 'hover:bg-muted'
                      )}
                      onClick={() => { if (isFullCalendar) onFullCalendarChange?.(false); }}
                    >
                      <Checkbox
                        checked={!isFullCalendar && selectedStaffIds.includes(s.id)}
                        onCheckedChange={() => { if (isFullCalendar) onFullCalendarChange?.(false); toggleStaff(s.id); }}
                      />
                      <div
                        className="w-3 h-3 rounded-full shrink-0 border border-border"
                        style={{ backgroundColor: providerColors?.getColor(s.id, sIdx) || '#3b82f6' }}
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {s.first_name[0]}{s.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{s.first_name} {s.last_name}</span>
                    </label>
                    {providerColors && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted" title="Change color">
                            <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="end" side="right">
                          <div className="grid grid-cols-5 gap-1.5">
                            {providerColors.availableColors.map((color) => (
                              <button
                                key={color}
                                className={cn(
                                  'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                                  providerColors.getColor(s.id, sIdx) === color ? 'border-foreground scale-110' : 'border-transparent'
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => providerColors.setColor(s.id, color)}
                              />
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>

        {/* View Switcher */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          {(['day', '4day', 'week'] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                view === v
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {v === '4day' ? '4 Day' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
          Sync
        </Button>

          <Button size="sm" className="gap-2" onClick={onNewAppointment}>
            <Plus className="w-4 h-4" />
            New Appt
          </Button>
      </div>
    </motion.div>
  );
}
