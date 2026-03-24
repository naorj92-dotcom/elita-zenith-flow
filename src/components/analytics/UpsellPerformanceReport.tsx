import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from '@/components/analytics/DateRangeFilter';

interface UpsellPerformanceReportProps {
  dateRange: DateRange;
}

export function UpsellPerformanceReport({ dateRange }: UpsellPerformanceReportProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['upsell-logs', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upsell_logs')
        .select('*')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const shown = logs.filter(l => l.action === 'shown').length;
  const accepted = logs.filter(l => l.action === 'accepted').length;
  const skipped = logs.filter(l => l.action === 'skipped').length;
  const totalRevenue = logs
    .filter(l => l.action === 'accepted' && l.dollar_value)
    .reduce((s, l) => s + Number(l.dollar_value), 0);
  const acceptRate = shown > 0 ? Math.round((accepted / (accepted + skipped)) * 100) : 0;

  const byType = ['pair_with', 'package_reminder', 'membership_upsell'].map(type => {
    const typeShown = logs.filter(l => l.rule_type === type && l.action === 'shown').length;
    const typeAccepted = logs.filter(l => l.rule_type === type && l.action === 'accepted').length;
    const typeSkipped = logs.filter(l => l.rule_type === type && l.action === 'skipped').length;
    const typeRev = logs.filter(l => l.rule_type === type && l.action === 'accepted').reduce((s, l) => s + Number(l.dollar_value || 0), 0);
    return { type, shown: typeShown, accepted: typeAccepted, skipped: typeSkipped, revenue: typeRev };
  });

  const typeLabels: Record<string, string> = {
    pair_with: 'Pair With',
    package_reminder: 'Package Reminder',
    membership_upsell: 'Membership Upsell',
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Eye className="h-4 w-4" /> Suggestions Shown
            </div>
            <p className="text-2xl font-bold mt-1">{shown}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle className="h-4 w-4" /> Accepted
            </div>
            <p className="text-2xl font-bold mt-1">{accepted}</p>
            <p className="text-xs text-muted-foreground">{acceptRate}% accept rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <XCircle className="h-4 w-4" /> Skipped
            </div>
            <p className="text-2xl font-bold mt-1">{skipped}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" /> Upsell Revenue
            </div>
            <p className="text-2xl font-bold mt-1">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* By Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance by Rule Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Type</TableHead>
                <TableHead className="text-right">Shown</TableHead>
                <TableHead className="text-right">Accepted</TableHead>
                <TableHead className="text-right">Skipped</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Accept Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byType.map(row => {
                const rate = (row.accepted + row.skipped) > 0 ? Math.round((row.accepted / (row.accepted + row.skipped)) * 100) : 0;
                return (
                  <TableRow key={row.type}>
                    <TableCell className="font-medium">{typeLabels[row.type]}</TableCell>
                    <TableCell className="text-right">{row.shown}</TableCell>
                    <TableCell className="text-right">{row.accepted}</TableCell>
                    <TableCell className="text-right">{row.skipped}</TableCell>
                    <TableCell className="text-right">${row.revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={rate >= 30 ? 'default' : 'secondary'}>{rate}%</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Last 50 upsell interactions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Suggestion</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.filter(l => l.action !== 'shown').slice(0, 50).map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{format(new Date(log.created_at), 'MMM d, h:mm a')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{typeLabels[log.rule_type] || log.rule_type}</Badge></TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm">{log.suggestion_text}</TableCell>
                    <TableCell>
                      {log.action === 'accepted' ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Accepted</Badge>
                      ) : (
                        <Badge variant="secondary">Skipped</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{log.dollar_value ? `$${Number(log.dollar_value).toFixed(2)}` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
