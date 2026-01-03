import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { Button } from '@/components/ui/button';
import { Eraser, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  initialSignature?: string | null;
  disabled?: boolean;
}

export function SignaturePad({ onSignatureChange, initialSignature, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 400,
      height: 150,
      backgroundColor: '#ffffff',
      isDrawingMode: !disabled,
    });

    canvas.freeDrawingBrush.color = '#000000';
    canvas.freeDrawingBrush.width = 2;

    setFabricCanvas(canvas);

    // Load initial signature if provided - just render from saved data
    // Note: For viewing existing signatures, we display them as an image instead

    return () => {
      canvas.dispose();
    };
  }, [disabled]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const handlePathCreated = () => {
      const dataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2,
      });
      onSignatureChange(dataUrl);
    };

    fabricCanvas.on('path:created', handlePathCreated);

    return () => {
      fabricCanvas.off('path:created', handlePathCreated);
    };
  }, [fabricCanvas, onSignatureChange]);

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
    fabricCanvas.renderAll();
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-background">
        <canvas ref={canvasRef} className="max-w-full touch-none" />
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {disabled ? 'Signature captured' : 'Sign above using your mouse or touch screen'}
      </p>
    </div>
  );
}
