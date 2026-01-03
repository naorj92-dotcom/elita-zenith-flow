import React from 'react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfWeek } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DateRange {
  preset: 'today' | 'last_7_days' | 'this_week' | 'this_month' | 'last_month' | 'custom';
  startDate: Date;
  endDate: Date;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const handlePresetChange = (preset: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate = endOfDay(now);

    switch (preset) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'last_7_days':
        startDate = startOfDay(subDays(now, 6));
        break;
      case 'this_week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'this_month':
        startDate = startOfMonth(now);
        break;
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth;
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        startDate = value.startDate;
        endDate = value.endDate;
    }

    onChange({
      preset: preset as DateRange['preset'],
      startDate,
      endDate
    });
  };

  const presetLabels: Record<string, string> = {
    today: 'Today',
    last_7_days: 'Last 7 Days',
    this_week: 'This Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    custom: 'Custom Range'
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px] bg-background">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="last_7_days">Last 7 Days</SelectItem>
          <SelectItem value="this_week">This Week</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {value.preset === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !value.startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.startDate ? (
                <>
                  {format(value.startDate, "MMM d")} - {format(value.endDate, "MMM d, yyyy")}
                </>
              ) : (
                <span>Pick dates</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value.startDate}
              selected={{ from: value.startDate, to: value.endDate }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onChange({
                    preset: 'custom',
                    startDate: range.from,
                    endDate: range.to
                  });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}

      <div className="text-xs text-muted-foreground hidden sm:block">
        {format(value.startDate, "MMM d")} – {format(value.endDate, "MMM d, yyyy")}
      </div>
    </div>
  );
}
