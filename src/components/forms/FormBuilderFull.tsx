import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Trash2, GripVertical, MoveUp, MoveDown,
  Type, AlignLeft, CheckSquare, CircleDot, ChevronDown, Calendar,
  Settings2, Eye, Hammer, X, ArrowLeft, Link2, Star, Image as ImageIcon, Camera
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
  mode?: 'form' | 'chart';
}

const FIELD_TYPE_PALETTE = [
  { type: 'logo', label: 'Logo', icon: Star },
  { type: 'textarea', label: 'Paragraph', icon: AlignLeft },
  { type: 'text', label: 'Text input', icon: Type },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'photo', label: 'Photo upload', icon: Camera },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'radio', label: 'Multiple choice', icon: CircleDot },
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

export function FormBuilderFull({ formData, onChange, onSave, onCancel, isSaving, isEditing, mode = 'form' }: FormBuilderFullProps) {
  const [activeTab, setActiveTab] = useState<'build' | 'settings' | 'preview'>('build');
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [newOption, setNewOption] = useState('');
  const [showTemplates, setShowTemplates] = useState(!isEditing);

  const set = (key: string, value: any) => onChange({ ...formData, [key]: value });
  const fields = formData.fields;

  const createField = (type: string): FormField => {
    if (type === 'logo' || type === 'image' || type === 'photo') {
      return {
        id: `field_${Date.now()}`,
        type: 'text',
        label: type === 'logo' ? 'Logo' : type === 'image' ? 'Image' : 'Photo upload',
        required: false,
        placeholder: type === 'logo' ? '[Logo placeholder]' : type === 'image' ? '[Image placeholder]' : '[Photo upload]',
      };
    }
    return {
      id: `field_${Date.now()}`,
      type: type as FormField['type'],
      label: type === 'checkbox' ? 'Checkbox label' : type === 'select' ? 'Select an option' : type === 'radio' ? 'Multiple choice' : `New ${type} field`,
      required: false,
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
    };
  };

  const addField = (type: string) => {
    const newField = createField(type);
    const newFields = [...fields, newField];
    set('fields', newFields);
    setSelectedFieldIndex(newFields.length - 1);
  };

  const insertFieldAt = (type: string, index: number) => {
    const newField = createField(type);
    const newFields = [...fields];
    newFields.splice(index, 0, newField);
    set('fields', newFields);
    setSelectedFieldIndex(index);
  };

  const moveFieldToIndex = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newFields = [...fields];
    const [moved] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
    set('fields', newFields);
    setSelectedFieldIndex(toIndex > fromIndex ? toIndex - 1 : toIndex);
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
      {/* Top Bar — Boulevard style */}
      <div className="flex items-center justify-between border-b border-border px-5 h-14 shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{formData.name || (mode === 'chart' ? 'Untitled client chart' : 'Untitled client form')}</p>
            <p className="text-xs text-muted-foreground">{mode === 'chart' ? 'Chart' : 'Form'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && formData.is_active ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
              <span className="w-2 h-2 rounded-full bg-success" />
              Published
            </span>
          ) : !isEditing ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-warning">
              <span className="w-2 h-2 rounded-full bg-warning" />
              Draft
            </span>
          ) : null}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas / Preview Area */}
        <div className="flex-1 overflow-auto bg-muted/20 flex flex-col">
          <div className="flex-1">
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
                onInsertFieldAt={insertFieldAt}
                onMoveFieldToIndex={moveFieldToIndex}
              />
            )}
          </div>

          {/* Template suggestion banner — Boulevard style */}
          {showTemplates && activeTab === 'build' && !isEditing && (
            <div className="border-t border-border bg-card px-6 py-4 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Start from a template</h4>
                  <p className="text-xs text-muted-foreground">Choose an example to get started, or build from scratch</p>
                </div>
                <button type="button" onClick={() => setShowTemplates(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                  Dismiss <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {mode === 'form' ? (
                  <>
                    <button type="button" onClick={() => { onChange({ ...formData, name: 'New client intake', description: 'Collect basic information from a new client' }); setShowTemplates(false); }}
                      className="text-left border border-border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                      <p className="text-sm font-medium text-foreground">New client intake</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Collect basic information from a new client</p>
                    </button>
                    <button type="button" onClick={() => { onChange({ ...formData, name: 'Photo consent', description: 'Get consent to use a client\'s photos for business purposes' }); setShowTemplates(false); }}
                      className="text-left border border-border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                      <p className="text-sm font-medium text-foreground">Photo consent</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Get consent to use a client's photos for business purposes</p>
                    </button>
                    <button type="button" onClick={() => { onChange({ ...formData, name: 'Medical history', description: 'Gather medical history and health information' }); setShowTemplates(false); }}
                      className="text-left border border-border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                      <p className="text-sm font-medium text-foreground">Medical history</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Gather medical history and health information</p>
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { onChange({ ...formData, name: 'SOAP note', description: 'Assess, and plan client treatments' }); setShowTemplates(false); }}
                      className="text-left border border-border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                      <p className="text-sm font-medium text-foreground">SOAP note</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Assess, and plan client treatments</p>
                    </button>
                    <button type="button" onClick={() => { onChange({ ...formData, name: 'Treatment record', description: 'Take service notes and capture photos' }); setShowTemplates(false); }}
                      className="text-left border border-border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                      <p className="text-sm font-medium text-foreground">Treatment record</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Take service notes and capture photos</p>
                    </button>
                    <button type="button" onClick={() => { onChange({ ...formData, name: 'Advanced treatment record', description: 'Take notes and mark up photos for review' }); setShowTemplates(false); }}
                      className="text-left border border-border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                      <p className="text-sm font-medium text-foreground">Advanced treatment record</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Take notes and mark up photos for review</p>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar — Boulevard style tabs */}
        <div className="w-[280px] border-l border-border bg-card shrink-0 flex flex-col">
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
              <div className="p-2">
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
                  <div className="space-y-0.5">
                    {FIELD_TYPE_PALETTE.map(item => (
                      <button
                        key={item.type}
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('fieldType', item.type);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => addField(item.type)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm text-foreground hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                      </button>
                    ))}
                  </div>
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

      {/* Bottom Bar — Boulevard style */}
      <div className="flex items-center justify-between border-t border-border px-5 h-14 shrink-0 bg-card">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-foreground font-medium">
          Back
        </Button>
        <div className="flex items-center gap-3">
          {isEditing && (
            <button type="button" className="text-sm font-medium text-destructive hover:underline" onClick={onCancel}>
              Disable and Unpublish
            </button>
          )}
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="px-5">
              Save Draft
            </Button>
          )}
          <Button size="sm" onClick={onSave} disabled={isSaving} className={cn('px-6', !isEditing && 'opacity-60')}>
            {isSaving ? 'Saving...' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Form Canvas (Build mode) — full-surface drag & drop ───── */
function FormCanvas({ fields, formData, selectedFieldIndex, onSelectField, onUpdateField, onRemoveField, onMoveField, onInsertFieldAt, onMoveFieldToIndex }: {
  fields: FormField[];
  formData: any;
  selectedFieldIndex: number | null;
  onSelectField: (i: number | null) => void;
  onUpdateField: (i: number, u: Partial<FormField>) => void;
  onRemoveField: (i: number) => void;
  onMoveField: (i: number, d: 'up' | 'down') => void;
  onInsertFieldAt: (type: string, index: number) => void;
  onMoveFieldToIndex: (from: number, to: number) => void;
}) {
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const fieldRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calculate drop index from mouse Y position relative to all fields
  const calcDropIndex = React.useCallback((clientY: number) => {
    for (let i = 0; i < fieldRefs.current.length; i++) {
      const el = fieldRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clientY < midY) return i;
    }
    return fields.length;
  }, [fields.length]);

  const executeDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const idx = calcDropIndex(e.clientY);
    setDropIndex(null);
    setIsDraggingOver(false);
    const fieldType = e.dataTransfer.getData('fieldType');
    const dragFieldIndex = e.dataTransfer.getData('dragFieldIndex');
    if (fieldType) {
      onInsertFieldAt(fieldType, idx);
    } else if (dragFieldIndex !== '') {
      onMoveFieldToIndex(parseInt(dragFieldIndex), idx);
    }
  }, [calcDropIndex, onInsertFieldAt, onMoveFieldToIndex]);

  return (
    <div
      ref={containerRef}
      className="max-w-[780px] mx-auto py-8 px-6 min-h-full"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDraggingOver(true);
        setDropIndex(calcDropIndex(e.clientY));
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropIndex(null);
          setIsDraggingOver(false);
        }
      }}
      onDrop={executeDrop}
    >
      {formData.description && (
        <div className="bg-card rounded-lg p-6 mb-6 text-sm text-foreground leading-relaxed">
          {formData.description}
        </div>
      )}

      <div className={cn(
        "bg-card rounded-lg px-8 py-6 min-h-[300px] transition-all",
        isDraggingOver && 'ring-2 ring-primary/20'
      )}>
        {fields.length === 0 && (
          <div className={cn(
            'py-16 text-center rounded-lg transition-all border-2 border-dashed',
            isDraggingOver ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/20'
          )}>
            <p className="text-sm text-muted-foreground mb-1">No fields yet</p>
            <p className="text-xs text-muted-foreground">Drag fields from the sidebar or click to add</p>
          </div>
        )}

        {fields.map((field, index) => (
          <React.Fragment key={field.id}>
            {/* Drop indicator line — shown above this field */}
            <div className={cn(
              'transition-all duration-150 -mx-3 rounded-full',
              dropIndex === index
                ? 'h-1 bg-primary my-2 shadow-sm'
                : 'h-0 my-0'
            )} />

            <div
              ref={(el) => { fieldRefs.current[index] = el; }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('dragFieldIndex', index.toString());
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => onSelectField(index)}
              className={cn(
                'relative group cursor-pointer rounded-md transition-all -mx-3 px-3 py-2',
                selectedFieldIndex === index
                  ? 'ring-2 ring-primary/30 bg-primary/[0.02]'
                  : 'hover:bg-accent/30'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 cursor-grab active:cursor-grabbing shrink-0" />
                <label className="text-sm font-medium text-foreground">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </label>
                <Link2 className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {field.type === 'text' || field.type === 'email' || field.type === 'phone' ? (
                <div className="h-10 border border-border rounded-md bg-background ml-5" />
              ) : field.type === 'textarea' ? (
                <div className="h-24 border border-border rounded-md bg-background ml-5" />
              ) : field.type === 'date' ? (
                <div className="h-10 border border-border rounded-md bg-background flex items-center px-3 justify-between ml-5">
                  <span className="text-sm text-muted-foreground">MM/DD/YYYY</span>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
              ) : field.type === 'select' ? (
                <div className="h-10 border border-border rounded-md bg-background flex items-center px-3 justify-between ml-5">
                  <span className="text-sm text-muted-foreground">Select...</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              ) : field.type === 'checkbox' ? (
                <div className="flex items-center gap-2.5 mt-1 ml-5">
                  <div className="w-4 h-4 border-2 border-border rounded-sm bg-background" />
                  <span className="text-sm text-muted-foreground">{field.label}</span>
                </div>
              ) : field.type === 'radio' ? (
                <div className="space-y-1.5 mt-1 ml-5">
                  {field.options?.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-border rounded-full bg-background" />
                      <span className="text-sm text-muted-foreground">{opt}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className={cn(
                'absolute top-1 right-1 flex items-center gap-0.5 transition-opacity',
                selectedFieldIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMoveField(index, 'up'); }} disabled={index === 0}>
                  <MoveUp className="w-3 h-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMoveField(index, 'down'); }} disabled={index === fields.length - 1}>
                  <MoveDown className="w-3 h-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); onRemoveField(index); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </React.Fragment>
        ))}

        {/* Bottom drop indicator */}
        {fields.length > 0 && (
          <div className={cn(
            'transition-all duration-150 -mx-3 rounded-full',
            dropIndex === fields.length
              ? 'h-1 bg-primary my-2 shadow-sm'
              : 'h-0 my-0'
          )} />
        )}

        {formData.requires_signature && (
          <>
            <Separator className="mt-4" />
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Signatures</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Client Name <span className="text-destructive">*</span></label>
                  <div className="h-10 border border-border rounded-md bg-background mt-1.5" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Today's date <span className="text-destructive">*</span></label>
                  <div className="h-10 border border-border rounded-md bg-background mt-1.5 flex items-center px-3 justify-between">
                    <span className="text-sm text-muted-foreground" />
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Signature <span className="text-destructive">*</span></label>
                <div className="h-24 border-2 border-dashed border-border rounded-md bg-background mt-1.5 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Add signature</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
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
    <div className="p-3 space-y-4">
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
            {FIELD_TYPE_PALETTE.filter(t => !['logo', 'image', 'photo'].includes(t.type)).map(t => (
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
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddOption(); } }} />
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

/* ─── Form Preview ───── */
function FormPreview({ formData }: { formData: any }) {
  const [responses, setResponses] = useState<Record<string, any>>({});

  return (
    <div className="max-w-[720px] mx-auto py-8 px-6">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="text-center py-8 px-6">
          <h1 className="text-xl font-bold text-foreground">{formData.name || 'Untitled Form'}</h1>
          {formData.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{formData.description}</p>
          )}
        </div>

        <Separator />

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

        <div className="p-6 pt-0">
          <Button className="w-full h-11" disabled>Submit Form</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Form Settings ───── */
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
