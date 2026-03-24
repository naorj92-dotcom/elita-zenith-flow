import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Crown, Gift, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ReportDateRange } from '@/pages/StaffReportsPage';
import { addDays, format } from 'date-fns';

interface Props { dateRange: ReportDateRange; }

export default function PackagesMembershipsReport({ dateRange }: Props) {
  const [clientPackages, setClientPackages] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [clientMemberships, setClientMemberships] = useState<any[]>([]);
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const [cpRes, mRes, cmRes, gcRes, clRes, pkRes] = await Promise.all([
      supabase.from('client_packages').select('*'),
      supabase.from('memberships').select('*'),
      supabase.from('client_memberships').select('*'),
      supabase.from('gift_cards').select('*'),
      supabase.from('clients').select('id, first_name, last_name'),
      supabase.from('packages').select('id, name'),
    ]);
    setClientPackages(cpRes.data || []);
    setMemberships(mRes.data || []);
    setClientMemberships(cmRes.data || []);
    setGiftCards(gcRes.data || []);
    setClients(clRes.data || []);
    setPackages(pkRes.data || []);
    setLoading(false);
  };

  const clientMap = new Map(clients.map(c => [c.id, c]));
  const pkgMap = new Map(packages.map(p => [p.id, p]));

  // Packages
  const activePackages = clientPackages.filter(p => p.status === 'active');
  const totalSessions = activePackages.reduce((s, p) => s + p.sessions_total, 0);
  const usedSessions = activePackages.reduce((s, p) => s + p.sessions_used, 0);
  const redemptionRate = totalSessions ? Math.round((usedSessions / totalSessions) * 100) : 0;

  const expiringIn30 = clientPackages.filter(p => {
    if (!p.expiry_date || p.status !== 'active') return false;
    const exp = new Date(p.expiry_date);
    return exp >= new Date() && exp <= addDays(new Date(), 30);
  });

  // Memberships
  const activeMemberships = clientMemberships.filter(m => m.status === 'active');
  const mrr = activeMemberships.reduce((s, cm) => {
    const mem = memberships.find(m => m.id === cm.membership_id);
    return s + (mem ? Number(mem.price) : 0);
  }, 0);
  const cancelledThisMonth = clientMemberships.filter(cm =>
    cm.cancelled_at && new Date(cm.cancelled_at) >= dateRange.start && new Date(cm.cancelled_at) <= dateRange.end
  ).length;
  const churnRate = activeMemberships.length + cancelledThisMonth > 0
    ? Math.round((cancelledThisMonth / (activeMemberships.length + cancelledThisMonth)) * 100) : 0;

  // Gift Cards
  const totalIssued = giftCards.reduce((s, g) => s + Number(g.initial_amount), 0);
  const totalRedeemed = giftCards.reduce((s, g) => s + (Number(g.initial_amount) - Number(g.remaining_amount)), 0);
  const outstandingBalance = giftCards.filter(g => g.is_active).reduce((s, g) => s + Number(g.remaining_amount), 0);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Packages Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Package className="w-5 h-5" />Active Packages</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card><CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold">{activePackages.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Sessions Redeemed</p>
            <p className="text-2xl font-bold">{usedSessions} / {totalSessions}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Redemption Rate</p>
            <p className="text-2xl font-bold">{redemptionRate}%</p>
          </CardContent></Card>
        </div>

        {expiringIn30.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Expiring in 30 Days <Badge variant="destructive">{expiringIn30.length}</Badge></CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {expiringIn30.map(p => {
                  const client = clientMap.get(p.client_id);
                  const pkg = pkgMap.get(p.package_id);
                  return (
                    <div key={p.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{client ? `${client.first_name} ${client.last_name}` : 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{pkg?.name || 'Package'} · {p.sessions_total - p.sessions_used} sessions left</p>
                      </div>
                      <Badge variant="secondary">{format(new Date(p.expiry_date), 'MMM d')}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Memberships Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Crown className="w-5 h-5" />Memberships</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Active Members</p>
            <p className="text-2xl font-bold">{activeMemberships.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">MRR</p>
            <p className="text-2xl font-bold">{fmt(mrr)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Churn Rate</p>
            <p className="text-2xl font-bold">{churnRate}%</p>
          </CardContent></Card>
        </div>
      </div>

      {/* Gift Cards Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Gift className="w-5 h-5" />Gift Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Total Issued</p>
            <p className="text-2xl font-bold">{fmt(totalIssued)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Total Redeemed</p>
            <p className="text-2xl font-bold">{fmt(totalRedeemed)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold">{fmt(outstandingBalance)}</p>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
