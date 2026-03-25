import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign, Users, BarChart3, UserCheck, Package,
  CalendarIcon, ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import RevenueReport from '@/components/reports/RevenueReport';
import RetentionReport from '@/components/reports/RetentionReport';
import ServicePerformanceReport from '@/components/reports/ServicePerformanceReport';
import ProviderPerformanceReport from '@/components/reports/ProviderPerformanceReport';
import PackagesMembershipsReport from '@/components/reports/PackagesMembershipsReport';
import PerformanceScorecard from '@/components/reports/PerformanceScorecard';

export type ReportDateRange = { start: Date; end: Date };
type DatePreset = 'today' | 'this_week' | 'this_month' | 'custom';

export default function StaffReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { staff } = useAuth();
  const { role } = useUnifiedAuth();
  const isOwner = role === 'owner';
  const tabFromUrl = searchParams.get('tab') || 'revenue';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(startOfMonth(new Date()));
  const [customEnd, setCustomEnd] = useState(new Date());
  const [calOpen, setCalOpen] = useState(false);

  const getRange = (): ReportDateRange => {
    switch (preset) {
      case 'today': return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
      case 'this_week': return { start: startOfWeek(selectedDate, { weekStartsOn: 0 }), end: endOfWeek(selectedDate, { weekStartsOn: 0 }) };
      case 'this_month': return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
      case 'custom': return { start: startOfDay(customStart), end: endOfDay(customEnd) };
    }
  };

  const dateRange = getRange();
  const staffId = !isOwner ? staff?.id : undefined;

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    setSearchParams({ tab: v });
  };

  const navigateDate = (dir: 'prev' | 'next') => {
    const d = new Date(selectedDate);
    const delta = dir === 'next' ? 1 : -1;
    if (preset === 'today') d.setDate(d.getDate() + delta);
    else if (preset === 'this_week') d.setDate(d.getDate() + 7 * delta);
    else d.setMonth(d.getMonth() + delta);
    setSelectedDate(d);
  };

  const getDateLabel = () => {
    switch (preset) {
      case 'today': return format(selectedDate, 'EEEE, MMM d, yyyy');
      case 'this_week': {
        const r = getRange();
        return `${format(r.start, 'MMM d')} – ${format(r.end, 'MMM d, yyyy')}`;
      }
      case 'this_month': return format(selectedDate, 'MMMM yyyy');
      case 'custom': return `${format(customStart, 'MMM d')} – ${format(customEnd, 'MMM d, yyyy')}`;
    }
  };

  // Provider can only see Revenue (own) and Provider Performance (own)
  const tabs = isOwner
    ? [
        { value: 'revenue', label: 'Revenue', icon: DollarSign },
        { value: 'retention', label: 'Client Retention', icon: Users },
        { value: 'services', label: 'Service Performance', icon: BarChart3 },
        { value: 'providers', label: 'Provider Performance', icon: UserCheck },
        { value: 'packages', label: 'Packages & Memberships', icon: Package },
      ]
    : [
        { value: 'revenue', label: 'My Revenue', icon: DollarSign },
        { value: 'providers', label: 'My Performance', icon: UserCheck },
      ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {isOwner ? 'Business Reports' : 'My Reports'}
          </h1>
          <p className="text-muted-foreground mt-1">{getDateLabel()}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {preset !== 'custom' ? (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[140px]">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {getDateLabel()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { if (d) { setSelectedDate(d); setCalOpen(false); }}}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"><CalendarIcon className="w-4 h-4 mr-2" />{format(customStart, 'MMM d, yyyy')}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customStart} onSelect={(d) => { if (d) { setCustomStart(d); if (d > customEnd) setCustomEnd(d); }}} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"><CalendarIcon className="w-4 h-4 mr-2" />{format(customEnd, 'MMM d, yyyy')}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={customEnd} onSelect={(d) => { if (d) setCustomEnd(d); }} disabled={(d) => d < customStart} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 flex-wrap">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-background">
              <t.icon className="w-4 h-4 mr-2" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="revenue"><RevenueReport dateRange={dateRange} staffId={staffId} /></TabsContent>
        {isOwner && <TabsContent value="retention"><RetentionReport dateRange={dateRange} /></TabsContent>}
        {isOwner && <TabsContent value="services"><ServicePerformanceReport dateRange={dateRange} /></TabsContent>}
        <TabsContent value="providers"><ProviderPerformanceReport dateRange={dateRange} staffId={staffId} /></TabsContent>
        {isOwner && <TabsContent value="packages"><PackagesMembershipsReport dateRange={dateRange} /></TabsContent>}
      </Tabs>
    </div>
  );
}
