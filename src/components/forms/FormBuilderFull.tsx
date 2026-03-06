import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Trash2, GripVertical, MoveUp, MoveDown, Copy,
  Type, AlignLeft, CheckSquare, CircleDot, ChevronDown, Calendar,
  Settings2, Eye, Hammer, X, ArrowLeft, Link2, Star, Image as ImageIcon, Camera,
  FileText, Heading
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
  { type: 'heading', label: 'Section heading', icon: Heading, category: 'layout' },
  { type: 'paragraph', label: 'Info text', icon: FileText, category: 'layout' },
  { type: 'text', label: 'Short answer', icon: Type, category: 'input' },
  { type: 'textarea', label: 'Long answer', icon: AlignLeft, category: 'input' },
  { type: 'email', label: 'Email', icon: Type, category: 'input' },
  { type: 'phone', label: 'Phone', icon: Type, category: 'input' },
  { type: 'date', label: 'Date', icon: Calendar, category: 'input' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, category: 'choice' },
  { type: 'radio', label: 'Multiple choice', icon: CircleDot, category: 'choice' },
  { type: 'select', label: 'Dropdown', icon: ChevronDown, category: 'choice' },
  { type: 'photo', label: 'Photo upload', icon: Camera, category: 'media' },
  { type: 'image', label: 'Image', icon: ImageIcon, category: 'media' },
  { type: 'logo', label: 'Logo', icon: Star, category: 'media' },
] as const;

const FIELD_CATEGORIES = [
  { key: 'layout', label: 'Layout' },
  { key: 'input', label: 'Input fields' },
  { key: 'choice', label: 'Choice fields' },
  { key: 'media', label: 'Media' },
];

const FORM_TYPES = [
  { value: 'intake', label: 'Intake Form' },
  { value: 'consent', label: 'Consent Form' },
  { value: 'contract', label: 'Contract' },
  { value: 'custom', label: 'Custom Form' },
];

/* ─── TEMPLATES with real fields ───── */
const FORM_TEMPLATES: Record<string, { name: string; description: string; form_type: string; fields: FormField[]; requires_signature: boolean }> = {
  intake: {
    name: 'New Client Intake',
    description: 'Collect basic information from a new client',
    form_type: 'intake',
    requires_signature: true,
    fields: [
      { id: 'f1', type: 'text', label: 'Full Name', required: true },
      { id: 'f2', type: 'email', label: 'Email Address', required: true },
      { id: 'f3', type: 'phone', label: 'Phone Number', required: true },
      { id: 'f4', type: 'date', label: 'Date of Birth', required: true },
      { id: 'f5', type: 'text', label: 'Address', required: false },
      { id: 'f6', type: 'text', label: 'Emergency Contact Name', required: true },
      { id: 'f7', type: 'phone', label: 'Emergency Contact Phone', required: true },
      { id: 'f8', type: 'select', label: 'How did you hear about us?', required: false, options: ['Google', 'Instagram', 'Friend/Family', 'Walk-in', 'Other'] },
      { id: 'f9', type: 'textarea', label: 'Any allergies or medical conditions?', required: false },
    ],
  },
  consent: {
    name: 'Photo Consent',
    description: "Get consent to use a client's photos for business purposes",
    form_type: 'consent',
    requires_signature: true,
    fields: [
      { id: 'f1', type: 'text', label: 'Full Name', required: true },
      { id: 'f2', type: 'date', label: "Today's Date", required: true },
      { id: 'f3', type: 'textarea', label: 'I hereby grant permission for my before/after photographs to be used for marketing, social media, and educational purposes.', required: false },
      { id: 'f4', type: 'checkbox', label: 'I agree to the above terms and conditions', required: true },
      { id: 'f5', type: 'checkbox', label: 'I understand I may revoke this consent at any time by contacting the office', required: true },
    ],
  },
  medical: {
    name: 'Medical History',
    description: 'Gather medical history and health information',
    form_type: 'intake',
    requires_signature: true,
    fields: [
      { id: 'f1', type: 'text', label: 'Full Name', required: true },
      { id: 'f2', type: 'date', label: 'Date of Birth', required: true },
      { id: 'f3', type: 'textarea', label: 'Current Medications', required: false, placeholder: 'List all current medications...' },
      { id: 'f4', type: 'textarea', label: 'Known Allergies', required: false, placeholder: 'List any known allergies...' },
      { id: 'f5', type: 'checkbox', label: 'Heart disease or pacemaker', required: false },
      { id: 'f6', type: 'checkbox', label: 'Diabetes', required: false },
      { id: 'f7', type: 'checkbox', label: 'Pregnancy or nursing', required: false },
      { id: 'f8', type: 'checkbox', label: 'Autoimmune disorders', required: false },
      { id: 'f9', type: 'checkbox', label: 'Skin conditions (eczema, psoriasis)', required: false },
      { id: 'f10', type: 'textarea', label: 'Previous cosmetic treatments', required: false },
      { id: 'f11', type: 'textarea', label: 'Additional notes or concerns', required: false },
    ],
  },
  soap: {
    name: 'SOAP Note',
    description: 'Subjective, Objective, Assessment, Plan',
    form_type: 'custom',
    requires_signature: false,
    fields: [
      { id: 'f1', type: 'textarea', label: 'Subjective', required: false, placeholder: "Client's complaints, symptoms, history..." },
      { id: 'f2', type: 'textarea', label: 'Objective', required: false, placeholder: 'Clinical findings, observations...' },
      { id: 'f3', type: 'textarea', label: 'Assessment', required: false, placeholder: 'Diagnosis, condition evaluation...' },
      { id: 'f4', type: 'textarea', label: 'Plan', required: false, placeholder: 'Treatment plan, follow-up...' },
    ],
  },
  treatment: {
    name: 'Treatment Record',
    description: 'Document treatment details and notes',
    form_type: 'custom',
    requires_signature: false,
    fields: [
      { id: 'f1', type: 'date', label: 'Treatment Date', required: true },
      { id: 'f2', type: 'text', label: 'Treatment Area', required: true },
      { id: 'f3', type: 'select', label: 'Machine/Device Used', required: false, options: ['Laser', 'RF', 'Cryo', 'Ultrasound', 'Other'] },
      { id: 'f4', type: 'text', label: 'Settings / Parameters', required: false },
      { id: 'f5', type: 'textarea', label: 'Treatment Notes', required: false },
      { id: 'f6', type: 'textarea', label: 'Client Response / Observations', required: false },
      { id: 'f7', type: 'textarea', label: 'Aftercare Instructions Given', required: false },
    ],
  },
};

