import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ReportDateRange } from '@/pages/StaffReportsPage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { differenceInMinutes } from 'date-fns';

interface Props { dateRange: ReportDateRange; staffId?: string; }

export default function ProviderPerformanceReport({ dateRange, staffId }: Props) {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [upsellLogs, setUpsellLogs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [dateRange, staffId]);

  const fetchData = async () => {
    setLoading(true);
    let apQ = supabase.from('appointments').select('id, staff_id, status, total_amount, scheduled_at')
      .gte('scheduled_at', dateRange.start.toISOString()).lte('scheduled_at', dateRange.end.toISOString());
    if (staffId) apQ = apQ.eq('staff_id', staffId);

    let tcQ = supabase.from('time_clock').select('*')
      .gte('clock_in', dateRange.start.toISOString()).lte('clock_in', dateRange.end.toISOString());
    if (staffId) tcQ = tcQ.eq('staff_id', staffId);

    let ulQ = supabase.from('upsell_logs').select('*')
      .gte('created_at', dateRange.start.toISOString()).lte('created_at', dateRange.end.toISOString());
    if (staffId) ulQ = ulQ.eq('staff_id', staffId);

    let txQ = supabase.from('transactions').select('*')
      .gte('transaction_date', dateRange.start.toISOString()).lte('transaction_date', dateRange.end.toISOString());
    if (staffId) txQ = txQ.eq('staff_id', staffId);

    const [stRes, apRes, tcRes, ulRes, txRes] = await Promise.all([
      supabase.from('staff').select('id, first_name, last_name, role'),
      apQ, tcQ, ulQ, txQ,
    ]);
    setStaffList(stRes.data || []);
    setAppointments(apRes.data || []);
    setTimeEntries(tcRes.data || []);
    setUpsellLogs(ulRes.data || []);
    setTransactions(txRes.data || []);
    setLoading(false);
  };

  const staffMap = new Map(staffList.map(s => [s.id, s]));

  // Revenue per provider
  const revByProvider: Record<string, number> = {};
  transactions.forEach(t => {
    if (!t.staff_id) return;
    revByProvider[t.staff_id] = (revByProvider[t.staff_id] || 0) + Number(t.amount);
  });

  // Appointments per provider
  const apptsPerProvider: Record<string, number> = {};
  appointments.filter(a => a.status === 'completed').forEach(a => {
    if (!a.staff_id) return;
    apptsPerProvider[a.staff_id] = (apptsPerProvider[a.staff_id] || 0) + 1;
  });

  // Hours per provider
  const hoursPerProvider: Record<string, number> = {};
  timeEntries.forEach(e => {
    if (!e.staff_id || !e.clock_out) return;
    const mins = differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in)) - (e.break_minutes || 0);
    hoursPerProvider[e.staff_id] = (hoursPerProvider[e.staff_id] || 0) + mins / 60;
  });

  // Upsell acceptance per provider
  const upsellByProvider: Record<string, { shown: number; accepted: number }> = {};
  upsellLogs.forEach(u => {
    if (!u.staff_id) return;
    if (!upsellByProvider[u.staff_id]) upsellByProvider[u.staff_id] = { shown: 0, accepted: 0 };
    upsellByProvider[u.staff_id].shown++;
    if (u.action === 'accepted') upsellByProvider[u.staff_id].accepted++;
  });

  const providerIds = [...new Set([...Object.keys(revByProvider), ...Object.keys(apptsPerProvider)])];

  const revenueChartData = providerIds.map(id => {
    const s = staffMap.get(id);
    return { name: s ? `${s.first_name} ${s.last_name?.charAt(0)}.` : 'Unknown', revenue: revByProvider[id] || 0 };
  }).sort((a, b) => b.revenue - a.revenue);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Revenue by Provider</CardTitle></CardHeader>
        <CardContent>
          {revenueChartData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(33,18%,87%)" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(24,12%,48%)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(24,12%,48%)', fontSize: 12 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill="hsl(22,20%,34%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-center py-8">No data</p>}
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Provider Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Provider</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Appts</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Hours</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Upsell Rate</th>
                </tr>
              </thead>
              <tbody>
                {providerIds.map(id => {
                  const s = staffMap.get(id);
                  const upsell = upsellByProvider[id];
                  const rate = upsell && upsell.shown > 0 ? Math.round((upsell.accepted / upsell.shown) * 100) : null;
                  return (
                    <tr key={id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2 font-medium">{s ? `${s.first_name} ${s.last_name}` : 'Unknown'}</td>
                      <td className="py-3 px-2 text-right">{fmt(revByProvider[id] || 0)}</td>
                      <td className="py-3 px-2 text-right">{apptsPerProvider[id] || 0}</td>
                      <td className="py-3 px-2 text-right">{(hoursPerProvider[id] || 0).toFixed(1)}h</td>
                      <td className="py-3 px-2 text-right">{rate !== null ? `${rate}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
