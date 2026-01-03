import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText } from 'lucide-react';
import { DateRange } from './DateRangeFilter';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PDFExportButtonProps {
  dateRange: DateRange;
}

export function PDFExportButton({ dateRange }: PDFExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      // Fetch all required data
      const [transactions, staff, timeClock, appointments, products, clientPackages, machines] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .gte('transaction_date', dateRange.startDate.toISOString())
          .lte('transaction_date', dateRange.endDate.toISOString()),
        supabase.from('staff').select('*').eq('is_active', true),
        supabase
          .from('time_clock')
          .select('*, staff(hourly_rate, first_name, last_name)')
          .gte('clock_in', dateRange.startDate.toISOString())
          .lte('clock_in', dateRange.endDate.toISOString()),
        supabase
          .from('appointments')
          .select('*, clients(first_name, last_name, visit_count, created_at)')
          .gte('scheduled_at', dateRange.startDate.toISOString())
          .lte('scheduled_at', dateRange.endDate.toISOString())
          .in('status', ['completed']),
        supabase.from('products').select('*').eq('is_active', true),
        supabase.from('client_packages').select('*, packages(name, price)').eq('status', 'active'),
        supabase.from('machines').select('*').eq('status', 'active')
      ]);

      // Calculate metrics
      const txData = transactions.data || [];
      const serviceSales = txData.filter(t => t.transaction_type === 'service').reduce((s, t) => s + Number(t.amount), 0);
      const retailSales = txData.filter(t => t.transaction_type === 'retail').reduce((s, t) => s + Number(t.amount), 0);
      const refunds = txData.filter(t => t.transaction_type === 'refund').reduce((s, t) => s + Number(t.amount), 0);
      const totalGross = serviceSales + retailSales - refunds;
      const transactionCount = txData.filter(t => t.transaction_type !== 'refund').length;
      const atv = transactionCount > 0 ? totalGross / transactionCount : 0;

      // COGS & Labor
      const cogs = (serviceSales * 0.20) + (retailSales * 0.50);
      const labor = (timeClock.data || []).reduce((sum, tc) => {
        const staffInfo = tc.staff as { hourly_rate: number } | null;
        const rate = staffInfo?.hourly_rate || 0;
        const clockIn = new Date(tc.clock_in);
        const clockOut = tc.clock_out ? new Date(tc.clock_out) : new Date();
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        return sum + (hours * rate);
      }, 0);
      const netProfit = totalGross - cogs - labor;

      // Client stats
      const uniqueClients = new Set(appointments.data?.map(a => (a.clients as any)?.id).filter(Boolean));
      const newClients = (appointments.data || []).filter(a => {
        const client = a.clients as { created_at: string } | null;
        if (!client) return false;
        const createdAt = new Date(client.created_at);
        return createdAt >= dateRange.startDate && createdAt <= dateRange.endDate;
      }).length;

      // Low stock
      const lowStock = (products.data || []).filter(p => p.quantity_in_stock <= p.reorder_level);

      // Package liability
      const packageLiability = (clientPackages.data || []).reduce((sum, cp) => {
        const remaining = (cp.sessions_total || 0) - (cp.sessions_used || 0);
        const pkg = cp.packages as { price: number } | null;
        const pricePerSession = pkg ? Number(pkg.price) / (cp.sessions_total || 1) : 0;
        return sum + (remaining * pricePerSession);
      }, 0);

      // Generate HTML for PDF
      const html = generateReportHTML({
        dateRange,
        totalGross,
        serviceSales,
        retailSales,
        atv,
        transactionCount,
        cogs,
        labor,
        netProfit,
        totalClients: uniqueClients.size,
        newClients,
        completedAppointments: appointments.data?.length || 0,
        lowStockCount: lowStock.length,
        packageLiability,
        machineCount: machines.data?.length || 0
      });

      // Create and download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Elite-MedSpa-EOD-Report-${format(dateRange.endDate, 'yyyy-MM-dd')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={generatePDF} disabled={loading} className="gap-2">
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Download EOD Report
    </Button>
  );
}

interface ReportData {
  dateRange: DateRange;
  totalGross: number;
  serviceSales: number;
  retailSales: number;
  atv: number;
  transactionCount: number;
  cogs: number;
  labor: number;
  netProfit: number;
  totalClients: number;
  newClients: number;
  completedAppointments: number;
  lowStockCount: number;
  packageLiability: number;
  machineCount: number;
}

