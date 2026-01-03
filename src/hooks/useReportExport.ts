import { format, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';

interface TimeClockEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  notes: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  transaction_date: string;
  description: string | null;
  commission_amount: number | null;
}

interface ReceiptWithClient {
  id: string;
  receipt_number: string;
  service_name: string | null;
  service_price: number;
  retail_total: number;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string | null;
  created_at: string;
  machine_used: string | null;
  notes: string | null;
  clients: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

interface ReportData {
  staffName: string;
  dateRange: string;
  timeEntries: TimeClockEntry[];
  transactions: Transaction[];
  receipts: ReceiptWithClient[];
  summary: {
    totalHours: number;
    totalSales: number;
    serviceSales: number;
    retailSales: number;
    totalCommission: number;
    basePay: number;
    totalEarnings: number;
    hourlyRate: number;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatHours = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

export function useReportExport() {
  
  const exportToCSV = (data: ReportData) => {
    try {
      const lines: string[] = [];
      
      // Header
      lines.push(`Performance Report - ${data.staffName}`);
      lines.push(`Date Range: ${data.dateRange}`);
      lines.push(`Generated: ${format(new Date(), 'PPpp')}`);
      lines.push('');
      
      // Summary
      lines.push('=== SUMMARY ===');
      lines.push(`Total Earnings,${formatCurrency(data.summary.totalEarnings)}`);
      lines.push(`Total Sales,${formatCurrency(data.summary.totalSales)}`);
      lines.push(`Service Sales,${formatCurrency(data.summary.serviceSales)}`);
      lines.push(`Retail Sales,${formatCurrency(data.summary.retailSales)}`);
      lines.push(`Hours Worked,${formatHours(data.summary.totalHours)}`);
      lines.push(`Base Pay,${formatCurrency(data.summary.basePay)}`);
      lines.push(`Commission,${formatCurrency(data.summary.totalCommission)}`);
      lines.push('');
      
      // Time Entries
      lines.push('=== TIME CLOCK ENTRIES ===');
      lines.push('Date,Clock In,Clock Out,Break (min),Hours Worked');
      data.timeEntries.forEach(entry => {
        const clockIn = new Date(entry.clock_in);
        const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
        const hoursWorked = clockOut 
          ? (differenceInMinutes(clockOut, clockIn) - entry.break_minutes) / 60 
          : 0;
        lines.push(`${format(clockIn, 'MMM d yyyy')},${format(clockIn, 'h:mm a')},${clockOut ? format(clockOut, 'h:mm a') : 'Active'},${entry.break_minutes},${formatHours(hoursWorked)}`);
      });
      lines.push('');
      
      // Transactions
      lines.push('=== TRANSACTIONS ===');
      lines.push('Date,Type,Description,Amount,Commission');
      data.transactions.forEach(t => {
        lines.push(`${format(new Date(t.transaction_date), 'MMM d yyyy')},${t.transaction_type},${t.description || '-'},${formatCurrency(t.amount)},${formatCurrency(t.commission_amount || 0)}`);
      });
      lines.push('');
      
      // Receipts
      lines.push('=== RECEIPTS ===');
      lines.push('Receipt #,Date,Client,Service,Total,Payment Method');
      data.receipts.forEach(r => {
        const clientName = r.clients ? `${r.clients.first_name} ${r.clients.last_name}` : 'Walk-in';
        lines.push(`${r.receipt_number},${format(new Date(r.created_at), 'MMM d yyyy')},${clientName},${r.service_name || '-'},${formatCurrency(r.total_amount)},${r.payment_method || '-'}`);
      });
      
      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${data.staffName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const exportToPDF = (data: ReportData) => {
    try {
      // Create a printable HTML document
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to export PDF');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Performance Report - ${data.staffName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e5e5; padding-bottom: 20px; }
            .header h1 { font-size: 24px; margin-bottom: 8px; color: #1a1a1a; }
            .header p { color: #666; font-size: 14px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
            .summary-card { background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; }
            .summary-card .label { font-size: 12px; color: #666; margin-bottom: 4px; }
            .summary-card .value { font-size: 20px; font-weight: 600; color: #1a1a1a; }
            .section { margin-bottom: 30px; }
            .section h2 { font-size: 16px; margin-bottom: 12px; color: #1a1a1a; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #e5e5e5; }
            th { background: #f8f9fa; font-weight: 600; color: #666; }
            tr:hover { background: #fafafa; }
            .text-right { text-align: right; }
            .footer { margin-top: 40px; text-align: center; color: #999; font-size: 11px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Performance Report</h1>
            <p><strong>${data.staffName}</strong> | ${data.dateRange}</p>
            <p style="margin-top: 4px;">Generated: ${format(new Date(), 'PPpp')}</p>
          </div>
          
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Total Earnings</div>
              <div class="value">${formatCurrency(data.summary.totalEarnings)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Sales</div>
              <div class="value">${formatCurrency(data.summary.totalSales)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Hours Worked</div>
              <div class="value">${formatHours(data.summary.totalHours)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Commission</div>
              <div class="value">${formatCurrency(data.summary.totalCommission)}</div>
            </div>
          </div>
          
          <div class="section">
            <h2>Earnings Breakdown</h2>
            <table>
              <tr><td>Hourly Rate</td><td class="text-right">${formatCurrency(data.summary.hourlyRate)}/hr</td></tr>
              <tr><td>Hours Worked</td><td class="text-right">${formatHours(data.summary.totalHours)}</td></tr>
              <tr><td>Base Pay</td><td class="text-right">${formatCurrency(data.summary.basePay)}</td></tr>
              <tr><td>Service Sales</td><td class="text-right">${formatCurrency(data.summary.serviceSales)}</td></tr>
              <tr><td>Retail Sales</td><td class="text-right">${formatCurrency(data.summary.retailSales)}</td></tr>
              <tr><td>Commission Earned</td><td class="text-right">${formatCurrency(data.summary.totalCommission)}</td></tr>
              <tr style="font-weight: 600; background: #f0f9ff;"><td>Total Earnings</td><td class="text-right">${formatCurrency(data.summary.totalEarnings)}</td></tr>
            </table>
          </div>
          
          ${data.timeEntries.length > 0 ? `
          <div class="section">
            <h2>Time Clock Entries (${data.timeEntries.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Break</th>
                  <th class="text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                ${data.timeEntries.map(entry => {
                  const clockIn = new Date(entry.clock_in);
                  const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
                  const hoursWorked = clockOut 
                    ? (differenceInMinutes(clockOut, clockIn) - entry.break_minutes) / 60 
                    : 0;
                  return `<tr>
                    <td>${format(clockIn, 'MMM d, yyyy')}</td>
                    <td>${format(clockIn, 'h:mm a')}</td>
                    <td>${clockOut ? format(clockOut, 'h:mm a') : 'Active'}</td>
                    <td>${entry.break_minutes}min</td>
                    <td class="text-right">${formatHours(hoursWorked)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          ${data.receipts.length > 0 ? `
          <div class="section">
            <h2>Receipts (${data.receipts.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.receipts.map(r => {
                  const clientName = r.clients ? `${r.clients.first_name} ${r.clients.last_name}` : 'Walk-in';
                  return `<tr>
                    <td>${r.receipt_number}</td>
                    <td>${format(new Date(r.created_at), 'MMM d, yyyy')}</td>
                    <td>${clientName}</td>
                    <td>${r.service_name || '-'}</td>
                    <td class="text-right">${formatCurrency(r.total_amount)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          <div class="footer">
            <p>This report was generated automatically. For questions, please contact management.</p>
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      toast.success('PDF export ready - use Print dialog to save as PDF');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  return { exportToCSV, exportToPDF };
}
