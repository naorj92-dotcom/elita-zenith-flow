import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Sun, Droplets, ShieldCheck, Info, CheckCircle2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';

const iconMap: Record<string, React.ReactNode> = {
  sun: <Sun className="h-4 w-4" />,
  hydrate: <Droplets className="h-4 w-4" />,
  protect: <ShieldCheck className="h-4 w-4" />,
  check: <CheckCircle2 className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

export function AftercareTipsWidget() {
  const { client } = useClientAuth();

  // Get the most recent completed appointment
  const { data: lastAppointment } = useQuery({
    queryKey: ['client-last-completed', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data } = await supabase
        .from('appointments')
        .select('*, services(id, name)')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!client?.id,
  });

  // Get aftercare tips for that service
  const { data: tips } = useQuery({
    queryKey: ['aftercare-tips', lastAppointment?.service_id],
    queryFn: async () => {
      if (!lastAppointment?.service_id) return [];
      const { data } = await supabase
        .from('aftercare_tips' as any)
        .select('*')
        .eq('service_id', lastAppointment.service_id)
        .order('day_number', { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!lastAppointment?.service_id,
  });

  if (!lastAppointment || !tips || tips.length === 0) return null;

  const daysSinceTreatment = differenceInDays(new Date(), new Date(lastAppointment.completed_at || lastAppointment.scheduled_at));
  
  // Only show tips for the first 14 days
  if (daysSinceTreatment > 14) return null;

  // Find today's relevant tip
  const todaysTip = tips.find((t: any) => t.day_number === daysSinceTreatment + 1);
  const upcomingTips = tips.filter((t: any) => t.day_number > daysSinceTreatment + 1).slice(0, 2);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" />
        <h3 className="font-heading font-semibold text-lg">Aftercare Tips</h3>
        <Badge variant="outline" className="text-xs">
          Day {daysSinceTreatment + 1} after {lastAppointment.services?.name}
        </Badge>
      </div>

      {todaysTip && (
        <Card className="card-luxury border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-0.5">
                {iconMap[todaysTip.icon] || iconMap.info}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground text-xs">Today</Badge>
                  <h4 className="font-semibold text-sm">{todaysTip.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{todaysTip.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {upcomingTips.length > 0 && (
        <div className="space-y-2">
          {upcomingTips.map((tip: any) => (
            <Card key={tip.id} className="card-luxury opacity-70">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    {iconMap[tip.icon] || iconMap.info}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Day {tip.day_number}: {tip.title}</p>
                    <p className="text-xs text-muted-foreground">{tip.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
