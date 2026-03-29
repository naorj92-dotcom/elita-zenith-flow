import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { format, isToday, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Search, Plus, Filter, Clock, CheckCircle2, UserCheck, Activity, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface FrontDeskAppointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  total_amount: number;
  client_id: string | null;
  staff_id: string | null;
  client_name: string;
  client_avatar: string | null;
  service_name: string;
  staff_name: string;
  is_new_client: boolean;
  client_tags: string[];
}

const COLUMNS = [
  { key: 'scheduled', label: 'Unconfirmed', icon: CircleDot, color: 'text-muted-foreground' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2, color: 'text-emerald-500' },
  { key: 'checked_in', label: 'Arrived', icon: UserCheck, color: 'text-sky-500' },
  { key: 'in_progress', label: 'Active', icon: Activity, color: 'text-primary' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-muted-foreground' },
] as const;

export function FrontDeskPage() {
  const { staff } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState<FrontDeskAppointment[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('get_staff_public_info').then(({ data }) => {
      if (data) setStaffList(data);
    });
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!staff) return;
    setIsLoading(true);
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);

    const { data } = await supabase
      .from('appointments')
      .select(`
        id, scheduled_at, duration_minutes, status, notes, total_amount, staff_id, client_id,
        clients (first_name, last_name, avatar_url, visit_count, client_tags),
        services (name),
        staff (first_name, last_name)
      `)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .neq('status', 'cancelled')
      .neq('status', 'no_show')
      .order('scheduled_at', { ascending: true });

    if (data) {
      setAppointments(data.map((apt: any) => ({
        id: apt.id,
        scheduled_at: apt.scheduled_at,
        duration_minutes: apt.duration_minutes,
        status: apt.status,
        notes: apt.notes,
        total_amount: apt.total_amount,
        client_id: apt.client_id,
        staff_id: apt.staff_id,
        client_name: apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'Walk-in',
        client_avatar: apt.clients?.avatar_url || null,
        service_name: apt.services?.name || 'Service',
        staff_name: apt.staff ? `${apt.staff.first_name} ${apt.staff.last_name}` : '',
        is_new_client: apt.clients?.visit_count != null && apt.clients.visit_count <= 1,
        client_tags: apt.clients?.client_tags || [],
      })));
    }
    setIsLoading(false);
  }, [staff, selectedDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('front-desk-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAppointments]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updateData: Record<string, any> = { status: newStatus as any };
    if (newStatus === 'checked_in') updateData.checked_in_at = new Date().toISOString();
    if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();

    const { error } = await supabase.from('appointments').update(updateData).eq('id', id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Appointment ${newStatus.replace('_', ' ')}`);
      fetchAppointments();
    }
  };

  const filtered = appointments.filter(a => {
    if (selectedStaffFilter !== 'all' && a.staff_id !== selectedStaffFilter) return false;
    if (searchFilter && !a.client_name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  const getColumnAppointments = (status: string) => filtered.filter(a => a.status === status);

  const getNextStatus = (current: string): string | null => {
    const flow: Record<string, string> = {
      scheduled: 'confirmed',
      confirmed: 'checked_in',
      checked_in: 'in_progress',
      in_progress: 'completed',
    };
    return flow[current] || null;
  };

  const isLate = (apt: FrontDeskAppointment) => {
    if (apt.status !== 'scheduled' && apt.status !== 'confirmed') return false;
    const scheduledTime = new Date(apt.scheduled_at);
    return new Date() > scheduledTime;
  };

  const minutesLate = (apt: FrontDeskAppointment) => {
    const diff = Math.round((new Date().getTime() - new Date(apt.scheduled_at).getTime()) / 60000);
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="p-4 md:p-6 max-w-full h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Date</p>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl md:text-2xl text-foreground">
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE')},{' '}
                {format(selectedDate, 'MMM d')}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter clients"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="pl-8 w-48 h-9"
            />
          </div>

          <Select value={selectedStaffFilter} onValueChange={setSelectedStaffFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Staff: ALL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Staff: ALL</SelectItem>
              {staffList.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setSelectedDate(d); }}>
            Today
          </Button>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(prev => subDays(prev, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(prev => addDays(prev, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => navigate('/schedule')}>
            Schedule
          </Button>

          <Button size="sm" className="gap-2" onClick={() => navigate('/schedule/new')}>
            <Plus className="w-4 h-4" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-[900px]">
          {COLUMNS.map(col => {
            const colAppts = getColumnAppointments(col.key);
            return (
              <div key={col.key} className="flex-1 min-w-[200px] flex flex-col">
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <col.icon className={cn('w-4 h-4', col.color)} />
                  <h2 className="font-heading font-semibold text-sm text-foreground">{col.label}</h2>
                  <Badge variant="secondary" className="text-xs h-5 px-1.5 rounded-full">
                    {colAppts.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 overflow-y-auto pb-4">
                  <AnimatePresence>
                    {colAppts.map(apt => {
                      const nextStatus = getNextStatus(apt.status);
                      const late = isLate(apt);
                      const lateMins = minutesLate(apt);

                      return (
                        <motion.div
                          key={apt.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            'bg-card border border-border/60 rounded-xl p-3.5 cursor-pointer hover:shadow-md transition-shadow group',
                            late && 'border-destructive/40'
                          )}
                          onClick={() => apt.client_id && navigate(`/clients/${apt.client_id}`)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage src={apt.client_avatar || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {apt.client_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(apt.scheduled_at), 'h:mma').toLowerCase()}
                                </span>
                                {late && (
                                  <span className="text-xs font-medium text-destructive">
                                    ({lateMins}m late)
                                  </span>
                                )}
                              </div>
                              <p className="font-medium text-sm text-foreground truncate">
                                {apt.client_name}
                              </p>
                              {apt.is_new_client && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 mt-0.5 border-amber-300 text-amber-600 dark:text-amber-400">
                                  ⭐ New
                                </Badge>
                              )}
                            </div>

                            {/* Quick action badges */}
                            <div className="flex items-center gap-1 shrink-0">
                              {apt.client_tags?.includes('vip') && (
                                <span className="text-amber-500 text-xs">👑</span>
                              )}
                            </div>
                          </div>

                          {/* Action button */}
                          {nextStatus && (
                            <Button
                              size="sm"
                              variant={col.key === 'scheduled' ? 'default' : 'outline'}
                              className="w-full mt-2.5 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(apt.id, nextStatus);
                              }}
                            >
                              {col.key === 'scheduled' && 'Confirm'}
                              {col.key === 'confirmed' && 'Check In'}
                              {col.key === 'checked_in' && 'Start Service'}
                              {col.key === 'in_progress' && 'Complete'}
                            </Button>
                          )}

                          {col.key === 'completed' && (
                            <div className="mt-1.5">
                              <span className="text-[11px] text-muted-foreground">
                                {format(new Date(apt.scheduled_at), 'h:mma')} – {format(new Date(new Date(apt.scheduled_at).getTime() + apt.duration_minutes * 60000), 'h:mma')}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {colAppts.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      No appointments
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