function generateReportHTML(data: ReportData): string {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (date: Date) => format(date, 'MMMM d, yyyy');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Elite MedSpa - End of Day Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #fafafa;
      color: #1a1a1a;
      line-height: 1.6;
      padding: 40px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 600;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    
    .header .tagline {
      font-size: 12px;
      letter-spacing: 4px;
      text-transform: uppercase;
      opacity: 0.8;
      margin-bottom: 24px;
    }
    
    .header .report-title {
      font-size: 18px;
      font-weight: 500;
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 20px;
      margin-top: 20px;
    }
    
    .header .date-range {
      font-size: 14px;
      opacity: 0.7;
      margin-top: 8px;
    }
    
    .content { padding: 40px; }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e5e5;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .metric-card {
      background: #f8f8f8;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e5e5e5;
    }
    
    .metric-card.highlight {
      background: linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%);
      border-color: #cce0ff;
    }
    
    .metric-card.success {
      background: linear-gradient(135deg, #f0fff4 0%, #e6ffed 100%);
      border-color: #c6f6d5;
    }
    
    .metric-card.warning {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border-color: #fde68a;
    }
    
    .metric-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 4px;
    }
    
    .metric-value {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    .metric-value.positive { color: #059669; }
    .metric-value.negative { color: #dc2626; }
    
    .footer {
      background: #f8f8f8;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #e5e5e5;
    }
    
    .footer p { margin-bottom: 4px; }
    
    .divider {
      height: 1px;
      background: #e5e5e5;
      margin: 24px 0;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .summary-row:last-child { border-bottom: none; }
    
    .summary-label { color: #666; }
    .summary-value { font-weight: 600; }
    
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ELITE MEDSPA</h1>
      <div class="tagline">Elevate Your Beauty</div>
      <div class="report-title">End of Day Financial Report</div>
      <div class="date-range">${formatDate(data.dateRange.startDate)} – ${formatDate(data.dateRange.endDate)}</div>
    </div>
    
    <div class="content">
      <div class="section">
        <h2 class="section-title">Revenue Overview</h2>
        <div class="metrics-grid">
          <div class="metric-card highlight">
            <div class="metric-label">Total Gross Sales</div>
            <div class="metric-value">${formatCurrency(data.totalGross)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Average Ticket Value</div>
            <div class="metric-value">${formatCurrency(data.atv)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Service Revenue</div>
            <div class="metric-value">${formatCurrency(data.serviceSales)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Retail Revenue</div>
            <div class="metric-value">${formatCurrency(data.retailSales)}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">Profitability Analysis</h2>
        <div class="summary-row">
          <span class="summary-label">Gross Revenue</span>
          <span class="summary-value">${formatCurrency(data.totalGross)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Cost of Goods Sold (Est.)</span>
          <span class="summary-value" style="color: #dc2626;">-${formatCurrency(data.cogs)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Labor Costs</span>
          <span class="summary-value" style="color: #dc2626;">-${formatCurrency(data.labor)}</span>
        </div>
        <div class="divider"></div>
        <div class="summary-row">
          <span class="summary-label" style="font-weight: 600;">Net Profit</span>
          <span class="summary-value ${data.netProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.netProfit)}</span>
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">Operational Metrics</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Transactions</div>
            <div class="metric-value">${data.transactionCount}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Completed Appointments</div>
            <div class="metric-value">${data.completedAppointments}</div>
          </div>
          <div class="metric-card ${data.newClients > 0 ? 'success' : ''}">
            <div class="metric-label">New Clients</div>
            <div class="metric-value">${data.newClients}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Clients Served</div>
            <div class="metric-value">${data.totalClients}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">Alerts & Liabilities</h2>
        <div class="metrics-grid">
          <div class="metric-card ${data.lowStockCount > 0 ? 'warning' : 'success'}">
            <div class="metric-label">Low Stock Products</div>
            <div class="metric-value">${data.lowStockCount}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Package Liability</div>
            <div class="metric-value">${formatCurrency(data.packageLiability)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Active Machines</div>
            <div class="metric-value">${data.machineCount}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Elite MedSpa</strong></p>
      <p>123 Luxury Lane, Suite 100 • Beverly Hills, CA 90210</p>
      <p>(310) 555-0123 • www.elitemedspa.com</p>
      <p style="margin-top: 12px; opacity: 0.7;">Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
    </div>
  </div>
</body>
</html>
  `;
}
