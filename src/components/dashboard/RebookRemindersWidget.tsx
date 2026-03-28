import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function RebookRemindersWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: reminders = [] } = useQuery({
    queryKey: ['rebook-reminders-due', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rebook_reminders')
        .select('*, clients(first_name, last_name), services(name)')
        .eq('status', 'pending')
        .lte('remind_at', today)
        .order('suggested_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rebook_reminders')
        .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebook-reminders-due'] });
      toast.success('Reminder dismissed');
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rebook_reminders')
        .update({ status: 'actioned' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebook-reminders-due'] });
    },
  });

  const handleBook = (reminder: any) => {
    actionMutation.mutate(reminder.id);
    const params = new URLSearchParams({
      client: reminder.client_id,
      service: reminder.service_id,
      ...(reminder.staff_id ? { staff: reminder.staff_id } : {}),
      date: reminder.suggested_date,
    });
    navigate(`/schedule?${params.toString()}`);
  };

  if (reminders.length === 0) return null;

  return (
    <Card className="card-luxury border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Rebooking Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.map((r: any) => {
          const clientName = r.clients
            ? `${r.clients.first_name} ${r.clients.last_name}`
            : 'Client';
          const serviceName = r.services?.name || 'Service';
          return (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {clientName} is due for {serviceName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Suggested: {format(parseISO(r.suggested_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" onClick={() => handleBook(r)}>
                  Book Now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => dismissMutation.mutate(r.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
