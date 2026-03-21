import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Plus, Trash2, GripVertical, Copy, X, ArrowLeft, Save, Globe,
  Type, AlignLeft, CheckSquare, CircleDot, ChevronDown, Calendar,
  Eye, Hammer, Mail, Phone, FileText,
  Columns2, Columns3, RectangleHorizontal, PanelLeft, Settings2, Menu
} from 'lucide-react';
import { FormField } from './FormFieldRenderer';
import { FormFieldRenderer } from './FormFieldRenderer';
import { SignaturePad } from './SignaturePad';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface ExtendedFormField extends FormField {
  width?: 'full' | 'half' | 'third';
}

const FIELD_ELEMENTS = [
  { type: 'text', label: 'Short Text', icon: Type, desc: 'Single line input' },
  { type: 'textarea', label: 'Long Text', icon: AlignLeft, desc: 'Multi-line input' },
  { type: 'email', label: 'Email', icon: Mail, desc: 'Email address' },
  { type: 'phone', label: 'Phone', icon: Phone, desc: 'Phone number' },
  { type: 'date', label: 'Date', icon: Calendar, desc: 'Date picker' },
  { type: 'select', label: 'Dropdown', icon: ChevronDown, desc: 'Select from list' },
  { type: 'radio', label: 'Multiple Choice', icon: CircleDot, desc: 'Pick one option' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, desc: 'Yes/no toggle' },
] as const;

const FORM_TYPES = [
  { value: 'intake', label: 'Intake Form' },
  { value: 'consent', label: 'Consent Form' },
  { value: 'contract', label: 'Contract' },
  { value: 'custom', label: 'Custom Form' },
];

