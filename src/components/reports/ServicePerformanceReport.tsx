import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ReportDateRange } from '@/pages/StaffReportsPage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props { dateRange: ReportDateRange; }

export default function ServicePerformanceReport({ dateRange }: Props) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const [apptsRes, svcRes] = await Promise.all([
      supabase.from('appointments').select('id, service_id, status, total_amount, scheduled_at')
        .gte('scheduled_at', dateRange.start.toISOString())
        .lte('scheduled_at', dateRange.end.toISOString()),
      supabase.from('services').select('id, name, price, category'),
    ]);
    setAppointments(apptsRes.data || []);
    setServices(svcRes.data || []);
    setLoading(false);
  };

  const svcMap = new Map(services.map(s => [s.id, s]));

  // Aggregate
  const svcStats: Record<string, { name: string; revenue: number; bookings: number; noShows: number; cancellations: number }> = {};
  appointments.forEach(a => {
    const svc = svcMap.get(a.service_id);
    if (!svc) return;
    if (!svcStats[a.service_id]) svcStats[a.service_id] = { name: svc.name, revenue: 0, bookings: 0, noShows: 0, cancellations: 0 };
    svcStats[a.service_id].bookings++;
    if (a.status === 'completed') svcStats[a.service_id].revenue += Number(a.total_amount);
    if (a.status === 'no_show') svcStats[a.service_id].noShows++;
    if (a.status === 'cancelled') svcStats[a.service_id].cancellations++;
  });

  const allStats = Object.values(svcStats);
  const topByRevenue = [...allStats].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topByBookings = [...allStats].sort((a, b) => b.bookings - a.bookings).slice(0, 10);
  const highestCancelRate = allStats
    .filter(s => s.bookings >= 3)
    .map(s => ({ ...s, cancelRate: Math.round(((s.noShows + s.cancellations) / s.bookings) * 100) }))
    .sort((a, b) => b.cancelRate - a.cancelRate)
    .slice(0, 10);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top by Revenue */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Top 10 Services by Revenue</CardTitle></CardHeader>
          <CardContent>
            {topByRevenue.length ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topByRevenue} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(33,18%,87%)" />
                  <XAxis type="number" tick={{ fill: 'hsl(24,12%,48%)', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(24,12%,48%)', fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="revenue" fill="hsl(22,20%,34%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-8">No data</p>}
          </CardContent>
        </Card>

        {/* Top by Bookings */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Top 10 Services by Bookings</CardTitle></CardHeader>
          <CardContent>
            {topByBookings.length ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topByBookings} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(33,18%,87%)" />
                  <XAxis type="number" tick={{ fill: 'hsl(24,12%,48%)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(24,12%,48%)', fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="hsl(33,40%,55%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-8">No data</p>}
          </CardContent>
        </Card>
      </div>

      {/* Cancellation / No-show rates */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Highest Cancellation / No-show Rate</CardTitle></CardHeader>
        <CardContent>
          {highestCancelRate.length ? (
            <div className="space-y-3">
              {highestCancelRate.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.bookings} bookings · {s.noShows} no-shows · {s.cancellations} cancellations</p>
                  </div>
                  <Badge variant={s.cancelRate >= 30 ? 'destructive' : s.cancelRate >= 15 ? 'secondary' : 'outline'}>
                    {s.cancelRate}%
                  </Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-muted-foreground text-center py-8">Not enough data (min 3 bookings)</p>}
        </CardContent>
      </Card>
    </div>
  );
}
