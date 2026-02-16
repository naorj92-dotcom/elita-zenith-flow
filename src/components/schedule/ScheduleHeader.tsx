import React from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
}

export function ScheduleHeader({
  selectedDate,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onSync,
  isSyncing,
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

      <div className="flex items-center gap-2">
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

        <Link to="/clients">
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="w-4 h-4" />
            New Client
          </Button>
        </Link>

        <Link to="/schedule/new">
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Appt
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
