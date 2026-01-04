import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Search, Receipt, Printer, Eye, Hash, Mail } from 'lucide-react';
import { ReceiptPreview } from '@/components/pos/ReceiptPreview';
import { ReceiptData, RetailItem, TreatmentSummary, ELITA_MEDSPA_INFO } from '@/components/pos/ReceiptData';
import { toast } from 'sonner';

export function ReceiptHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          *,
          client:clients(id, first_name, last_name, email, phone),
          staff:staff(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredReceipts = receipts.filter((receipt) => {
    const searchLower = searchTerm.toLowerCase();
    const clientName = receipt.client
      ? `${receipt.client.first_name} ${receipt.client.last_name}`.toLowerCase()
      : '';
    // Enhanced search to include receipt number (serial number) prominently
    return (
      receipt.receipt_number.toLowerCase().includes(searchLower) ||
      clientName.includes(searchLower) ||
      (receipt.service_name && receipt.service_name.toLowerCase().includes(searchLower))
    );
  });

  const handleResendEmail = async (receipt: typeof receipts[0]) => {
    if (!receipt.client?.email) {
      toast.error('Client has no email on file');
      return;
    }

    setResendingEmail(receipt.id);
    try {
      const { error } = await supabase.functions.invoke('send-receipt-email', {
        body: {
          receipt_id: receipt.id,
          client_email: receipt.client.email,
          client_name: `${receipt.client.first_name} ${receipt.client.last_name}`,
          receipt_number: receipt.receipt_number,
          provider_name: receipt.staff
            ? `${receipt.staff.first_name} ${receipt.staff.last_name}`
            : 'Staff',
          service_name: receipt.service_name,
          service_price: Number(receipt.service_price),
          retail_items: (receipt.retail_items as unknown as RetailItem[]) || [],
          retail_total: Number(receipt.retail_total),
          subtotal: Number(receipt.subtotal),
          tax_rate: Number(receipt.tax_rate),
          tax_amount: Number(receipt.tax_amount),
          tip_amount: Number(receipt.tip_amount),
          discount_amount: Number(receipt.discount_amount),
          total_amount: Number(receipt.total_amount),
          payment_method: receipt.payment_method,
          machine_used: receipt.machine_used,
          treatment_summary: receipt.treatment_summary,
          created_at: receipt.created_at,
        },
      });

      if (error) throw error;
      toast.success('Receipt emailed to ' + receipt.client.email);
    } catch (err) {
      console.error('Resend email error:', err);
      toast.error('Failed to send email');
    } finally {
      setResendingEmail(null);
    }
  };

  const handleViewReceipt = (receipt: typeof receipts[0]) => {
    const receiptData: ReceiptData = {
      id: receipt.id,
      receiptNumber: receipt.receipt_number,
      transactionId: receipt.transaction_id || undefined,
      appointmentId: receipt.appointment_id || undefined,
      clientId: receipt.client_id || undefined,
      clientName: receipt.client
        ? `${receipt.client.first_name} ${receipt.client.last_name}`
        : 'Guest',
      clientEmail: receipt.client?.email || undefined,
      clientPhone: receipt.client?.phone || undefined,
      staffId: receipt.staff_id || undefined,
      providerName: receipt.staff
        ? `${receipt.staff.first_name} ${receipt.staff.last_name}`
        : 'Staff',
      serviceName: receipt.service_name || undefined,
      servicePrice: Number(receipt.service_price),
      machineUsed: receipt.machine_used || undefined,
      treatmentSummary: (receipt.treatment_summary as unknown as TreatmentSummary) || {},
      retailItems: (receipt.retail_items as unknown as RetailItem[]) || [],
      retailTotal: Number(receipt.retail_total),
      subtotal: Number(receipt.subtotal),
      taxRate: Number(receipt.tax_rate),
      taxAmount: Number(receipt.tax_amount),
      tipAmount: Number(receipt.tip_amount),
      discountAmount: Number(receipt.discount_amount),
      totalAmount: Number(receipt.total_amount),
      paymentMethod: receipt.payment_method as 'card' | 'cash' | 'gift_card' | 'split',
      receiptFormat: receipt.receipt_format as 'thermal' | 'standard',
      googleReviewUrl: receipt.google_review_url || ELITA_MEDSPA_INFO.googleReviewUrl,
      notes: receipt.notes || undefined,
      createdAt: new Date(receipt.created_at),
    };

    setSelectedReceipt(receiptData);
    setShowPreview(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Receipt History</h1>
        <p className="text-muted-foreground">View and reprint past receipts</p>
      </div>

      {/* Search by Receipt Number */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hash className="h-4 w-4" />
          <span>Search by receipt number (e.g., EMS-250103-1234)</span>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by receipt #, client name, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 font-mono"
          />
        </div>
      </div>

      {/* Receipts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading receipts...</div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No receipts match your search' : 'No receipts found'}
            </p>
          </div>
        ) : (
          filteredReceipts.map((receipt) => (
            <Card key={receipt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    {/* Receipt Number & Date */}
                    <div>
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <p className="font-mono font-semibold text-sm text-primary">{receipt.receipt_number}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(receipt.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>

                    {/* Client */}
                    <div>
                      <p className="text-sm font-medium">
                        {receipt.client
                          ? `${receipt.client.first_name} ${receipt.client.last_name}`
                          : 'Guest'}
                      </p>
                      <p className="text-xs text-muted-foreground">Client</p>
                    </div>

                    {/* Service */}
                    <div>
                      <p className="text-sm">
                        {receipt.service_name || 'Retail Only'}
                        {receipt.machine_used && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            {receipt.machine_used}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Service</p>
                    </div>

                    {/* Provider */}
                    <div>
                      <p className="text-sm">
                        {receipt.staff
                          ? `${receipt.staff.first_name} ${receipt.staff.last_name}`
                          : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">Provider</p>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <p className="text-lg font-heading font-semibold">
                        ${Number(receipt.total_amount).toFixed(2)}
                      </p>
                      <Badge
                        variant="outline"
                        className="capitalize text-[10px]"
                      >
                        {receipt.payment_method.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleViewReceipt(receipt)}
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleViewReceipt(receipt)}
                    >
                      <Printer className="h-3 w-3" />
                      Print
                    </Button>
                    {receipt.client?.email && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleResendEmail(receipt)}
                        disabled={resendingEmail === receipt.id}
                      >
                        <Mail className={`h-3 w-3 ${resendingEmail === receipt.id ? 'animate-pulse' : ''}`} />
                        {resendingEmail === receipt.id ? 'Sending...' : 'Email'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Retail Items Preview */}
                {receipt.retail_items && (receipt.retail_items as unknown as RetailItem[]).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Products: {(receipt.retail_items as unknown as RetailItem[]).map((item) => item.name).join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <ReceiptPreview
          receipt={selectedReceipt}
          open={showPreview}
          onClose={() => {
            setShowPreview(false);
            setSelectedReceipt(null);
          }}
        />
      )}
    </div>
  );
}
