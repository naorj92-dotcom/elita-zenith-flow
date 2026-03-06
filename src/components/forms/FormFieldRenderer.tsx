import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
}

export function FormFieldRenderer({ field, value, onChange, disabled = false }: FormFieldRendererProps) {
  const fieldId = `field-${field.id}`;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId} className="flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={fieldId}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            required={field.required}
          />
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId} className="flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id={fieldId}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            required={field.required}
            rows={3}
          />
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-start gap-3 py-2">
          <Checkbox
            id={fieldId}
            checked={value || false}
            onCheckedChange={onChange}
            disabled={disabled}
            required={field.required}
          />
          <Label htmlFor={fieldId} className="text-sm leading-relaxed cursor-pointer">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
      );

    case 'select':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId} className="flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Select
            value={value || ''}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger>
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
        </div>
      );

    case 'date':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId} className="flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={fieldId}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={field.required}
          />
        </div>
      );

    default:
      return null;
  }
}