export function FormBuilderFull({ formData, onChange, onSave, onCancel, isSaving, isEditing, mode = 'form' }: FormBuilderFullProps) {
  const [activeTab, setActiveTab] = useState<'build' | 'settings' | 'preview'>('build');
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [newOption, setNewOption] = useState('');
  const [showTemplates, setShowTemplates] = useState(!isEditing && formData.fields.length === 0);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(null);

  const set = (key: string, value: any) => onChange({ ...formData, [key]: value });
  const fields = formData.fields;

  const createField = (type: string): FormField => {
    const ts = Date.now();
    const labelMap: Record<string, string> = {
      heading: 'Section Title',
      paragraph: 'Add informational text here...',
      text: 'Short answer',
      textarea: 'Long answer',
      email: 'Email address',
      phone: 'Phone number',
      date: 'Date',
      checkbox: 'Checkbox option',
      radio: 'Multiple choice question',
      select: 'Dropdown question',
      photo: 'Photo upload',
      image: 'Image',
      logo: 'Logo',
    };

    // Map special types to valid FormField types
    const typeMap: Record<string, FormField['type']> = {
      heading: 'text',
      paragraph: 'text',
      logo: 'text',
      image: 'text',
      photo: 'text',
    };

    return {
      id: `field_${ts}`,
      type: (typeMap[type] || type) as FormField['type'],
      label: labelMap[type] || `New ${type} field`,
      required: false,
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
      placeholder: type === 'heading' ? '[Section heading]' : type === 'paragraph' ? '[Info text block]' : type === 'logo' ? '[Logo]' : type === 'image' ? '[Image]' : type === 'photo' ? '[Photo upload]' : undefined,
    };
  };

  const addField = (type: string) => {
    const newField = createField(type);
    // Insert after selected field, or at end
    const insertAt = selectedFieldIndex !== null ? selectedFieldIndex + 1 : fields.length;
    const newFields = [...fields];
    newFields.splice(insertAt, 0, newField);
    set('fields', newFields);
    setSelectedFieldIndex(insertAt);
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
    const adjustedTo = toIndex > fromIndex ? toIndex - 1 : toIndex;
    newFields.splice(adjustedTo, 0, moved);
    set('fields', newFields);
    setSelectedFieldIndex(adjustedTo);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    set('fields', newFields);
  };

  const removeField = (index: number) => {
    set('fields', fields.filter((_: FormField, i: number) => i !== index));
    if (selectedFieldIndex === index) setSelectedFieldIndex(null);
    else if (selectedFieldIndex !== null && selectedFieldIndex > index) setSelectedFieldIndex(selectedFieldIndex - 1);
  };

  const duplicateField = (index: number) => {
    const original = fields[index];
    const copy = { ...original, id: `field_${Date.now()}`, label: `${original.label} (copy)` };
    const newFields = [...fields];
    newFields.splice(index + 1, 0, copy);
    set('fields', newFields);
    setSelectedFieldIndex(index + 1);
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
    updateField(fieldIndex, { options: field.options?.filter((_: string, i: number) => i !== optionIndex) });
  };

  const applyTemplate = (templateKey: string) => {
    const template = FORM_TEMPLATES[templateKey];
    if (!template) return;
    // Generate unique IDs
    const fieldsWithIds = template.fields.map((f, i) => ({ ...f, id: `field_${Date.now()}_${i}` }));
    onChange({
      ...formData,
      name: template.name,
      description: template.description,
      form_type: template.form_type,
      fields: fieldsWithIds,
      requires_signature: template.requires_signature,
    });
    setShowTemplates(false);
  };

  const selectedField = selectedFieldIndex !== null ? fields[selectedFieldIndex] : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border px-5 h-14 shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <Input
              value={formData.name}
              onChange={e => set('name', e.target.value)}
              placeholder={mode === 'chart' ? 'Untitled chart' : 'Untitled form'}
              className="border-none shadow-none text-sm font-semibold text-foreground h-7 px-1 focus-visible:ring-1 focus-visible:ring-primary/30 bg-transparent"
            />
            <p className="text-xs text-muted-foreground px-1">{mode === 'chart' ? 'Chart' : 'Form'} · {fields.length} field{fields.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEditing && formData.is_active ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
              <span className="w-2 h-2 rounded-full bg-success" />Published
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-warning">
              <span className="w-2 h-2 rounded-full bg-warning" />Draft
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="px-4">
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button size="sm" onClick={() => { set('is_active', true); onSave(); }} disabled={isSaving} className="px-5">
            Publish
          </Button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-muted/20 flex flex-col">
          <div className="flex-1">
            {activeTab === 'preview' ? (
              <FormPreview formData={formData} />
            ) : activeTab === 'settings' ? (
              <FormSettings formData={formData} onChange={onChange} />
            ) : showTemplates ? (
              <TemplateChooser
                mode={mode}
                onChoose={applyTemplate}
                onSkip={() => setShowTemplates(false)}
              />
            ) : (
              <FormCanvas
                fields={fields}
                formData={formData}
                selectedFieldIndex={selectedFieldIndex}
                editingLabelIndex={editingLabelIndex}
                onSelectField={setSelectedFieldIndex}
                onEditLabel={setEditingLabelIndex}
                onUpdateField={updateField}
                onRemoveField={removeField}
                onDuplicateField={duplicateField}
                onMoveField={moveField}
                onInsertFieldAt={insertFieldAt}
                onMoveFieldToIndex={moveFieldToIndex}
                onAddField={addField}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div
          className="border-l border-border bg-card shrink-0 flex flex-col relative"
          style={{ width: `${sidebarWidth}px`, minWidth: 240, maxWidth: 420 }}
        >
          {/* Resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidth = sidebarWidth;
              const onMove = (ev: MouseEvent) => setSidebarWidth(Math.max(240, Math.min(420, startWidth - (ev.clientX - startX))));
              const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          />

          {/* Tabs */}
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
              <div className="flex flex-col h-full">
                {/* Field properties editor — shown when a field is selected */}
                {selectedField && selectedFieldIndex !== null && (
                  <div className="border-b border-border">
                    <FieldEditor
                      field={selectedField}
                      index={selectedFieldIndex}
                      onUpdate={(updates) => updateField(selectedFieldIndex, updates)}
                      onRemove={() => removeField(selectedFieldIndex)}
                      onDuplicate={() => duplicateField(selectedFieldIndex)}
                      onClose={() => setSelectedFieldIndex(null)}
                      newOption={newOption}
                      setNewOption={setNewOption}
                      onAddOption={() => addOption(selectedFieldIndex)}
                      onRemoveOption={(optIdx) => removeOption(selectedFieldIndex, optIdx)}
                    />
                  </div>
                )}

                {/* Always-visible field palette */}
                <div className="p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                    {selectedField ? 'Add another field' : 'Add a field'}
                  </p>
                  {FIELD_CATEGORIES.map(cat => {
                    const items = FIELD_TYPE_PALETTE.filter(f => f.category === cat.key);
                    return (
                      <div key={cat.key} className="mb-2">
                        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-1 mb-0.5">{cat.label}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {items.map(item => (
                            <button
                              key={item.type}
                              type="button"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('fieldType', item.type);
                                e.dataTransfer.effectAllowed = 'copy';
                              }}
                              onClick={() => addField(item.type)}
                              className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-foreground hover:bg-accent transition-colors cursor-grab active:cursor-grabbing border border-transparent hover:border-border"
                            >
                              <item.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
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

/* ─── Template Chooser ───── */
function TemplateChooser({ mode, onChoose, onSkip }: { mode: 'form' | 'chart'; onChoose: (key: string) => void; onSkip: () => void }) {
  const templates = mode === 'form'
    ? [
        { key: 'intake', title: 'New Client Intake', desc: 'Collect contact info, emergency contacts, and referral source', fields: 9 },
        { key: 'consent', title: 'Photo Consent', desc: "Get permission to use client's photos", fields: 5 },
        { key: 'medical', title: 'Medical History', desc: 'Comprehensive health questionnaire', fields: 11 },
      ]
    : [
        { key: 'soap', title: 'SOAP Note', desc: 'Subjective, Objective, Assessment, Plan', fields: 4 },
        { key: 'treatment', title: 'Treatment Record', desc: 'Document treatment details and observations', fields: 7 },
      ];

  return (
    <div className="max-w-[600px] mx-auto py-12 px-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground">Start building your {mode}</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a template or start from scratch</p>
      </div>

      <div className="grid gap-3">
        {templates.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChoose(t.key)}
            className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{t.fields} fields</span>
            </div>
          </button>
        ))}

        <button
          type="button"
          onClick={onSkip}
          className="text-left border-2 border-dashed border-muted-foreground/20 rounded-xl p-5 hover:border-primary/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Start from scratch</p>
              <p className="text-xs text-muted-foreground">Build your own custom {mode}</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ─── Drop Zone ───── */
function DropZone({ index, isActive, onDrop }: { index: number; isActive: boolean; onDrop: (e: React.DragEvent, index: number) => void }) {
  const [hovering, setHovering] = React.useState(false);

  return (
    <div
      className={cn(
        'transition-all rounded relative',
        hovering
          ? 'h-12 bg-primary/8 border-2 border-dashed border-primary/50 my-1.5 flex items-center justify-center'
          : isActive
          ? 'h-3 my-0.5'
          : 'h-1'
      )}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; setHovering(true); }}
      onDragLeave={() => setHovering(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setHovering(false); onDrop(e, index); }}
    >
      {hovering && (
        <span className="text-xs text-primary font-medium pointer-events-none flex items-center gap-1">
          <Plus className="w-3 h-3" /> Drop here
        </span>
      )}
    </div>
  );
}

/* ─── Form Canvas ───── */
function FormCanvas({ fields, formData, selectedFieldIndex, editingLabelIndex, onSelectField, onEditLabel, onUpdateField, onRemoveField, onDuplicateField, onMoveField, onInsertFieldAt, onMoveFieldToIndex, onAddField }: {
  fields: FormField[];
  formData: any;
  selectedFieldIndex: number | null;
  editingLabelIndex: number | null;
  onSelectField: (i: number | null) => void;
  onEditLabel: (i: number | null) => void;
  onUpdateField: (i: number, u: Partial<FormField>) => void;
  onRemoveField: (i: number) => void;
  onDuplicateField: (i: number) => void;
  onMoveField: (i: number, d: 'up' | 'down') => void;
  onInsertFieldAt: (type: string, index: number) => void;
  onMoveFieldToIndex: (from: number, to: number) => void;
  onAddField: (type: string) => void;
}) {
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  const handleDrop = React.useCallback((e: React.DragEvent, index: number) => {
    const fieldType = e.dataTransfer.getData('fieldType');
    const dragFieldIndex = e.dataTransfer.getData('dragFieldIndex');
    if (fieldType) {
      onInsertFieldAt(fieldType, index);
    } else if (dragFieldIndex !== '') {
      onMoveFieldToIndex(parseInt(dragFieldIndex), index);
    }
    setIsDraggingOver(false);
  }, [onInsertFieldAt, onMoveFieldToIndex]);

  return (
    <div
      className="max-w-[720px] mx-auto py-8 px-6 min-h-full"
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false); }}
      onClick={() => onSelectField(null)}
    >
      {/* Form header on canvas */}
      {formData.description && (
        <div className="bg-card rounded-lg p-5 mb-4 text-sm text-muted-foreground leading-relaxed border border-border">
          {formData.description}
        </div>
      )}

      <div className={cn(
        "bg-card rounded-xl border border-border px-6 py-5 min-h-[400px] transition-all",
        isDraggingOver && 'ring-2 ring-primary/20 border-primary/30'
      )}>
        {fields.length === 0 ? (
          <div
            className={cn(
              'py-20 text-center rounded-lg transition-all border-2 border-dashed',
              isDraggingOver ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/15'
            )}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(e, 0); }}
          >
            <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Add your first field</p>
            <p className="text-xs text-muted-foreground mb-4">Click a field type in the sidebar or drag it here</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAddField('text'); }}>
                <Type className="w-3.5 h-3.5 mr-1.5" />Short answer
              </Button>
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAddField('textarea'); }}>
                <AlignLeft className="w-3.5 h-3.5 mr-1.5" />Long answer
              </Button>
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAddField('checkbox'); }}>
                <CheckSquare className="w-3.5 h-3.5 mr-1.5" />Checkbox
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DropZone index={0} isActive={isDraggingOver} onDrop={handleDrop} />

            {fields.map((field, index) => (
              <React.Fragment key={field.id}>
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('dragFieldIndex', index.toString());
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={(e) => { e.stopPropagation(); onSelectField(index); }}
                  onDoubleClick={(e) => { e.stopPropagation(); onEditLabel(index); }}
                  className={cn(
                    'relative group rounded-lg transition-all py-3 px-4 -mx-2',
                    selectedFieldIndex === index
                      ? 'ring-2 ring-primary/40 bg-primary/[0.03] shadow-sm'
                      : 'hover:bg-accent/40 hover:shadow-sm'
                  )}
                >
                  {/* Field number indicator */}
                  <div className="absolute -left-6 top-3 text-[10px] text-muted-foreground/40 font-mono w-4 text-right">
                    {index + 1}
                  </div>

                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground/30 cursor-grab active:cursor-grabbing shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      {/* Label — inline editable on double-click */}
                      {editingLabelIndex === index ? (
                        <Input
                          autoFocus
                          value={field.label}
                          onChange={(e) => onUpdateField(index, { label: e.target.value })}
                          onBlur={() => onEditLabel(null)}
                          onKeyDown={(e) => { if (e.key === 'Enter') onEditLabel(null); }}
                          className="h-7 text-sm font-medium border-primary/30 shadow-none px-1 -mx-1 mb-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground mb-1.5 cursor-text">
                          {field.label}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                        </p>
                      )}

                      {/* Field preview */}
                      <FieldPreview field={field} />
                    </div>
                  </div>

                  {/* Field actions */}
                  <div className={cn(
                    'absolute -top-2 right-2 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-sm px-1 py-0.5 transition-opacity',
                    selectedFieldIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onDuplicateField(index); }} title="Duplicate">
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMoveField(index, 'up'); }} disabled={index === 0} title="Move up">
                      <MoveUp className="w-3 h-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onMoveField(index, 'down'); }} disabled={index === fields.length - 1} title="Move down">
                      <MoveDown className="w-3 h-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onRemoveField(index); }} title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <DropZone index={index + 1} isActive={isDraggingOver} onDrop={handleDrop} />
              </React.Fragment>
            ))}

            {/* Quick add bar at bottom */}
            <div className="mt-4 pt-4 border-t border-dashed border-border/60">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold mr-1">Quick add:</span>
                {[
                  { type: 'text', label: 'Text', icon: Type },
                  { type: 'textarea', label: 'Paragraph', icon: AlignLeft },
                  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
                  { type: 'select', label: 'Dropdown', icon: ChevronDown },
                  { type: 'date', label: 'Date', icon: Calendar },
                ].map(item => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddField(item.type); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-all"
                  >
                    <item.icon className="w-3 h-3" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {formData.requires_signature && fields.length > 0 && (
          <>
            <Separator className="mt-6 mb-4" />
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signature Section</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Client Name <span className="text-destructive">*</span></label>
                  <div className="h-10 border border-border rounded-md bg-background mt-1.5" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Date <span className="text-destructive">*</span></label>
                  <div className="h-10 border border-border rounded-md bg-background mt-1.5 flex items-center px-3 justify-between">
                    <span className="text-sm text-muted-foreground" />
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Signature <span className="text-destructive">*</span></label>
                <div className="h-20 border-2 border-dashed border-border rounded-md bg-background mt-1.5 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Signature pad</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Field Preview (visual representation on canvas) ───── */
function FieldPreview({ field }: { field: FormField }) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return <div className="h-9 border border-border rounded-md bg-background/50" />;
    case 'textarea':
      return <div className="h-20 border border-border rounded-md bg-background/50" />;
    case 'date':
      return (
        <div className="h-9 border border-border rounded-md bg-background/50 flex items-center px-3 justify-between">
          <span className="text-xs text-muted-foreground/60">MM/DD/YYYY</span>
          <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
        </div>
      );
    case 'select':
      return (
        <div className="h-9 border border-border rounded-md bg-background/50 flex items-center px-3 justify-between">
          <span className="text-xs text-muted-foreground/60">Select an option...</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" />
        </div>
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2 mt-0.5">
          <div className="w-4 h-4 border-2 border-border rounded-sm bg-background/50" />
          <span className="text-xs text-muted-foreground/60">{field.label}</span>
        </div>
      );
    case 'radio':
      return (
        <div className="space-y-1.5 mt-0.5">
          {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-border rounded-full bg-background/50" />
              <span className="text-xs text-muted-foreground/60">{opt}</span>
            </div>
          ))}
        </div>
      );
    default:
      return <div className="h-9 border border-border rounded-md bg-background/50" />;
  }
}

