import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, FileText, X } from 'lucide-react';
import { ThermalReceipt } from './ThermalReceipt';
import { StandardReceipt } from './StandardReceipt';
import { ReceiptData } from './ReceiptData';

interface ReceiptPreviewProps {
  receipt: ReceiptData;
  open: boolean;
  onClose: () => void;
}

export function ReceiptPreview({ receipt, open, onClose }: ReceiptPreviewProps) {
  const [format, setFormat] = useState<'thermal' | 'standard'>('standard');
  const thermalRef = useRef<HTMLDivElement>(null);
  const standardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = format === 'thermal' ? thermalRef.current : standardRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get the current styles
    const styles = Array.from(document.styleSheets)
      .map((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    // Add Google Fonts
    const fontLinks = `
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    `;

    const pageStyle = format === 'thermal' 
      ? `
        @page { 
          size: 80mm auto; 
          margin: 0; 
        }
        body { 
          margin: 0; 
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `
      : `
        @page { 
          size: A4; 
          margin: 10mm; 
        }
        body { 
          margin: 0; 
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt.receiptNumber}</title>
          ${fontLinks}
          <style>
            ${styles}
            ${pageStyle}
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for fonts to load before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-heading text-xl">Receipt Preview</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs 
          value={format} 
          onValueChange={(v) => setFormat(v as 'thermal' | 'standard')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
            <TabsList className="grid w-64 grid-cols-2">
              <TabsTrigger value="standard" className="gap-2">
                <FileText className="h-4 w-4" />
                A4 / Letter
              </TabsTrigger>
              <TabsTrigger value="thermal" className="gap-2">
                <Printer className="h-4 w-4" />
                Thermal
              </TabsTrigger>
            </TabsList>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print {format === 'thermal' ? 'Thermal' : 'Standard'} Receipt
            </Button>
          </div>

          <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4">
            <TabsContent value="standard" className="mt-0">
              <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <StandardReceipt ref={standardRef} receipt={receipt} />
              </div>
            </TabsContent>
            <TabsContent value="thermal" className="mt-0 flex justify-center">
              <div className="bg-white shadow-lg">
                <ThermalReceipt ref={thermalRef} receipt={receipt} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
