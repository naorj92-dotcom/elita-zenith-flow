import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'checkbox' | 'select' | 'radio' | 'date' | 'email' | 'phone';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface FormFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  error?: string;
}

export function FormFieldRenderer({ field, value, onChange, disabled = false, error }: FormFieldRendererProps) {
  const fieldId = `field-${field.id}`;
  const hasError = !!error;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={fieldId} className="flex items-center gap-1 text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={fieldId}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || (field.type === 'email' ? 'email@example.com' : field.type === 'phone' ? '(555) 000-0000' : '')}
            disabled={disabled}
            className={cn(hasError && 'border-destructive focus-visible:ring-destructive')}
          />
          {hasError && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={fieldId} className="flex items-center gap-1 text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id={fieldId}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={3}
            className={cn(hasError && 'border-destructive focus-visible:ring-destructive')}
          />
          {hasError && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-1">
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-lg border transition-colors",
            value ? "border-primary/30 bg-primary/5" : "border-border",
            hasError && "border-destructive"
          )}>
            <Checkbox
              id={fieldId}
              checked={value || false}
              onCheckedChange={onChange}
              disabled={disabled}
              className="mt-0.5"
            />
            <Label htmlFor={fieldId} className="text-sm leading-relaxed cursor-pointer">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
          {hasError && <p className="text-xs text-destructive pl-1">{error}</p>}
        </div>
      );

    case 'radio':
      return (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <RadioGroup value={value || ''} onValueChange={onChange} disabled={disabled}>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option} className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                  value === option ? "border-primary/30 bg-primary/5" : "border-border hover:bg-muted/50"
                )}>
                  <RadioGroupItem value={option} id={`${fieldId}-${option}`} />
                  <Label htmlFor={`${fieldId}-${option}`} className="text-sm cursor-pointer flex-1">{option}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
          {hasError && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={fieldId} className="flex items-center gap-1 text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className={cn(hasError && 'border-destructive')}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasError && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'date':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={fieldId} className="flex items-center gap-1 text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={fieldId}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(hasError && 'border-destructive focus-visible:ring-destructive')}
          />
          {hasError && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    default:
      return null;
  }
}
