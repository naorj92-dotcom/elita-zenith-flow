import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Trash2, GripVertical, MoveUp, MoveDown,
  Type, AlignLeft, CheckSquare, CircleDot, ChevronDown, Calendar, PenTool, Minus, Image as ImageIcon, Camera,
  Settings2, Eye, Hammer, X
} from 'lucide-react';
import { FormField } from './FormFieldRenderer';
import { FormFieldRenderer } from './FormFieldRenderer';
import { SignaturePad } from './SignaturePad';
import { cn } from '@/lib/utils';

interface FormBuilderFullProps {
  formData: {
    name: string;
    description: string;
    form_type: string;
    fields: FormField[];
    requires_signature: boolean;
    is_active: boolean;
  };
  onChange: (data: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isEditing: boolean;
}

const FIELD_TYPE_PALETTE = [
  { type: 'text', label: 'Text input', icon: Type },
  { type: 'textarea', label: 'Paragraph', icon: AlignLeft },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'select', label: 'Dropdown', icon: ChevronDown },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'email', label: 'Email', icon: Type },
  { type: 'phone', label: 'Phone', icon: Type },
] as const;

const FORM_TYPES = [
  { value: 'intake', label: 'Intake Form' },
  { value: 'consent', label: 'Consent Form' },
  { value: 'contract', label: 'Contract' },
  { value: 'custom', label: 'Custom Form' },
];