/* ─── Field Editor (sidebar) ───── */
function FieldEditor({ field, index, onUpdate, onRemove, onDuplicate, onClose, newOption, setNewOption, onAddOption, onRemoveOption }: {
  field: FormField;
  index: number;
  onUpdate: (u: Partial<FormField>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  newOption: string;
  setNewOption: (v: string) => void;
  onAddOption: () => void;
  onRemoveOption: (i: number) => void;
}) {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Field #{index + 1}</p>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Label</Label>
        <Input value={field.label} onChange={e => onUpdate({ label: e.target.value })} className="h-8 text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Type</Label>
        <Select value={field.type} onValueChange={v => onUpdate({ type: v as FormField['type'] })}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FIELD_TYPE_PALETTE.filter(t => !['logo', 'image', 'photo', 'heading', 'paragraph'].includes(t.type)).map(t => (
              <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Placeholder</Label>
        <Input value={field.placeholder || ''} onChange={e => onUpdate({ placeholder: e.target.value })} placeholder="Placeholder text..." className="h-8 text-sm" />
      </div>

      <div className="flex items-center justify-between py-1">
        <Label className="text-xs">Required</Label>
        <Switch checked={field.required} onCheckedChange={v => onUpdate({ required: v })} />
      </div>

      {(field.type === 'select' || field.type === 'radio') && (
        <div className="space-y-2 pt-1">
          <Label className="text-xs">Options</Label>
          <div className="space-y-1">
            {field.options?.map((opt, i) => (
              <div key={i} className="flex items-center gap-1 bg-muted/50 rounded px-2 py-1 text-xs">
                <span className="flex-1 truncate">{opt}</span>
                <button type="button" onClick={() => onRemoveOption(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <Input className="h-7 text-xs" value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Add option..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddOption(); } }} />
            <Button type="button" variant="outline" size="sm" className="h-7 px-2 shrink-0" onClick={onAddOption}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <Separator />

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 text-xs h-8" onClick={onDuplicate}>
          <Copy className="w-3 h-3" />Duplicate
        </Button>
        <Button type="button" variant="destructive" size="sm" className="flex-1 gap-1.5 text-xs h-8" onClick={onRemove}>
          <Trash2 className="w-3 h-3" />Delete
        </Button>
      </div>
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
              onChange={(value: any) => setResponses(prev => ({ ...prev, [field.id]: value }))}
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