const TEMPLATES: Record<string, { name: string; description: string; form_type: string; fields: ExtendedFormField[]; requires_signature: boolean }> = {
  intake: {
    name: 'New Client Intake',
    description: 'Collect basic information from a new client',
    form_type: 'intake',
    requires_signature: true,
    fields: [
      { id: 'f1', type: 'text', label: 'Full Name', required: true, width: 'full' },
      { id: 'f2', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'f3', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'f4', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      { id: 'f5', type: 'text', label: 'Address', required: false, width: 'half' },
      { id: 'f6', type: 'text', label: 'Emergency Contact', required: true, width: 'half' },
      { id: 'f7', type: 'phone', label: 'Emergency Phone', required: true, width: 'half' },
      { id: 'f8', type: 'select', label: 'How did you hear about us?', required: false, options: ['Google', 'Instagram', 'Friend/Family', 'Walk-in', 'Other'], width: 'full' },
      { id: 'f9', type: 'textarea', label: 'Allergies or medical conditions?', required: false, width: 'full' },
    ],
  },
  consent: {
    name: 'Photo Consent',
    description: "Get consent to use client's photos",
    form_type: 'consent',
    requires_signature: true,
    fields: [
      { id: 'f1', type: 'text', label: 'Full Name', required: true, width: 'half' },
      { id: 'f2', type: 'date', label: "Today's Date", required: true, width: 'half' },
      { id: 'f3', type: 'checkbox', label: 'I agree to the above terms and conditions', required: true, width: 'full' },
      { id: 'f4', type: 'checkbox', label: 'I understand I may revoke this consent at any time', required: true, width: 'full' },
    ],
  },
  medical: {
    name: 'Medical History',
    description: 'Comprehensive health questionnaire',
    form_type: 'intake',
    requires_signature: true,
    fields: [
      { id: 'f1', type: 'text', label: 'Full Name', required: true, width: 'half' },
      { id: 'f2', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
      { id: 'f3', type: 'textarea', label: 'Current Medications', required: false, width: 'full' },
      { id: 'f4', type: 'textarea', label: 'Known Allergies', required: false, width: 'full' },
      { id: 'f5', type: 'checkbox', label: 'Heart disease or pacemaker', required: false, width: 'half' },
      { id: 'f6', type: 'checkbox', label: 'Diabetes', required: false, width: 'half' },
      { id: 'f7', type: 'checkbox', label: 'Pregnancy or nursing', required: false, width: 'half' },
      { id: 'f8', type: 'checkbox', label: 'Autoimmune disorders', required: false, width: 'half' },
      { id: 'f9', type: 'checkbox', label: 'Skin conditions (eczema, psoriasis)', required: false, width: 'full' },
      { id: 'f10', type: 'textarea', label: 'Previous cosmetic treatments', required: false, width: 'full' },
    ],
  },
  soap: {
    name: 'SOAP Note',
    description: 'Subjective, Objective, Assessment, Plan',
    form_type: 'custom',
    requires_signature: false,
    fields: [
      { id: 'f1', type: 'textarea', label: 'Subjective', required: false, placeholder: "Client's complaints, symptoms..." },
      { id: 'f2', type: 'textarea', label: 'Objective', required: false, placeholder: 'Clinical findings...' },
      { id: 'f3', type: 'textarea', label: 'Assessment', required: false, placeholder: 'Diagnosis...' },
      { id: 'f4', type: 'textarea', label: 'Plan', required: false, placeholder: 'Treatment plan...' },
    ],
  },
  treatment: {
    name: 'Treatment Record',
    description: 'Document treatment details and notes',
    form_type: 'custom',
    requires_signature: false,
    fields: [
      { id: 'f1', type: 'date', label: 'Treatment Date', required: true, width: 'half' },
      { id: 'f2', type: 'text', label: 'Treatment Area', required: true, width: 'half' },
      { id: 'f3', type: 'select', label: 'Machine/Device Used', required: false, options: ['Laser', 'RF', 'Cryo', 'Ultrasound', 'Other'] },
      { id: 'f4', type: 'text', label: 'Settings / Parameters', required: false },
      { id: 'f5', type: 'textarea', label: 'Treatment Notes', required: false },
      { id: 'f6', type: 'textarea', label: 'Client Response', required: false },
      { id: 'f7', type: 'textarea', label: 'Aftercare Instructions Given', required: false },
    ],
  },
};

export function FormBuilderFull({ formData, onChange, onSave, onCancel, isSaving, isEditing, mode = 'form' }: FormBuilderFullProps) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<'build' | 'preview'>('build');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(!isEditing && formData.fields.length === 0);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [newOption, setNewOption] = useState('');
  const [showPalette, setShowPalette] = useState(false);

  const set = (key: string, value: any) => onChange({ ...formData, [key]: value });
  const fields = formData.fields as ExtendedFormField[];

  const createField = (type: string): ExtendedFormField => ({
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: (['text', 'textarea', 'email', 'phone', 'date', 'checkbox', 'radio', 'select'].includes(type) ? type : 'text') as FormField['type'],
    label: {
      text: 'Short Text', textarea: 'Long Text', email: 'Email', phone: 'Phone',
      date: 'Date', checkbox: 'Checkbox', radio: 'Multiple Choice', select: 'Dropdown',
    }[type] || 'Text Field',
    required: false,
    options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
    width: 'full',
  });

  const addField = (type: string) => {
    const f = createField(type);
    const idx = selectedIdx !== null ? selectedIdx + 1 : fields.length;
    const next = [...fields];
    next.splice(idx, 0, f);
    set('fields', next);
    setSelectedIdx(idx);
    if (isMobile) setShowPalette(false);
  };

  const updateField = (i: number, u: Partial<ExtendedFormField>) => {
    const next = [...fields];
    next[i] = { ...next[i], ...u };
    set('fields', next);
  };

  const removeField = (i: number) => {
    set('fields', fields.filter((_: ExtendedFormField, idx: number) => idx !== i));
    if (selectedIdx === i) setSelectedIdx(null);
    else if (selectedIdx !== null && selectedIdx > i) setSelectedIdx(selectedIdx - 1);
  };

  const duplicateField = (i: number) => {
    const copy = { ...fields[i], id: `field_${Date.now()}`, label: `${fields[i].label} (copy)` };
    const next = [...fields];
    next.splice(i + 1, 0, copy);
    set('fields', next);
    setSelectedIdx(i + 1);
  };

  const handleCanvasDrop = useCallback((e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fieldType = e.dataTransfer.getData('newFieldType');
    const fromIdx = e.dataTransfer.getData('moveFieldIdx');
    if (fieldType) {
      const f = createField(fieldType);
      const next = [...fields];
      next.splice(toIdx, 0, f);
      set('fields', next);
      setSelectedIdx(toIdx);
    } else if (fromIdx !== '') {
      const from = parseInt(fromIdx);
      if (from === toIdx || from === toIdx - 1) return;
      const next = [...fields];
      const [moved] = next.splice(from, 1);
      const adjustedTo = toIdx > from ? toIdx - 1 : toIdx;
      next.splice(adjustedTo, 0, moved);
      set('fields', next);
      setSelectedIdx(adjustedTo);
    }
    setDragOverIdx(null);
    setDragSourceIdx(null);
  }, [fields]);

  const applyTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (!t) return;
    const flds = t.fields.map((f, i) => ({ ...f, id: `field_${Date.now()}_${i}` }));
    onChange({ ...formData, name: t.name, description: t.description, form_type: t.form_type, fields: flds, requires_signature: t.requires_signature });
    setShowTemplates(false);
  };

  const selectedField = selectedIdx !== null ? fields[selectedIdx] as ExtendedFormField : null;

  // ── Template chooser ──
  if (showTemplates) {
    const tpls = mode === 'form'
      ? [
          { key: 'intake', title: 'New Client Intake', desc: 'Contact info, emergency contacts, referral', count: 9 },
          { key: 'consent', title: 'Photo Consent', desc: 'Permission for before/after photos', count: 4 },
          { key: 'medical', title: 'Medical History', desc: 'Health questionnaire', count: 10 },
        ]
      : [
          { key: 'soap', title: 'SOAP Note', desc: 'Subjective, Objective, Assessment, Plan', count: 4 },
          { key: 'treatment', title: 'Treatment Record', desc: 'Treatment details and aftercare', count: 7 },
        ];

    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <button type="button" onClick={onCancel} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 md:mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">Create a {mode}</h1>
          <p className="text-muted-foreground text-sm mb-6 md:mb-8">Pick a template or start blank</p>
          <div className="space-y-3">
            {tpls.map(t => (
              <button key={t.key} type="button" onClick={() => applyTemplate(t.key)}
                className="w-full text-left bg-card border border-border rounded-xl p-4 md:p-5 hover:border-primary/40 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">{t.title}</p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">{t.desc}</p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">{t.count} fields</Badge>
                </div>
              </button>
            ))}
            <button type="button" onClick={() => setShowTemplates(false)}
              className="w-full text-left border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 md:p-5 hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Start from scratch</p>
                  <p className="text-xs text-muted-foreground">Build your own {mode}</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Elements palette content (shared between sidebar and sheet) ──
  const paletteContent = (
    <>
      <div className="p-3 border-b border-border">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Elements</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Drag or tap to add</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {FIELD_ELEMENTS.map(el => (
            <button
              key={el.type}
              type="button"
              draggable={!isMobile}
              onDragStart={(e) => {
                e.dataTransfer.setData('newFieldType', el.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => addField(el.type)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left hover:bg-accent transition-colors cursor-grab active:cursor-grabbing group border border-transparent hover:border-border"
            >
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <el.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{el.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{el.desc}</p>
              </div>
            </button>
          ))}
        </div>
        {/* Settings section */}
        <div className="p-3 border-t border-border mt-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Settings</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Form Type</Label>
              <Select value={formData.form_type} onValueChange={v => set('form_type', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Signature</Label>
              <Switch checked={formData.requires_signature} onCheckedChange={v => set('requires_signature', v)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Description</Label>
              <Textarea value={formData.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Brief description..." className="text-xs" />
            </div>
          </div>
        </div>
      </ScrollArea>
    </>
  );

  // ── Properties panel content (shared between sidebar and sheet) ──
  const propertiesContent = selectedField && selectedIdx !== null ? (
    <>
      <div className="p-3 border-b border-border flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">Field Properties</p>
        <button type="button" onClick={() => setSelectedIdx(null)} className="p-1 rounded hover:bg-accent text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Label</Label>
            <Input value={selectedField.label} onChange={e => updateField(selectedIdx, { label: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</Label>
            <Select value={selectedField.type} onValueChange={v => updateField(selectedIdx, { type: v as FormField['type'] })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_ELEMENTS.map(t => <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Width</Label>
            <div className="grid grid-cols-3 gap-1">
              {([
                { value: 'full', icon: RectangleHorizontal, label: 'Full' },
                { value: 'half', icon: Columns2, label: '1/2' },
                { value: 'third', icon: Columns3, label: '1/3' },
              ] as const).map(w => (
                <button key={w.value} type="button"
                  onClick={() => updateField(selectedIdx, { width: w.value } as any)}
                  className={cn('flex flex-col items-center gap-1 py-2 rounded-md border text-[10px] transition-all',
                    (selectedField.width || 'full') === w.value
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-primary/30')}>
                  <w.icon className="w-4 h-4" />
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Placeholder</Label>
            <Input value={selectedField.placeholder || ''} onChange={e => updateField(selectedIdx, { placeholder: e.target.value })} className="h-8 text-xs" placeholder="Placeholder text..." />
          </div>
          <div className="flex items-center justify-between py-1">
            <Label className="text-xs font-medium">Required</Label>
            <Switch checked={selectedField.required} onCheckedChange={v => updateField(selectedIdx, { required: v })} />
          </div>
          {(selectedField.type === 'select' || selectedField.type === 'radio') && (
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Options</Label>
              <div className="space-y-1">
                {selectedField.options?.map((opt: string, i: number) => (
                  <div key={i} className="flex items-center gap-1 bg-muted/60 rounded-md px-2.5 py-1.5 text-xs group">
                    <GripVertical className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const opts = [...(selectedField.options || [])];
                        opts[i] = e.target.value;
                        updateField(selectedIdx, { options: opts });
                      }}
                      className="h-6 text-xs border-none shadow-none bg-transparent px-1 focus-visible:ring-0"
                    />
                    <button type="button" onClick={() => {
                      updateField(selectedIdx, { options: selectedField.options?.filter((_: string, idx: number) => idx !== i) });
                    }} className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <Input className="h-7 text-xs" value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Add option..."
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newOption.trim()) { updateField(selectedIdx, { options: [...(selectedField.options || []), newOption.trim()] }); setNewOption(''); } } }} />
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 shrink-0" onClick={() => {
                  if (newOption.trim()) { updateField(selectedIdx, { options: [...(selectedField.options || []), newOption.trim()] }); setNewOption(''); }
                }}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          <Separator />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1 gap-1 text-xs h-8" onClick={() => duplicateField(selectedIdx)}>
              <Copy className="w-3 h-3" /> Copy
            </Button>
            <Button type="button" variant="destructive" size="sm" className="flex-1 gap-1 text-xs h-8" onClick={() => removeField(selectedIdx)}>
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
          </div>
        </div>
      </ScrollArea>
    </>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between border-b border-border px-3 md:px-4 h-12 md:h-14 shrink-0 bg-card">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <button type="button" onClick={onCancel} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          {/* Mobile: palette toggle */}
          {view === 'build' && isMobile && (
            <button type="button" onClick={() => setShowPalette(true)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
              <Menu className="w-4 h-4" />
            </button>
          )}
          <Separator orientation="vertical" className="h-5 md:h-6 hidden sm:block" />
          <div className="flex flex-col min-w-0">
            <Input
              value={formData.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Untitled form"
              className="border-none shadow-none text-xs md:text-sm font-semibold h-6 px-1 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] text-muted-foreground">{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
              {formData.is_active ? (
                <Badge variant="default" className="h-4 text-[9px] px-1.5 gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />Live</Badge>
              ) : (
                <Badge variant="secondary" className="h-4 text-[9px] px-1.5">Draft</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* Build / Preview toggle */}
          <div className="bg-muted rounded-lg p-0.5 flex">
            <button type="button" onClick={() => setView('build')}
              className={cn('flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                view === 'build' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Hammer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Build</span>
            </button>
            <button type="button" onClick={() => setView('preview')}
              className={cn('flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                view === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Preview</span>
            </button>
          </div>
          <Separator orientation="vertical" className="h-5 md:h-6 hidden sm:block" />
          <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="gap-1 h-8 px-2 md:px-3 text-xs">
            <Save className="w-3.5 h-3.5" /><span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>
          <Button size="sm" onClick={() => { set('is_active', true); onSave(); }} disabled={isSaving} className="gap-1 h-8 px-2 md:px-3 text-xs">
            <Globe className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Publish</span>
          </Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* MOBILE: Elements palette as Sheet */}
        {isMobile && (
          <Sheet open={showPalette} onOpenChange={setShowPalette}>
            <SheetContent side="left" className="w-[280px] p-0 flex flex-col [&>button]:hidden">
              {paletteContent}
            </SheetContent>
          </Sheet>
        )}

        {/* DESKTOP: Left sidebar — Elements palette (build mode only) */}
        {view === 'build' && !isMobile && (
          <div className="w-48 lg:w-56 shrink-0 border-r border-border bg-card flex flex-col">
            {paletteContent}
          </div>
        )}

        {/* Canvas area */}
        <div className="flex-1 overflow-auto bg-muted/30" onClick={() => setSelectedIdx(null)}>
          {view === 'preview' ? (
            <PreviewMode formData={formData} />
          ) : (
            <BuildCanvas
              fields={fields}
              formData={formData}
              selectedIdx={selectedIdx}
              dragOverIdx={dragOverIdx}
              dragSourceIdx={dragSourceIdx}
              setDragOverIdx={setDragOverIdx}
              setDragSourceIdx={setDragSourceIdx}
              onSelect={setSelectedIdx}
              onUpdate={updateField}
              onRemove={removeField}
              onDuplicate={duplicateField}
              onDrop={handleCanvasDrop}
              onAddField={addField}
              isMobile={isMobile}
              onMoveField={(from, to) => {
                const next = [...fields];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                set('fields', next);
                setSelectedIdx(to);
              }}
            />
          )}
        </div>

        {/* MOBILE: Properties as bottom Sheet */}
        {isMobile && selectedField && (
          <Sheet open={selectedIdx !== null} onOpenChange={(open) => { if (!open) setSelectedIdx(null); }}>
            <SheetContent side="bottom" className="h-[70vh] p-0 flex flex-col rounded-t-2xl [&>button]:hidden">
              {propertiesContent}
            </SheetContent>
          </Sheet>
        )}

        {/* DESKTOP: Right sidebar — Field properties (build mode + field selected) */}
        {view === 'build' && !isMobile && selectedField && selectedIdx !== null && (
          <div className="w-56 lg:w-64 shrink-0 border-l border-border bg-card flex flex-col">
            {propertiesContent}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════ Build Canvas ═══════ */
function BuildCanvas({ fields, formData, selectedIdx, dragOverIdx, dragSourceIdx, setDragOverIdx, setDragSourceIdx, onSelect, onUpdate, onRemove, onDuplicate, onDrop, onAddField, isMobile, onMoveField }: {
  fields: ExtendedFormField[];
  formData: any;
  selectedIdx: number | null;
  dragOverIdx: number | null;
  dragSourceIdx: number | null;
  setDragOverIdx: (i: number | null) => void;
  setDragSourceIdx: (i: number | null) => void;
  onSelect: (i: number | null) => void;
  onUpdate: (i: number, u: Partial<ExtendedFormField>) => void;
  onRemove: (i: number) => void;
  onDuplicate: (i: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onAddField: (type: string) => void;
  isMobile: boolean;
  onMoveField: (from: number, to: number) => void;
}) {
  return (
    <div className="max-w-[700px] mx-auto py-4 md:py-8 px-3 md:px-6">
      {formData.description && (
        <div className="bg-card rounded-lg p-3 md:p-4 mb-4 text-xs md:text-sm text-muted-foreground border border-border">
          {formData.description}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-3 md:p-6 min-h-[300px] md:min-h-[420px]">
        {fields.length === 0 ? (
          <EmptyCanvas onDrop={onDrop} onAddField={onAddField} isMobile={isMobile} />
        ) : (
          <>
            <DropIndicator index={0} isActive={dragOverIdx === 0} onDragOver={setDragOverIdx} onDrop={onDrop} />

            <div className="flex flex-wrap gap-y-0">
              {fields.map((field, i) => {
                const w = field.width || 'full';
                const widthClass = w === 'half' ? 'w-full sm:w-1/2' : w === 'third' ? 'w-full sm:w-1/3' : 'w-full';
                return (
                  <div key={field.id} className={cn(widthClass, 'px-0.5')}>
                    <FieldCard
                      field={field}
                      index={i}
                      totalFields={fields.length}
                      isSelected={selectedIdx === i}
                      isDragSource={dragSourceIdx === i}
                      onSelect={onSelect}
                      onUpdate={onUpdate}
                      onRemove={onRemove}
                      onDuplicate={onDuplicate}
                      setDragSourceIdx={setDragSourceIdx}
                      isMobile={isMobile}
                      onMoveField={onMoveField}
                    />
                    <DropIndicator index={i + 1} isActive={dragOverIdx === i + 1} onDragOver={setDragOverIdx} onDrop={onDrop} />
                  </div>
                );
              })}
            </div>

            {formData.requires_signature && (
              <>
                <Separator className="my-4 md:my-5" />
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Signature Section
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-xs font-medium text-foreground">Client Name *</label><div className="h-9 border border-border rounded-md bg-muted/30" /></div>
                    <div className="space-y-1"><label className="text-xs font-medium text-foreground">Date *</label><div className="h-9 border border-border rounded-md bg-muted/30 flex items-center px-3"><Calendar className="w-3.5 h-3.5 text-muted-foreground ml-auto" /></div></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Signature *</label>
                    <div className="h-16 border-2 border-dashed border-border rounded-md bg-muted/20 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground">Signature pad</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Quick add */}
            <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-dashed border-border/50">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-bold mr-1">+ Add:</span>
                {FIELD_ELEMENTS.slice(0, isMobile ? 4 : 5).map(el => (
                  <button key={el.type} type="button" onClick={(e) => { e.stopPropagation(); onAddField(el.type); }}
                    className="flex items-center gap-1 px-2 py-1.5 md:py-1 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-all">
                    <el.icon className="w-3 h-3" /> {el.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════ Field Card ═══════ */
function FieldCard({ field, index, isSelected, isDragSource, onSelect, onUpdate, onRemove, onDuplicate, setDragSourceIdx, isMobile }: {
  field: ExtendedFormField; index: number; isSelected: boolean; isDragSource: boolean;
  onSelect: (i: number | null) => void; onUpdate: (i: number, u: Partial<ExtendedFormField>) => void;
  onRemove: (i: number) => void; onDuplicate: (i: number) => void; setDragSourceIdx: (i: number | null) => void;
  isMobile: boolean;
}) {
  return (
    <div
      draggable={!isMobile}
      onDragStart={(e) => { e.dataTransfer.setData('moveFieldIdx', index.toString()); e.dataTransfer.effectAllowed = 'move'; setDragSourceIdx(index); }}
      onDragEnd={() => setDragSourceIdx(null)}
      onClick={(e) => { e.stopPropagation(); onSelect(index); }}
      className={cn(
        'relative group rounded-lg transition-all py-2 md:py-2.5 px-2 md:px-3 my-0.5',
        isSelected ? 'ring-2 ring-primary/40 bg-primary/[0.03]' : 'hover:bg-accent/30',
        isDragSource && 'opacity-40'
      )}
    >
      <div className="flex items-start gap-2">
        {!isMobile && (
          <div className="flex flex-col items-center gap-0.5 pt-0.5">
            <GripVertical className="w-4 h-4 text-muted-foreground/30 cursor-grab active:cursor-grabbing" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs md:text-sm font-medium text-foreground truncate">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </p>
            {field.width && field.width !== 'full' && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 border-muted-foreground/20 text-muted-foreground shrink-0">
                {field.width === 'half' ? '½' : '⅓'}
              </Badge>
            )}
          </div>
          <FieldVisual field={field} />
        </div>
      </div>

      {/* Hover/selected actions */}
      <div className={cn(
        'absolute -top-2 right-1 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-sm px-0.5 py-0.5 transition-opacity z-10',
        isSelected ? 'opacity-100' : isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onDuplicate(index); }} title="Duplicate">
          <Copy className="w-3 h-3" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onRemove(index); }} title="Delete">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

/* ═══════ Field Visual Preview ═══════ */
function FieldVisual({ field }: { field: ExtendedFormField }) {
  const base = 'border border-border rounded-md bg-muted/20';
  switch (field.type) {
    case 'text': case 'email': case 'phone':
      return <div className={cn(base, 'h-8 flex items-center px-3')}><span className="text-[10px] text-muted-foreground/50">{field.placeholder || (field.type === 'email' ? 'email@example.com' : field.type === 'phone' ? '(555) 000-0000' : 'Enter text...')}</span></div>;
    case 'textarea':
      return <div className={cn(base, 'h-14 md:h-16 flex items-start p-2')}><span className="text-[10px] text-muted-foreground/50">{field.placeholder || 'Enter text...'}</span></div>;
    case 'date':
      return <div className={cn(base, 'h-8 flex items-center px-3 justify-between')}><span className="text-[10px] text-muted-foreground/50">MM/DD/YYYY</span><Calendar className="w-3.5 h-3.5 text-muted-foreground/30" /></div>;
    case 'select':
      return <div className={cn(base, 'h-8 flex items-center px-3 justify-between')}><span className="text-[10px] text-muted-foreground/50">Select...</span><ChevronDown className="w-3.5 h-3.5 text-muted-foreground/30" /></div>;
    case 'checkbox':
      return <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-border rounded bg-muted/20" /><span className="text-[10px] text-muted-foreground/50">Check to confirm</span></div>;
    case 'radio':
      return (
        <div className="space-y-1">
          {(field.options || ['Option 1', 'Option 2']).slice(0, 4).map((opt, i) => (
            <div key={i} className="flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-border rounded-full bg-muted/20" /><span className="text-[10px] text-muted-foreground/50">{opt}</span></div>
          ))}
          {(field.options?.length || 0) > 4 && <span className="text-[10px] text-muted-foreground/40">+{(field.options?.length || 0) - 4} more</span>}
        </div>
      );
    default:
      return <div className={cn(base, 'h-8')} />;
  }
}

/* ═══════ Drop Indicator ═══════ */
function DropIndicator({ index, isActive, onDragOver, onDrop }: {
  index: number; isActive: boolean;
  onDragOver: (i: number | null) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
}) {
  return (
    <div
      className={cn('transition-all rounded-sm relative',
        isActive ? 'h-10 bg-primary/8 border-2 border-dashed border-primary/40 my-1 flex items-center justify-center' : 'h-1 my-0'
      )}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(index); }}
      onDragLeave={() => onDragOver(null)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(null); onDrop(e, index); }}
    >
      {isActive && <span className="text-[10px] text-primary font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Drop here</span>}
    </div>
  );
}

/* ═══════ Empty Canvas ═══════ */
function EmptyCanvas({ onDrop, onAddField, isMobile }: { onDrop: (e: React.DragEvent, idx: number) => void; onAddField: (t: string) => void; isMobile: boolean }) {
  const [hovering, setHovering] = useState(false);
  return (
    <div
      className={cn('py-12 md:py-16 text-center rounded-lg transition-all border-2 border-dashed',
        hovering ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/15'
      )}
      onDragOver={(e) => { e.preventDefault(); setHovering(true); }}
      onDragLeave={() => setHovering(false)}
      onDrop={(e) => { e.preventDefault(); setHovering(false); onDrop(e, 0); }}
    >
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-muted mx-auto mb-4 flex items-center justify-center">
        <Plus className="w-6 h-6 md:w-7 md:h-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">Add your first field</p>
      <p className="text-xs text-muted-foreground mb-5">{isMobile ? 'Tap below or use menu' : 'Drag from the sidebar or click below'}</p>
      <div className="flex items-center justify-center gap-2 flex-wrap px-4">
        {FIELD_ELEMENTS.slice(0, isMobile ? 3 : 4).map(el => (
          <Button key={el.type} variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAddField(el.type); }} className="gap-1.5 text-xs">
            <el.icon className="w-3.5 h-3.5" /> {el.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/* ═══════ Preview Mode ═══════ */
function PreviewMode({ formData }: { formData: any }) {
  const [responses, setResponses] = useState<Record<string, any>>({});

  return (
    <div className="max-w-[700px] mx-auto py-4 md:py-8 px-3 md:px-6">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="text-center py-6 md:py-8 px-4 md:px-6">
          <h1 className="text-lg md:text-xl font-bold text-foreground">{formData.name || 'Untitled Form'}</h1>
          {formData.description && <p className="text-xs md:text-sm text-muted-foreground mt-2 max-w-md mx-auto">{formData.description}</p>}
        </div>
        <Separator />
        <div className="p-4 md:p-6 space-y-4 md:space-y-5">
          {formData.fields?.map((field: FormField) => (
            <FormFieldRenderer key={field.id} field={field} value={responses[field.id]}
              onChange={(v: any) => setResponses(prev => ({ ...prev, [field.id]: v }))} />
          ))}
          {formData.fields?.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No fields added yet</p>}
          {formData.requires_signature && (
            <div className="pt-4 border-t border-border space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Signature</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Client Name *</Label><Input placeholder="Printed Name" /></div>
                <div className="space-y-1.5"><Label className="text-sm">Date *</Label><Input type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-sm">Signature *</Label><SignaturePad onSignatureChange={() => {}} /></div>
            </div>
          )}
        </div>
        <div className="p-4 md:p-6 pt-0"><Button className="w-full h-10 md:h-11" disabled>Submit Form</Button></div>
      </div>
    </div>
  );
}
