import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ClipboardList, Clock, CalendarIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ClientWaitlistPage() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [preferredDate, setPreferredDate] = useState<Date | undefined>(undefined);
  const [timeRange, setTimeRange] = useState('');
  const [notes, setNotes] = useState('');

  const { data: services = [] } = useQuery({
    queryKey: ['waitlist-services'],
    queryFn: async () => {
      const { data } = await supabase.from('services').select('id, name').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['waitlist-staff'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('id, first_name, last_name').eq('is_active', true).order('first_name');
      return data || [];
    },
  });

  const { data: myWaitlist = [] } = useQuery({
    queryKey: ['my-waitlist', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('waitlist')
        .select('*, services(name), staff:preferred_staff_id(first_name, last_name)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!client?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('waitlist').insert({
        client_id: client.id,
        service_id: selectedService || null,
        preferred_staff_id: selectedStaff || null,
        preferred_date: preferredDate ? format(preferredDate, 'yyyy-MM-dd') : null,
        preferred_time_range: timeRange || null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-waitlist'] });
      toast.success('Added to waitlist!');
      setSelectedService('');
      setSelectedStaff('');
      setPreferredDate(undefined);
      setTimeRange('');
      setNotes('');
    },
    onError: () => toast.error('Failed to join waitlist'),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Join Waitlist</h1>
            <p className="text-sm text-muted-foreground">Get notified when your preferred slot opens up</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request a Spot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Service (optional)</label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger><SelectValue placeholder="Any service" /></SelectTrigger>
              <SelectContent>
                {services.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Preferred Provider (optional)</label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger><SelectValue placeholder="Any provider" /></SelectTrigger>
              <SelectContent>
                {staff.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Preferred Date (optional)</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {preferredDate ? format(preferredDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={preferredDate} onSelect={setPreferredDate} disabled={(d) => d < new Date()} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Preferred Time</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger><SelectValue placeholder="Any time" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning (9am - 12pm)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12pm - 3pm)</SelectItem>
                <SelectItem value="evening">Evening (3pm - 6pm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes (optional)</label>
            <Textarea placeholder="Any special requests..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>

          <Button className="w-full" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
            {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardList className="w-4 h-4 mr-2" />}
            Join Waitlist
          </Button>
        </CardContent>
      </Card>

      {/* My Waitlist Entries */}
      {myWaitlist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Waitlist Entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myWaitlist.map((entry: any) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{entry.services?.name || 'Any Service'}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.preferred_date ? format(new Date(entry.preferred_date), 'MMM d, yyyy') : 'Flexible date'}
                    {entry.preferred_time_range ? ` · ${entry.preferred_time_range}` : ''}
                  </p>
                </div>
                <Badge variant={entry.status === 'waiting' ? 'secondary' : 'default'}>
                  {entry.status === 'waiting' ? 'Waiting' : entry.status === 'contacted' ? 'Contacted' : entry.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
