import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush, Image as FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Pencil, 
  Eraser, 
  RotateCcw, 
  Download, 
  Save,
  Undo,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoAnnotationCanvasProps {
  imageUrl: string;
  onSave: (annotatedImageData: string) => void;
  disabled?: boolean;
}

const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
];

export function PhotoAnnotationCanvas({ imageUrl, onSave, disabled = false }: PhotoAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = Math.min(container.offsetWidth, 800);
    const height = Math.min(width * 0.75, 600);

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#1a1a1a',
      isDrawingMode: !disabled,
    });

    // Set up drawing brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [disabled]);

  // Load background image
  useEffect(() => {
    if (!fabricCanvas || !imageUrl) return;

    setIsLoading(true);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const fabricImage = new FabricImage(img);
      
      // Scale image to fit canvas while maintaining aspect ratio
      const canvasWidth = fabricCanvas.width || 800;
      const canvasHeight = fabricCanvas.height || 600;
      const scaleX = canvasWidth / img.width;
      const scaleY = canvasHeight / img.height;
      const scale = Math.min(scaleX, scaleY);

      fabricImage.scale(scale);
      fabricImage.set({
        left: (canvasWidth - img.width * scale) / 2,
        top: (canvasHeight - img.height * scale) / 2,
        selectable: false,
        evented: false,
      });

      // Fabric.js v6 uses backgroundImage property directly
      fabricCanvas.backgroundImage = fabricImage;
      fabricCanvas.renderAll();
      setIsLoading(false);
    };
    img.onerror = () => {
      console.error('Failed to load image');
      setIsLoading(false);
    };
    img.src = imageUrl;
  }, [fabricCanvas, imageUrl]);

  // Update brush settings
  useEffect(() => {
    if (!fabricCanvas?.freeDrawingBrush) return;

    if (tool === 'draw') {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
    } else {
      // Eraser mode - use white with larger brush
      fabricCanvas.freeDrawingBrush.color = '#ffffff';
      fabricCanvas.freeDrawingBrush.width = brushSize * 3;
    }
  }, [fabricCanvas, activeColor, brushSize, tool]);

  const handleClear = useCallback(() => {
    if (!fabricCanvas) return;
    
    // Remove all objects but keep the background image
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => fabricCanvas.remove(obj));
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const handleUndo = useCallback(() => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      fabricCanvas.remove(objects[objects.length - 1]);
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas]);

  const handleSave = useCallback(() => {
    if (!fabricCanvas) return;

    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    onSave(dataUrl);
  }, [fabricCanvas, onSave]);

  const handleDownload = useCallback(() => {
    if (!fabricCanvas) return;

    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    const link = document.createElement('a');
    link.download = `annotated-photo-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [fabricCanvas]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border border-border">
          {/* Tool Selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={tool === 'draw' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('draw')}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Draw
            </Button>
            <Button
              type="button"
              variant={tool === 'erase' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('erase')}
              className="gap-2"
            >
              <Eraser className="w-4 h-4" />
              Erase
            </Button>
          </div>

          {/* Color Picker */}
          {tool === 'draw' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Color:</span>
              <div className="flex gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setActiveColor(color.value)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                      activeColor === color.value 
                        ? "border-primary ring-2 ring-primary/50" 
                        : "border-border"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Brush Size */}
          <div className="flex items-center gap-3 min-w-[150px]">
            <Circle className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[brushSize]}
              onValueChange={(value) => setBrushSize(value[0])}
              min={1}
              max={20}
              step={1}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground w-6">{brushSize}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              className="gap-2"
            >
              <Undo className="w-4 h-4" />
              Undo
            </Button>
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
        </div>
      )}

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        <canvas ref={canvasRef} className="max-w-full touch-none" />
      </div>

      {/* Save/Download Actions */}
      {!disabled && (
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save to Chart
          </Button>
        </div>
      )}
    </div>
  );
}
