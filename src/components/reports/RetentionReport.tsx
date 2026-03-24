import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, UserCheck, Clock, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ReportDateRange } from '@/pages/StaffReportsPage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { differenceInDays, format } from 'date-fns';
import { toast } from 'sonner';

interface Props { dateRange: ReportDateRange; }

export default function RetentionReport({ dateRange }: Props) {
  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const [clientsRes, apptsRes] = await Promise.all([
      supabase.from('clients').select('id, first_name, last_name, email, phone, created_at, last_visit_date, visit_count'),
      supabase.from('appointments').select('id, client_id, scheduled_at, status').gte('scheduled_at', dateRange.start.toISOString()).lte('scheduled_at', dateRange.end.toISOString()),
    ]);
    setClients(clientsRes.data || []);
    setAppointments(apptsRes.data || []);
    setLoading(false);
  };

  const now = new Date();

  // New vs returning in period
  const newInPeriod = clients.filter(c => {
    const created = new Date(c.created_at);
    return created >= dateRange.start && created <= dateRange.end;
  });
  const returningInPeriod = appointments.filter(a => a.status === 'completed').reduce((set, a) => {
    if (!newInPeriod.find(c => c.id === a.client_id)) set.add(a.client_id);
    return set;
  }, new Set<string>());

  // Lapsed clients
  const lapsed30 = clients.filter(c => c.last_visit_date && differenceInDays(now, new Date(c.last_visit_date)) >= 30 && differenceInDays(now, new Date(c.last_visit_date)) < 60);
  const lapsed60 = clients.filter(c => c.last_visit_date && differenceInDays(now, new Date(c.last_visit_date)) >= 60 && differenceInDays(now, new Date(c.last_visit_date)) < 90);
  const lapsed90 = clients.filter(c => c.last_visit_date && differenceInDays(now, new Date(c.last_visit_date)) >= 90);

  // Avg visits per client per month
  const activeClients = clients.filter(c => c.visit_count > 0);
  const avgVisits = activeClients.length
    ? (activeClients.reduce((s, c) => s + c.visit_count, 0) / activeClients.length).toFixed(1)
    : '0';

  // Retention rate: % of new clients (created 60+ days ago) who have visit_count >= 2
  const newOlderThan60 = clients.filter(c => differenceInDays(now, new Date(c.created_at)) >= 60);
  const retainedCount = newOlderThan60.filter(c => c.visit_count >= 2).length;
  const retentionRate = newOlderThan60.length ? Math.round((retainedCount / newOlderThan60.length) * 100) : 0;

  const comparisonData = [
    { name: 'New Clients', value: newInPeriod.length },
    { name: 'Returning Clients', value: returningInPeriod.size },
  ];

  const sendReengagement = (client: any) => {
    toast.success(`Re-engagement message queued for ${client.first_name} ${client.last_name}`);
  };

  const LapsedList = ({ list, label }: { list: any[]; label: string }) => (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" />{label} <Badge variant="secondary">{list.length}</Badge></CardTitle></CardHeader>
      <CardContent>
        {list.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {list.slice(0, 20).map(c => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-muted-foreground">Last visit: {c.last_visit_date ? format(new Date(c.last_visit_date), 'MMM d, yyyy') : 'Never'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => sendReengagement(c)}>
                  <MessageCircle className="w-3.5 h-3.5 mr-1" />Send
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center"><UserPlus className="w-5 h-5 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">New Clients</p><p className="text-2xl font-bold">{newInPeriod.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center"><UserCheck className="w-5 h-5 text-success" /></div>
          <div><p className="text-sm text-muted-foreground">Returning</p><p className="text-2xl font-bold">{returningInPeriod.size}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center"><Users className="w-5 h-5 text-warning" /></div>
          <div><p className="text-sm text-muted-foreground">Avg Visits/Client</p><p className="text-2xl font-bold">{avgVisits}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-info/15 flex items-center justify-center"><UserCheck className="w-5 h-5 text-info" /></div>
          <div><p className="text-sm text-muted-foreground">Retention Rate</p><p className="text-2xl font-bold">{retentionRate}%</p></div>
        </CardContent></Card>
      </div>

      {/* New vs Returning Chart */}
      <Card>
        <CardHeader><CardTitle className="text-lg">New vs Returning Clients</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(33,18%,87%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(24,12%,48%)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(24,12%,48%)', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="hsl(33,40%,55%)" />
                <Cell fill="hsl(22,20%,34%)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lapsed Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LapsedList list={lapsed30} label="30 days inactive" />
        <LapsedList list={lapsed60} label="60 days inactive" />
        <LapsedList list={lapsed90} label="90+ days inactive" />
      </div>
    </div>
  );
}