export function FormBuilderFull({ formData, onChange, onSave, onCancel, isSaving, isEditing }: FormBuilderFullProps) {
  const [activeTab, setActiveTab] = useState<'build' | 'settings' | 'preview'>('build');
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [newOption, setNewOption] = useState('');

  const set = (key: string, value: any) => onChange({ ...formData, [key]: value });
  const fields = formData.fields;

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: type === 'checkbox' ? 'Checkbox label' : type === 'select' ? 'Select an option' : `New ${type} field`,
      required: false,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
    };
    const newFields = [...fields, newField];
    set('fields', newFields);
    setSelectedFieldIndex(newFields.length - 1);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    set('fields', newFields);
  };

  const removeField = (index: number) => {
    set('fields', fields.filter((_, i) => i !== index));
    setSelectedFieldIndex(null);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    set('fields', newFields);
    setSelectedFieldIndex(newIndex);
  };

  const addOption = (fieldIndex: number) => {
    if (!newOption.trim()) return;
    const field = fields[fieldIndex];
    updateField(fieldIndex, { options: [...(field.options || []), newOption.trim()] });
    setNewOption('');
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    updateField(fieldIndex, { options: field.options?.filter((_, i) => i !== optionIndex) });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border px-4 h-14 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{formData.name || 'Untitled form'}</p>
            <p className="text-xs text-muted-foreground">Form</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas / Preview Area */}
        <div className="flex-1 overflow-auto bg-muted/30">
          {activeTab === 'preview' ? (
            <FormPreview formData={formData} />
          ) : activeTab === 'settings' ? (
            <FormSettings formData={formData} onChange={onChange} />
          ) : (
            <FormCanvas
              fields={fields}
              formData={formData}
              selectedFieldIndex={selectedFieldIndex}
              onSelectField={setSelectedFieldIndex}
              onUpdateField={updateField}
              onRemoveField={removeField}
              onMoveField={moveField}
            />
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-[280px] border-l border-border bg-card shrink-0 flex flex-col">
          {/* Sidebar Tabs */}
          <div className="border-b border-border">
            <div className="flex">
              {[
                { key: 'build' as const, label: 'Build', icon: Hammer },
                { key: 'settings' as const, label: 'Settings', icon: Settings2 },
                { key: 'preview' as const, label: 'Preview', icon: Eye },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2',
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            {activeTab === 'build' ? (
              <div className="p-3 space-y-1.5">
                {selectedFieldIndex !== null && fields[selectedFieldIndex] ? (
                  <FieldEditor
                    field={fields[selectedFieldIndex]}
                    index={selectedFieldIndex}
                    onUpdate={(updates) => updateField(selectedFieldIndex, updates)}
                    onRemove={() => removeField(selectedFieldIndex)}
                    onClose={() => setSelectedFieldIndex(null)}
                    newOption={newOption}
                    setNewOption={setNewOption}
                    onAddOption={() => addOption(selectedFieldIndex)}
                    onRemoveOption={(optIdx) => removeOption(selectedFieldIndex, optIdx)}
                  />
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 pb-1">Add Field</p>
                    {FIELD_TYPE_PALETTE.map(item => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => addField(item.type as FormField['type'])}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        {item.label}
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 ml-auto" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            ) : activeTab === 'settings' ? (
              <div className="p-4 space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Form Name</Label>
                  <Input value={formData.name} onChange={e => set('name', e.target.value)} placeholder="Form name" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Description</Label>
                  <Textarea value={formData.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Brief description..." />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Form Type</Label>
                  <Select value={formData.form_type} onValueChange={v => set('form_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Requires Signature</Label>
                  <Switch checked={formData.requires_signature} onCheckedChange={v => set('requires_signature', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Active</Label>
                  <Switch checked={formData.is_active} onCheckedChange={v => set('is_active', v)} />
                </div>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-xs text-muted-foreground text-center">Preview shown on the left</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

/* ─── Form Canvas (Build mode - left side) ───── */
function FormCanvas({ fields, formData, selectedFieldIndex, onSelectField, onUpdateField, onRemoveField, onMoveField }: {
  fields: FormField[];
  formData: any;
  selectedFieldIndex: number | null;
  onSelectField: (i: number | null) => void;
  onUpdateField: (i: number, u: Partial<FormField>) => void;
  onRemoveField: (i: number) => void;
  onMoveField: (i: number, d: 'up' | 'down') => void;
}) {
  return (
    <div className="max-w-[720px] mx-auto py-8 px-6">
      {/* Form Title Block */}
      <div className="bg-card border border-border rounded-lg p-6 mb-4 text-center">
        <h2 className="text-xl font-bold text-foreground">{formData.name || 'Untitled Form'}</h2>
      </div>

      {formData.description && (
        <div className="bg-card border border-border rounded-lg p-5 mb-4">
          <p className="text-sm text-muted-foreground">{formData.description}</p>
        </div>
      )}

      {/* Fields */}
      {fields.map((field, index) => (
        <div
          key={field.id}
          onClick={() => onSelectField(index)}
          className={cn(
            'bg-card border rounded-lg p-4 mb-3 cursor-pointer transition-all group relative',
            selectedFieldIndex === index
              ? 'border-primary ring-1 ring-primary/20'
              : 'border-border hover:border-muted-foreground/30'
          )}
        >
          {/* Inline field display */}
          <div className="pointer-events-none">
            <Label className="text-sm font-medium text-foreground mb-1.5 block">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {field.type === 'text' || field.type === 'email' || field.type === 'phone' ? (
              <div className="h-10 bg-muted/40 rounded-md border border-border" />
            ) : field.type === 'textarea' ? (
              <div className="h-20 bg-muted/40 rounded-md border border-border" />
            ) : field.type === 'date' ? (
              <div className="h-10 bg-muted/40 rounded-md border border-border flex items-center px-3">
                <span className="text-xs text-muted-foreground">MM/DD/YYYY</span>
                <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
              </div>
            ) : field.type === 'select' ? (
              <div className="h-10 bg-muted/40 rounded-md border border-border flex items-center px-3">
                <span className="text-xs text-muted-foreground">Select...</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
              </div>
            ) : field.type === 'checkbox' ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-4 h-4 border border-border rounded" />
                <span className="text-sm text-muted-foreground">{field.label}</span>
              </div>
            ) : null}
          </div>

          {/* Hover controls */}
          <div className={cn(
            'absolute top-2 right-2 flex items-center gap-0.5 transition-opacity',
            selectedFieldIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onMoveField(index, 'up'); }} disabled={index === 0}>
              <MoveUp className="w-3 h-3" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onMoveField(index, 'down'); }} disabled={index === fields.length - 1}>
              <MoveDown className="w-3 h-3" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onRemoveField(index); }}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ))}

      {fields.length === 0 && (
        <div className="bg-card border-2 border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground mb-1">No fields yet</p>
          <p className="text-xs text-muted-foreground">Use the sidebar to add fields to your form</p>
        </div>
      )}

      {/* Signature block if enabled */}
      {formData.requires_signature && (
        <div className="bg-card border border-border rounded-lg p-5 mt-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Signatures</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs text-muted-foreground">Client Name *</Label>
              <div className="h-10 bg-muted/40 rounded-md border border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Today's date *</Label>
              <div className="h-10 bg-muted/40 rounded-md border border-border mt-1 flex items-center px-3">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
              </div>
            </div>
          </div>
          <Label className="text-xs text-muted-foreground">Signature *</Label>
          <div className="h-24 bg-muted/20 rounded-md border-2 border-dashed border-border mt-1 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Add signature</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Field Editor (Right sidebar when field selected) ───── */
function FieldEditor({ field, index, onUpdate, onRemove, onClose, newOption, setNewOption, onAddOption, onRemoveOption }: {
  field: FormField;
  index: number;
  onUpdate: (u: Partial<FormField>) => void;
  onRemove: () => void;
  onClose: () => void;
  newOption: string;
  setNewOption: (v: string) => void;
  onAddOption: () => void;
  onRemoveOption: (i: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Edit Field</p>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Label</Label>
        <Input value={field.label} onChange={e => onUpdate({ label: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Type</Label>
        <Select value={field.type} onValueChange={v => onUpdate({ type: v as FormField['type'] })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FIELD_TYPE_PALETTE.map(t => (
              <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Placeholder</Label>
        <Input value={field.placeholder || ''} onChange={e => onUpdate({ placeholder: e.target.value })} placeholder="Placeholder text..." />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Required</Label>
        <Switch checked={field.required} onCheckedChange={v => onUpdate({ required: v })} />
      </div>

      {field.type === 'select' && (
        <div className="space-y-2 pt-2">
          <Label className="text-xs">Options</Label>
          <div className="space-y-1.5">
            {field.options?.map((opt, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1.5 text-sm">
                <span className="flex-1 truncate">{opt}</span>
                <button type="button" onClick={() => onRemoveOption(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Input className="h-8 text-sm" value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="New option..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddOption(); }}} />
            <Button type="button" variant="outline" size="sm" className="h-8 px-2 shrink-0" onClick={onAddOption}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <Separator />

      <Button type="button" variant="destructive" size="sm" className="w-full gap-2" onClick={onRemove}>
        <Trash2 className="w-3.5 h-3.5" />
        Delete Field
      </Button>
    </div>
  );
}

/* ─── Form Preview (full preview of how the form looks) ───── */
function FormPreview({ formData }: { formData: any }) {
  const [responses, setResponses] = useState<Record<string, any>>({});

  return (
    <div className="max-w-[720px] mx-auto py-8 px-6">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="text-center py-8 px-6">
          <h1 className="text-xl font-bold text-foreground">{formData.name || 'Untitled Form'}</h1>
          {formData.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{formData.description}</p>
          )}
        </div>

        <Separator />

        {/* Fields */}
        <div className="p-6 space-y-5">
          {formData.fields?.map((field: FormField) => (
            <FormFieldRenderer
              key={field.id}
              field={field}
              value={responses[field.id]}
              onChange={(value) => setResponses(prev => ({ ...prev, [field.id]: value }))}
            />
          ))}

          {formData.fields?.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No fields added yet. Switch to Build mode to add fields.</p>
          )}

          {/* Signature */}
          {formData.requires_signature && (
            <div className="pt-4 border-t border-border space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Signatures</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Client Name <span className="text-destructive">*</span></Label>
                  <Input placeholder="Printed Name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Today's date <span className="text-destructive">*</span></Label>
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Signature <span className="text-destructive">*</span></Label>
                <SignaturePad onSignatureChange={() => {}} />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button Preview */}
        <div className="p-6 pt-0">
          <Button className="w-full h-11" disabled>Submit Form</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Form Settings (center area in settings mode) ───── */
function FormSettings({ formData, onChange }: { formData: any; onChange: (d: any) => void }) {
  const set = (key: string, value: any) => onChange({ ...formData, [key]: value });

  return (
    <div className="max-w-[520px] mx-auto py-8 px-6 space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 space-y-5">
        <h3 className="text-base font-semibold text-foreground">Form Settings</h3>
        <div className="space-y-2">
          <Label>Form Name</Label>
          <Input value={formData.name} onChange={e => set('name', e.target.value)} placeholder="e.g., New Client Intake" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={formData.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Describe the purpose of this form..." />
        </div>
        <div className="space-y-2">
          <Label>Form Type</Label>
          <Select value={formData.form_type} onValueChange={v => set('form_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FORM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Requires Signature</Label>
            <p className="text-xs text-muted-foreground">Clients must sign before submitting</p>
          </div>
          <Switch checked={formData.requires_signature} onCheckedChange={v => set('requires_signature', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Active</Label>
            <p className="text-xs text-muted-foreground">Form is available for client assignment</p>
          </div>
          <Switch checked={formData.is_active} onCheckedChange={v => set('is_active', v)} />
        </div>
      </div>
    </div>
  );
}
