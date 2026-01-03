import { forwardRef } from 'react';
import { 
  ReceiptData, 
  formatCurrency, 
  formatDate, 
  formatTime,
  ELITE_MEDSPA_INFO 
} from './ReceiptData';
import { Sparkles } from 'lucide-react';

interface LiveReceiptPreviewProps {
  receipt: Partial<ReceiptData>;
  taxRate: number;
}

export const LiveReceiptPreview = forwardRef<HTMLDivElement, LiveReceiptPreviewProps>(
  ({ receipt, taxRate }, ref) => {
    const hasContent = receipt.serviceName || (receipt.retailItems && receipt.retailItems.length > 0);

    return (
      <div 
        ref={ref} 
        className="w-full bg-background border rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      >
        {/* Header */}
        <div className="bg-primary/5 border-b p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-lg font-semibold tracking-wide text-primary">
              {ELITE_MEDSPA_INFO.name}
            </h3>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground italic">{ELITE_MEDSPA_INFO.tagline}</p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-sm">
          {/* Date & Time */}
          <div className="text-center text-xs text-muted-foreground border-b pb-3">
            <p>{formatDate(new Date())}</p>
            <p>{formatTime(new Date())}</p>
          </div>

          {/* Client & Provider */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Client:</span>
              <p className="font-medium truncate">{receipt.clientName || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Provider:</span>
              <p className="font-medium truncate">{receipt.providerName || '—'}</p>
            </div>
          </div>

          {/* Items */}
          {!hasContent ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-xs">Add items to see preview</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Service */}
              {receipt.serviceName && (
                <div className="border-b pb-2">
                  <p className="font-medium text-xs uppercase text-muted-foreground mb-1">Service</p>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{receipt.serviceName}</p>
                      {receipt.machineUsed && (
                        <p className="text-xs text-muted-foreground">via {receipt.machineUsed}</p>
                      )}
                    </div>
                    <span>{formatCurrency(receipt.servicePrice || 0)}</span>
                  </div>
                </div>
              )}

              {/* Treatment Summary */}
              {receipt.treatmentSummary && Object.values(receipt.treatmentSummary).some(v => v) && (
                <div className="bg-muted/30 rounded p-2 text-xs border-l-2 border-primary/30">
                  <p className="font-medium text-xs uppercase text-muted-foreground mb-1">Treatment Notes</p>
                  {receipt.treatmentSummary.areaTreated && (
                    <p><span className="text-muted-foreground">Area:</span> {receipt.treatmentSummary.areaTreated}</p>
                  )}
                  {receipt.treatmentSummary.intensity && (
                    <p><span className="text-muted-foreground">Intensity:</span> {receipt.treatmentSummary.intensity}</p>
                  )}
                  {receipt.treatmentSummary.duration && (
                    <p><span className="text-muted-foreground">Duration:</span> {receipt.treatmentSummary.duration}</p>
                  )}
                </div>
              )}

              {/* Retail Items */}
              {receipt.retailItems && receipt.retailItems.length > 0 && (
                <div className="border-b pb-2">
                  <p className="font-medium text-xs uppercase text-muted-foreground mb-1">Products</p>
                  {receipt.retailItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-0.5">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="border-t pt-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(receipt.subtotal || 0)}</span>
            </div>
            {(receipt.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(receipt.discountAmount || 0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({taxRate}%)</span>
              <span>{formatCurrency(receipt.taxAmount || 0)}</span>
            </div>
            {(receipt.tipAmount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tip</span>
                <span>{formatCurrency(receipt.tipAmount || 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-heading font-semibold text-base pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(receipt.totalAmount || 0)}</span>
            </div>
          </div>

          {/* Package/Membership Status Preview */}
          {(receipt.packageStatus || receipt.membershipStatus) && (
            <div className="border-t pt-3 mt-3 text-xs space-y-1">
              <p className="font-medium text-xs uppercase text-muted-foreground">Account Status</p>
              {receipt.packageStatus && (
                <p>📦 {receipt.packageStatus.packageName}: {receipt.packageStatus.sessionsRemaining}/{receipt.packageStatus.sessionsTotal} remaining</p>
              )}
              {receipt.membershipStatus && (
                <p>⭐ {receipt.membershipStatus.tierName} • Next billing: {receipt.membershipStatus.nextBillingDate}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/30 border-t p-3 text-center text-xs text-muted-foreground">
          <p>Thank you for choosing {ELITE_MEDSPA_INFO.name}</p>
          <p className="mt-1">{ELITE_MEDSPA_INFO.phone} • {ELITE_MEDSPA_INFO.website}</p>
        </div>
      </div>
    );
  }
);

LiveReceiptPreview.displayName = 'LiveReceiptPreview';
