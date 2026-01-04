import { forwardRef } from 'react';
import { ReceiptData, ELITA_MEDSPA_INFO, formatCurrency, formatDate, formatTime } from './ReceiptData';
import { Separator } from '@/components/ui/separator';
import { QRCodeSVG } from 'qrcode.react';

interface StandardReceiptProps {
  receipt: ReceiptData;
}

export const StandardReceipt = forwardRef<HTMLDivElement, StandardReceiptProps>(
  ({ receipt }, ref) => {
    const business = ELITA_MEDSPA_INFO;

    return (
      <div
        ref={ref}
        className="w-full max-w-[210mm] mx-auto bg-white text-foreground p-8 font-body"
        style={{ minHeight: '297mm' }}
      >
        {/* Luxury Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-heading font-semibold tracking-wide text-foreground">
              {business.name}
            </h1>
            <p className="text-sm italic text-muted-foreground mt-1">{business.tagline}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{business.address}</p>
            <p>{business.city}, {business.state} {business.zip}</p>
            <p className="mt-2">{business.phone}</p>
            <p>{business.email}</p>
          </div>
        </div>

        {/* Decorative line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mb-8" />

        {/* Receipt Title */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-heading uppercase tracking-[0.3em] text-muted-foreground">
            Receipt
          </h2>
        </div>

        {/* Receipt Details Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Client</p>
              <p className="font-medium text-lg">{receipt.clientName}</p>
              {receipt.clientEmail && (
                <p className="text-sm text-muted-foreground">{receipt.clientEmail}</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Provider</p>
              <p className="font-medium">{receipt.providerName}</p>
            </div>
          </div>
          <div className="text-right space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Receipt Number</p>
              <p className="font-mono font-medium">{receipt.receiptNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Date</p>
              <p>{formatDate(receipt.createdAt)}</p>
              <p className="text-sm text-muted-foreground">{formatTime(receipt.createdAt)}</p>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Service Details */}
        {receipt.serviceName && (
          <div className="mb-8">
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
              Service Details
            </h3>
            <div className="bg-secondary/30 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-lg font-heading font-medium">{receipt.serviceName}</p>
                  {receipt.machineUsed && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Equipment: {receipt.machineUsed}
                    </p>
                  )}
                </div>
                <p className="text-lg font-medium">{formatCurrency(receipt.servicePrice)}</p>
              </div>

              {/* Treatment Summary */}
              {receipt.treatmentSummary && Object.keys(receipt.treatmentSummary).length > 0 && (
                <div className="border-t border-border/50 pt-4 mt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                    Treatment Summary
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {receipt.treatmentSummary.areaTreated && (
                      <div>
                        <span className="text-muted-foreground">Area Treated:</span>{' '}
                        <span className="font-medium">{receipt.treatmentSummary.areaTreated}</span>
                      </div>
                    )}
                    {receipt.treatmentSummary.intensity && (
                      <div>
                        <span className="text-muted-foreground">Intensity:</span>{' '}
                        <span className="font-medium">{receipt.treatmentSummary.intensity}</span>
                      </div>
                    )}
                    {receipt.treatmentSummary.duration && (
                      <div>
                        <span className="text-muted-foreground">Duration:</span>{' '}
                        <span className="font-medium">{receipt.treatmentSummary.duration}</span>
                      </div>
                    )}
                    {receipt.treatmentSummary.machineSettings && (
                      <div>
                        <span className="text-muted-foreground">Settings:</span>{' '}
                        <span className="font-medium">{receipt.treatmentSummary.machineSettings}</span>
                      </div>
                    )}
                  </div>
                  {receipt.treatmentSummary.notes && (
                    <p className="mt-3 text-sm text-muted-foreground italic">
                      {receipt.treatmentSummary.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Retail Products */}
        {receipt.retailItems.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
              Products
            </h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium uppercase tracking-wide">Item</th>
                    <th className="text-center p-3 text-xs font-medium uppercase tracking-wide">Qty</th>
                    <th className="text-right p-3 text-xs font-medium uppercase tracking-wide">Price</th>
                    <th className="text-right p-3 text-xs font-medium uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.retailItems.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-3">{item.name}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totals Section */}
        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(receipt.subtotal)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Discount</span>
                <span>-{formatCurrency(receipt.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({receipt.taxRate}%)</span>
              <span>{formatCurrency(receipt.taxAmount)}</span>
            </div>
            {receipt.tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tip</span>
                <span>{formatCurrency(receipt.tipAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-xl font-heading font-semibold pt-2">
              <span>Total</span>
              <span>{formatCurrency(receipt.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 text-muted-foreground">
              <span>Payment Method</span>
              <span className="capitalize">{receipt.paymentMethod.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Package & Membership Status Footer */}
        {(receipt.packageStatus || receipt.membershipStatus || receipt.nextRecommendedBooking) && (
          <>
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />
            
            <div className="bg-muted/30 rounded-lg p-6 mb-8">
              <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-4 text-center">
                Statement of Value
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {receipt.packageStatus && (
                  <div className="flex items-center justify-between md:justify-start md:gap-3 p-3 bg-background rounded-lg border border-border/50">
                    <span className="text-muted-foreground">Package:</span>
                    <span className="font-medium">{receipt.packageStatus.packageName}</span>
                    <span className="text-muted-foreground mx-2">|</span>
                    <span className="text-muted-foreground">Sessions Remaining:</span>
                    <span className="font-heading font-semibold text-primary">
                      {receipt.packageStatus.sessionsRemaining}
                    </span>
                  </div>
                )}
                
                {receipt.membershipStatus && (
                  <div className="flex items-center justify-between md:justify-start md:gap-3 p-3 bg-background rounded-lg border border-border/50">
                    <span className="text-muted-foreground">Member Status:</span>
                    <span className="font-medium">{receipt.membershipStatus.tierName}</span>
                    <span className="text-muted-foreground mx-2">|</span>
                    <span className="text-muted-foreground">Next Billing:</span>
                    <span className="font-medium">{receipt.membershipStatus.nextBillingDate}</span>
                  </div>
                )}
              </div>
              
              {receipt.nextRecommendedBooking && (
                <div className="mt-4 text-center">
                  <p className="text-sm italic text-muted-foreground">
                    <span className="font-medium text-foreground">Next Recommended Booking: </span>
                    {receipt.nextRecommendedBooking}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <Separator className="mb-8" />

        {/* Footer with Referral QR */}
        <div className="flex justify-between items-start">
          <div className="max-w-sm">
            <p className="font-heading text-lg italic mb-2">
              "Thank you for choosing Elite MedSpa"
            </p>
            <p className="text-sm text-muted-foreground">
              We hope you had a wonderful experience. We look forward to seeing you again soon.
            </p>
          </div>
          {/* Referral QR */}
          {receipt.clientId && (
            <div className="text-center bg-primary/10 rounded-lg p-3">
              <p className="text-xs font-semibold mb-2 text-primary">Give $20, Get $20</p>
              <QRCodeSVG 
                value={`${window.location.origin}/refer?ref=${receipt.clientId}`} 
                size={72} 
                className="mx-auto mb-2"
              />
              <p className="text-[10px] text-muted-foreground max-w-[100px]">
                Share with friends & earn rewards!
              </p>
            </div>
          )}
        </div>

        {/* Bottom decorative line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-8" />

        {/* Website footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>{business.website}</p>
        </div>
      </div>
    );
  }
);

StandardReceipt.displayName = 'StandardReceipt';
