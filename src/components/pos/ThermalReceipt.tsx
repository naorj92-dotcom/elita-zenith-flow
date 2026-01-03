import { forwardRef } from 'react';
import { ReceiptData, ELITE_MEDSPA_INFO, formatCurrency, formatDate, formatTime } from './ReceiptData';
import { Separator } from '@/components/ui/separator';

interface ThermalReceiptProps {
  receipt: ReceiptData;
}

export const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ receipt }, ref) => {
    const business = ELITE_MEDSPA_INFO;

    return (
      <div
        ref={ref}
        className="w-[80mm] bg-white text-foreground p-4 font-body text-xs"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-lg font-heading font-semibold tracking-wide">
            {business.name}
          </h1>
          <p className="text-[10px] italic text-muted-foreground">{business.tagline}</p>
          <div className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
            <p>{business.address}</p>
            <p>{business.city}, {business.state} {business.zip}</p>
            <p>{business.phone}</p>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Receipt Info */}
        <div className="flex justify-between text-[10px] mb-2">
          <span>Receipt #:</span>
          <span className="font-medium">{receipt.receiptNumber}</span>
        </div>
        <div className="flex justify-between text-[10px] mb-2">
          <span>Date:</span>
          <span>{formatDate(receipt.createdAt)}</span>
        </div>
        <div className="flex justify-between text-[10px] mb-2">
          <span>Time:</span>
          <span>{formatTime(receipt.createdAt)}</span>
        </div>

        <Separator className="my-3" />

        {/* Client & Provider */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Client:</span>
            <span className="font-medium">{receipt.clientName}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Provider:</span>
            <span>{receipt.providerName}</span>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Services */}
        {receipt.serviceName && (
          <>
            <div className="mb-3">
              <p className="font-medium text-[11px] mb-2 uppercase tracking-wide">Service</p>
              <div className="flex justify-between text-[10px]">
                <span>{receipt.serviceName}</span>
                <span>{formatCurrency(receipt.servicePrice)}</span>
              </div>
              {receipt.machineUsed && (
                <div className="text-[9px] text-muted-foreground mt-1">
                  Machine: {receipt.machineUsed}
                </div>
              )}
            </div>

            {/* Treatment Summary */}
            {receipt.treatmentSummary && Object.keys(receipt.treatmentSummary).length > 0 && (
              <div className="bg-muted/50 p-2 rounded mb-3">
                <p className="font-medium text-[10px] mb-1 uppercase">Treatment Summary</p>
                {receipt.treatmentSummary.areaTreated && (
                  <p className="text-[9px]">Area: {receipt.treatmentSummary.areaTreated}</p>
                )}
                {receipt.treatmentSummary.intensity && (
                  <p className="text-[9px]">Intensity: {receipt.treatmentSummary.intensity}</p>
                )}
                {receipt.treatmentSummary.duration && (
                  <p className="text-[9px]">Duration: {receipt.treatmentSummary.duration}</p>
                )}
                {receipt.treatmentSummary.notes && (
                  <p className="text-[9px]">Notes: {receipt.treatmentSummary.notes}</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Retail Items */}
        {receipt.retailItems.length > 0 && (
          <div className="mb-3">
            <p className="font-medium text-[11px] mb-2 uppercase tracking-wide">Products</p>
            {receipt.retailItems.map((item) => (
              <div key={item.id} className="flex justify-between text-[10px] mb-1">
                <span>{item.name} x{item.quantity}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-3" />

        {/* Totals */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span>Subtotal:</span>
            <span>{formatCurrency(receipt.subtotal)}</span>
          </div>
          {receipt.discountAmount > 0 && (
            <div className="flex justify-between text-[10px] text-success">
              <span>Discount:</span>
              <span>-{formatCurrency(receipt.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[10px]">
            <span>Tax ({receipt.taxRate}%):</span>
            <span>{formatCurrency(receipt.taxAmount)}</span>
          </div>
          {receipt.tipAmount > 0 && (
            <div className="flex justify-between text-[10px]">
              <span>Tip:</span>
              <span>{formatCurrency(receipt.tipAmount)}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold text-sm">
            <span>TOTAL:</span>
            <span>{formatCurrency(receipt.totalAmount)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-3 text-center text-[10px] text-muted-foreground">
          <p>Paid by: {receipt.paymentMethod.replace('_', ' ').toUpperCase()}</p>
        </div>

        <Separator className="my-4" />

        {/* QR Code placeholder - in real implementation use a QR library */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-foreground/10 rounded flex items-center justify-center mb-2">
            <span className="text-[8px] text-muted-foreground">QR Code</span>
          </div>
          <p className="text-[9px] text-muted-foreground">
            Scan to leave us a review!
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[9px] text-muted-foreground">
          <p className="font-heading italic">"Thank you for choosing Elite MedSpa"</p>
          <p className="mt-2">{business.website}</p>
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = 'ThermalReceipt';
