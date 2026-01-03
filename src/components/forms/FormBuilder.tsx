import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, MoveUp, MoveDown } from 'lucide-react';
import { FormField } from './FormFieldRenderer';

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

export function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const [editingOptions, setEditingOptions] = useState<string | null>(null);
  const [newOption, setNewOption] = useState('');

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false,
    };
    onChange([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    onChange(newFields);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    onChange(newFields);
  };

  const addOption = (fieldIndex: number) => {
    if (!newOption.trim()) return;
    const field = fields[fieldIndex];
    const options = [...(field.options || []), newOption.trim()];
    updateField(fieldIndex, { options });
    setNewOption('');
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    const options = field.options?.filter((_, i) => i !== optionIndex) || [];
    updateField(fieldIndex, { options });
  };

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <Card key={field.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <CardTitle className="text-sm flex-1">Field {index + 1}</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                  className="h-8 w-8"
                >
                  <MoveUp className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveField(index, 'down')}
                  disabled={index === fields.length - 1}
                  className="h-8 w-8"
                >
                  <MoveDown className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Enter field label"
                />
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) => updateField(index, { type: value as FormField['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id={`required-${field.id}`}
                checked={field.required}
                onCheckedChange={(checked) => updateField(index, { required: !!checked })}
              />
              <Label htmlFor={`required-${field.id}`} className="cursor-pointer">
                Required field
              </Label>
            </div>

            {field.type === 'select' && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <Label className="text-sm">Dropdown Options</Label>
                <div className="flex flex-wrap gap-2">
                  {field.options?.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className="flex items-center gap-1 px-2 py-1 bg-background rounded border text-sm"
                    >
                      <span>{option}</span>
                      <button
                        type="button"
                        onClick={() => removeOption(index, optIndex)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={editingOptions === field.id ? newOption : ''}
                    onChange={(e) => {
                      setEditingOptions(field.id);
                      setNewOption(e.target.value);
                    }}
                    placeholder="Add option..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addOption(index);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(index)}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addField}
        className="w-full gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Field
      </Button>
    </div>
  );
}
