import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, DollarSign, TrendingUp, CreditCard, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ReportDateRange } from '@/pages/StaffReportsPage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(22,20%,34%)', 'hsl(33,40%,55%)', 'hsl(36,50%,50%)', 'hsl(148,26%,42%)', 'hsl(200,30%,50%)', 'hsl(22,12%,48%)'];

interface Props {
  dateRange: ReportDateRange;
  staffId?: string;
}

export default function RevenueReport({ dateRange, staffId }: Props) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange, staffId]);

  const fetchData = async () => {
    setLoading(true);
    let txQuery = supabase
      .from('transactions')
      .select('*')
      .gte('transaction_date', dateRange.start.toISOString())
      .lte('transaction_date', dateRange.end.toISOString());
    if (staffId) txQuery = txQuery.eq('staff_id', staffId);

    let rcQuery = supabase
      .from('receipts')
      .select('*')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
    if (staffId) rcQuery = rcQuery.eq('staff_id', staffId);

    const [txRes, rcRes] = await Promise.all([txQuery, rcQuery]);
    setTransactions(txRes.data || []);
    setReceipts(rcRes.data || []);
    setLoading(false);
  };

  const totalRevenue = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const avgTxValue = transactions.length ? totalRevenue / transactions.length : 0;

  // By type
  const byType: Record<string, number> = {};
  transactions.forEach(t => {
    const type = t.transaction_type || 'other';
    byType[type] = (byType[type] || 0) + Number(t.amount);
  });
  const typeData = Object.entries(byType).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  // Payment method breakdown from receipts
  const byPayment: Record<string, number> = {};
  receipts.forEach(r => {
    const method = r.payment_method || 'card';
    byPayment[method] = (byPayment[method] || 0) + Number(r.total_amount);
  });
  const paymentData = Object.entries(byPayment).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const exportCSV = () => {
    const rows = [['Date', 'Type', 'Amount', 'Description']];
    transactions.forEach(t => rows.push([t.transaction_date, t.transaction_type, t.amount, t.description || '']));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revenue-report.csv';
    a.click();
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center"><DollarSign className="w-5 h-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">{fmt(totalRevenue)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-warning" /></div>
            <div><p className="text-sm text-muted-foreground">Avg Transaction</p><p className="text-2xl font-bold">{fmt(avgTxValue)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center"><Receipt className="w-5 h-5 text-success" /></div>
            <div><p className="text-sm text-muted-foreground">Transactions</p><p className="text-2xl font-bold">{transactions.length}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/15 flex items-center justify-center"><CreditCard className="w-5 h-5 text-info" /></div>
            <div><p className="text-sm text-muted-foreground">Receipts</p><p className="text-2xl font-bold">{receipts.length}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Category */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Revenue by Category</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          </CardHeader>
          <CardContent>
            {typeData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(33,18%,87%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(24,12%,48%)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(24,12%,48%)', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" fill="hsl(22,20%,34%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-8">No data for this period</p>}
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {paymentData.length ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-4 mt-2">
                  {paymentData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{d.name}: {fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-muted-foreground text-center py-8">No receipts for this period</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
