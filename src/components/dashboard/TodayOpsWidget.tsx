import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Users, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  ChevronRight,
  UserCheck,
  Play,
  CalendarCheck,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, MembershipBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

interface TodayAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  client_name: string;
  client_id: string;
  is_vip: boolean;
  service_name: string;
  staff_name: string;
  room_name: string | null;
  machine_name: string | null;
  total_amount: number;
  duration_minutes: number;
}

interface TodayOpsData {
  arrivals: TodayAppointment[];
  needsCheckout: TodayAppointment[];
  needsRebook: TodayAppointment[];
  lateArrivals: TodayAppointment[];
  outstandingBalances: { clientName: string; amount: number; clientId: string }[];
}

export function TodayOpsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['today-ops'],
    queryFn: async (): Promise<TodayOpsData> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          status,
          duration_minutes,
          total_amount,
          rebooked_to_id,
          clients (id, first_name, last_name, is_vip),
          services (name),
          staff (first_name, last_name),
          rooms (name),
          machines (name)
        `)
        .gte('scheduled_at', today.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .order('scheduled_at', { ascending: true });

      const formatted = (appointments || []).map((apt: any) => ({
        id: apt.id,
        scheduled_at: apt.scheduled_at,
        status: apt.status,
        client_name: apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'Unknown',
        client_id: apt.clients?.id,
        is_vip: apt.clients?.is_vip || false,
        service_name: apt.services?.name || 'Service',
        staff_name: apt.staff ? `${apt.staff.first_name} ${apt.staff.last_name}` : '',
        room_name: apt.rooms?.name || null,
        machine_name: apt.machines?.name || null,
        total_amount: apt.total_amount || 0,
        duration_minutes: apt.duration_minutes || 0,
        rebooked_to_id: apt.rebooked_to_id,
      }));

      const now = new Date();
      
      // Categorize appointments
      const arrivals = formatted.filter((a: any) => 
        ['scheduled', 'confirmed'].includes(a.status)
      );
      
      const lateArrivals = arrivals.filter((a: any) => {
        const aptTime = new Date(a.scheduled_at);
        return aptTime < now && now.getTime() - aptTime.getTime() > 10 * 60 * 1000; // 10 min late
      });
      
      const needsCheckout = formatted.filter((a: any) => 
        a.status === 'in_progress' || a.status === 'checked_in'
      );
      
      const needsRebook = formatted.filter((a: any) => 
        a.status === 'completed' && !a.rebooked_to_id
      );

      return {
        arrivals,
        needsCheckout,
        needsRebook,
        lateArrivals,
        outstandingBalances: [], // Could be expanded to track unpaid invoices
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasActivity = data && (
    data.arrivals.length > 0 || 
    data.needsCheckout.length > 0 || 
    data.needsRebook.length > 0
  );

  if (!hasActivity) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Today's Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={CalendarCheck}
            title="All caught up"
            description="No pending operations for today. Your schedule is clear."
            compact
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Today's Operations
          </CardTitle>
          <Link to="/schedule" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            View Schedule →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <QuickStat 
            icon={Users} 
            label="Arrivals" 
            value={data?.arrivals.length || 0}
            alert={data?.lateArrivals.length ? `${data.lateArrivals.length} late` : undefined}
          />
          <QuickStat 
            icon={Play} 
            label="In Treatment" 
            value={data?.needsCheckout.length || 0}
          />
          <QuickStat 
            icon={RefreshCw} 
            label="Need Rebook" 
            value={data?.needsRebook.length || 0}
            highlight={data?.needsRebook.length ? true : false}
          />
        </div>

        {/* Late Arrivals Alert */}
        {data?.lateArrivals && data.lateArrivals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-warning/10 border border-warning/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium text-warning">Late Arrivals</span>
            </div>
            <div className="space-y-1">
              {data.lateArrivals.slice(0, 2).map(apt => (
                <Link 
                  key={apt.id} 
                  to={`/schedule/${apt.id}`}
                  className="flex items-center justify-between text-sm py-1 hover:bg-warning/5 rounded px-2 -mx-2 transition-colors"
                >
                  <span className="text-foreground">{apt.client_name}</span>
                  <span className="text-warning text-xs">
                    {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Needs Checkout */}
        {data?.needsCheckout && data.needsCheckout.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Ready for Checkout
            </p>
            <div className="space-y-2">
              {data.needsCheckout.slice(0, 3).map(apt => (
                <Link
                  key={apt.id}
                  to={`/pos?appointment=${apt.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{apt.client_name}</span>
                        {apt.is_vip && <MembershipBadge isVip />}
                      </div>
                      <p className="text-xs text-muted-foreground">{apt.service_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">${apt.total_amount}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Needs Rebook */}
        {data?.needsRebook && data.needsRebook.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Rebook Before Leaving
            </p>
            <div className="space-y-2">
              {data.needsRebook.slice(0, 2).map(apt => (
                <Link
                  key={apt.id}
                  to={`/schedule/new?client=${apt.client_id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-dashed border-primary/30 hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="font-medium text-sm">{apt.client_name}</span>
                      <p className="text-xs text-muted-foreground">{apt.service_name}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-primary">
                    Rebook
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickStat({ 
  icon: Icon, 
  label, 
  value, 
  alert,
  highlight 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: number;
  alert?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg text-center",
      highlight ? "bg-primary/10" : "bg-muted/50"
    )}>
      <div className="flex items-center justify-center gap-1 mb-1">
        <Icon className={cn(
          "w-4 h-4",
          highlight ? "text-primary" : "text-muted-foreground"
        )} />
        <span className={cn(
          "text-xl font-semibold",
          highlight ? "text-primary" : "text-foreground"
        )}>
          {value}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {alert && (
        <p className="text-xs text-warning font-medium mt-1">{alert}</p>
      )}
    </div>
  );
}
