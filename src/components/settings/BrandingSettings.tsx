import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Palette, Type, Image, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BrandConfig {
  businessName: string;
  tagline: string;
  accentColor: string;
  logoUrl: string;
  fontStyle: 'modern' | 'classic' | 'bold';
}

const DEFAULT_BRAND: BrandConfig = {
  businessName: 'Elita Medical Spa',
  tagline: 'Elevate Your Beauty',
  accentColor: '#7c6bac',
  logoUrl: '',
  fontStyle: 'modern',
};

const STORAGE_KEY = 'elita-brand-config';

const PRESET_COLORS = [
  { name: 'Lavender', value: '#7c6bac' },
  { name: 'Rose Gold', value: '#b76e79' },
  { name: 'Ocean', value: '#2d7d9a' },
  { name: 'Emerald', value: '#2d8a6e' },
  { name: 'Midnight', value: '#2d3a6e' },
  { name: 'Amber', value: '#9a7b2d' },
];

const FONT_STYLES: { id: BrandConfig['fontStyle']; label: string; preview: string; className: string }[] = [
  { id: 'modern', label: 'Modern', preview: 'Aa', className: 'font-sans' },
  { id: 'classic', label: 'Classic', preview: 'Aa', className: 'font-serif' },
  { id: 'bold', label: 'Bold', preview: 'Aa', className: 'font-sans font-black' },
];

export function BrandingSettings() {
  const [brand, setBrand] = useState<BrandConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_BRAND, ...JSON.parse(stored) } : DEFAULT_BRAND;
    } catch {
      return DEFAULT_BRAND;
    }
  });

  const updateBrand = (partial: Partial<BrandConfig>) => {
    setBrand(prev => ({ ...prev, ...partial }));
  };

  const saveBranding = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brand));
    // Apply accent color to CSS custom property
    document.documentElement.style.setProperty('--brand-accent', brand.accentColor);
    toast.success('Branding settings saved');
  };

  const resetBranding = () => {
    setBrand(DEFAULT_BRAND);
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.style.removeProperty('--brand-accent');
    toast.info('Branding reset to defaults');
  };

  return (
    <div className="space-y-6">
      {/* Brand Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Brand Identity
          </CardTitle>
          <CardDescription>
            Customize how your business appears across the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Business Name</Label>
              <Input
                id="brandName"
                value={brand.businessName}
                onChange={e => updateBrand({ businessName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandTagline">Tagline</Label>
              <Input
                id="brandTagline"
                value={brand.tagline}
                onChange={e => updateBrand({ tagline: e.target.value })}
              />
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Logo URL
            </Label>
            <Input
              id="logoUrl"
              value={brand.logoUrl}
              onChange={e => updateBrand({ logoUrl: e.target.value })}
              placeholder="https://example.com/your-logo.png"
            />
            {brand.logoUrl && (
              <div className="mt-2 p-4 bg-muted rounded-lg flex items-center justify-center">
                <img src={brand.logoUrl} alt="Logo preview" className="h-12 w-auto object-contain" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Accent Color
          </CardTitle>
          <CardDescription>
            Choose a primary color that represents your brand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-3">
            {PRESET_COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => updateBrand({ accentColor: color.value })}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all",
                  brand.accentColor === color.value
                    ? "border-foreground scale-105"
                    : "border-transparent hover:border-border"
                )}
              >
                <div
                  className="w-10 h-10 rounded-lg shadow-sm"
                  style={{ backgroundColor: color.value }}
                />
                <span className="text-xs text-muted-foreground">{color.name}</span>
              </button>
            ))}
          </div>

          {/* Custom picker */}
          <div className="flex items-center gap-3">
            <Label htmlFor="customColor" className="text-sm whitespace-nowrap">Custom:</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="customColor"
                value={brand.accentColor}
                onChange={e => updateBrand({ accentColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <Input
                value={brand.accentColor}
                onChange={e => updateBrand({ accentColor: e.target.value })}
                className="w-28 font-mono text-sm"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl border border-border bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: brand.accentColor }}
              >
                Book Now
              </div>
              <span className="text-sm font-medium" style={{ color: brand.accentColor }}>
                {brand.businessName}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Font Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Font Style
          </CardTitle>
          <CardDescription>
            Select a typography style for your brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {FONT_STYLES.map(font => (
              <button
                key={font.id}
                onClick={() => updateBrand({ fontStyle: font.id })}
                className={cn(
                  "p-4 rounded-xl border-2 text-center transition-all",
                  brand.fontStyle === font.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <span className={cn("text-3xl text-foreground block mb-1", font.className)}>
                  {font.preview}
                </span>
                <span className="text-xs text-muted-foreground">{font.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={saveBranding}>Save Branding</Button>
        <Button variant="outline" onClick={resetBranding} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
