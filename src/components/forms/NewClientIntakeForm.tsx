import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { SignaturePad } from '@/components/forms/SignaturePad';
import { toast } from 'sonner';
import elitaLogo from '@/assets/elita-logo.png';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

const AREAS_OF_FOCUS = ['Face','Chin','Neck','Arms','Abdomen','Flanks','Thighs','Buttocks'];
const GOALS_TARGET = ['Fat Reduction','Muscle Toning','Skin Tightening','Anti-Aging','Acne','Maintenance'];
const MEDICAL_CONDITIONS = [
  'Pregnant / Breastfeeding','Diabetes','Stroke / Bell\'s Palsy','HIV / Hepatitis',
  'Pacemaker / Implanted Device','Cancer (past or current)','Thyroid Condition','Keloid Scarring',
  'Metal Implants','Blood Clotting Disorder','Kidney Disease','Eczema / Psoriasis / Rosacea',
  'Hernia (current or history)','Autoimmune Disease','Liver Disease','MRSA / Staph Infections',
  'Heart Condition / High Blood Pressure','Epilepsy / Seizures','Respiratory Condition / Asthma','Cold Sensitivity Disorders',
];
const RECENT_TREATMENTS = ['Botox','Fillers','Laser','Chemical Peel','Microneedling','Body Contouring (elsewhere)','None'];

interface IntakeFormData {
  first_name: string;
  last_name: string;
  birthday: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  mobile_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  referral_source: string;
  areas_of_focus: string[];
  goals_target: string[];
  preferred_contact: string;
  desired_timeline: string;
  water_intake: string;
  exercise: string;
  diet: string;
  medical_conditions: string[];
  medical_explain: string;
  medications: string;
  recent_treatments: string[];
  ack_non_invasive: boolean;
  ack_info_accurate: boolean;
  ack_multiple_sessions: boolean;
  ack_pre_post_instructions: boolean;
  ack_not_weight_loss: boolean;
  photo_consent_clinical: boolean;
  photo_consent_marketing: boolean;
  client_printed_name: string;
  todays_date: string;
  signature_data: string | null;
}

const initialFormData: IntakeFormData = {
  first_name: '', last_name: '', birthday: '', address: '', city: '', state: '', zip: '',
  email: '', mobile_phone: '', emergency_contact_name: '', emergency_contact_phone: '',
  referral_source: '', areas_of_focus: [], goals_target: [], preferred_contact: '',
  desired_timeline: '', water_intake: '', exercise: '', diet: '', medical_conditions: [],
  medical_explain: '', medications: '', recent_treatments: [],
  ack_non_invasive: false, ack_info_accurate: false, ack_multiple_sessions: false,
  ack_pre_post_instructions: false, ack_not_weight_loss: false,
  photo_consent_clinical: false, photo_consent_marketing: false,
  client_printed_name: '', todays_date: new Date().toISOString().split('T')[0],
  signature_data: null,
};

interface Props {
  onSubmit?: (data: IntakeFormData) => void;
  disabled?: boolean;
}

export function NewClientIntakeForm({ onSubmit, disabled = false }: Props) {
  const [form, setForm] = useState<IntakeFormData>(initialFormData);

  const set = <K extends keyof IntakeFormData>(key: K, value: IntakeFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleArray = (key: 'areas_of_focus' | 'goals_target' | 'medical_conditions' | 'recent_treatments', value: string) => {
    setForm(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!form.signature_data) {
      toast.error('Please provide your signature');
      return;
    }
    if (onSubmit) {
      onSubmit(form);
    } else {
      toast.success('Form submitted successfully!');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-card rounded-xl border border-border">
      {/* Header */}
      <div className="text-center py-10 px-6">
        <img src={elitaLogo} alt="Elita Medical Spa" className="h-20 mx-auto mb-6 object-contain" />
        <h1 className="text-2xl font-heading font-bold text-foreground">New Client Intake</h1>
      </div>

      <div className="px-6 sm:px-10 pb-10 space-y-10">
        {/* Welcome */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Welcome to Elita Beauty Spa LLC!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We are glad you are here. Our team of professionals is committed to helping you with your beauty needs and goals. 
            The following questions will help make our time together as effective as possible. Thank you in advance for taking 
            the time to answer these questions as accurately as possible.
          </p>
        </div>

        <Separator />

        {/* Personal Info */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldLabel label="First name" required>
              <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} disabled={disabled} required />
            </FieldLabel>
            <FieldLabel label="Last name" required>
              <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} disabled={disabled} required />
            </FieldLabel>
            <FieldLabel label="Birthday" required>
              <Input type="date" value={form.birthday} onChange={e => set('birthday', e.target.value)} disabled={disabled} required />
            </FieldLabel>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <FieldLabel label="Address" required>
                <Input value={form.address} onChange={e => set('address', e.target.value)} disabled={disabled} required />
              </FieldLabel>
            </div>
            <FieldLabel label="City" required>
              <Input value={form.city} onChange={e => set('city', e.target.value)} disabled={disabled} required />
            </FieldLabel>
            <FieldLabel label="State" required>
              <Select value={form.state} onValueChange={v => set('state', v)} disabled={disabled}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldLabel>
            <FieldLabel label="ZIP code" required>
              <Input value={form.zip} onChange={e => set('zip', e.target.value)} disabled={disabled} required />
            </FieldLabel>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldLabel label="Email address" required>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} disabled={disabled} required />
            </FieldLabel>
            <FieldLabel label="Mobile phone" required>
              <Input type="tel" value={form.mobile_phone} onChange={e => set('mobile_phone', e.target.value)} disabled={disabled} required />
            </FieldLabel>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldLabel label="Emergency contact name" required>
              <Input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} disabled={disabled} required />
            </FieldLabel>
            <FieldLabel label="Emergency contact phone" required>
              <Input type="tel" value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} disabled={disabled} required />
            </FieldLabel>
          </div>
          <FieldLabel label="How did you hear about us?" required>
            <Select value={form.referral_source} onValueChange={v => set('referral_source', v)} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
              <SelectContent>
                {['Google','Instagram','Facebook','TikTok','Friend / Family','Yelp','Walk-in','Other'].map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldLabel>
        </div>

        <Separator />

        {/* Areas of Focus / Goals / Contact / Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CheckboxGroup label="Areas of Focus" required items={AREAS_OF_FOCUS} selected={form.areas_of_focus}
            onToggle={v => toggleArray('areas_of_focus', v)} disabled={disabled} />
          <CheckboxGroup label="GOALS & TARGET AREA" required items={GOALS_TARGET} selected={form.goals_target}
            onToggle={v => toggleArray('goals_target', v)} disabled={disabled} />
          <div>
            <SectionLabel label="Preferred contact method" required />
            <RadioGroup value={form.preferred_contact} onValueChange={v => set('preferred_contact', v)} disabled={disabled}
              className="space-y-2 mt-2">
              {['Text','Email','Phone'].map(o => (
                <div key={o} className="flex items-center gap-2">
                  <RadioGroupItem value={o} id={`contact-${o}`} />
                  <Label htmlFor={`contact-${o}`} className="text-sm cursor-pointer">{o}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <SectionLabel label="Desired Timeline" required />
            <RadioGroup value={form.desired_timeline} onValueChange={v => set('desired_timeline', v)} disabled={disabled}
              className="space-y-2 mt-2">
              {['ASAP','1-3 months','3-6 months','Long-term'].map(o => (
                <div key={o} className="flex items-center gap-2">
                  <RadioGroupItem value={o} id={`timeline-${o}`} />
                  <Label htmlFor={`timeline-${o}`} className="text-sm cursor-pointer">{o}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <Separator />

        {/* Lifestyle & Maintenance */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">Lifestyle & Maintenance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <SectionLabel label="Water Intake" required />
              <RadioGroup value={form.water_intake} onValueChange={v => set('water_intake', v)} disabled={disabled}
                className="space-y-2 mt-2">
                {['Low','Moderate','High'].map(o => (
                  <div key={o} className="flex items-center gap-2">
                    <RadioGroupItem value={o} id={`water-${o}`} />
                    <Label htmlFor={`water-${o}`} className="text-sm cursor-pointer">{o}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <SectionLabel label="Exercise" required />
              <RadioGroup value={form.exercise} onValueChange={v => set('exercise', v)} disabled={disabled}
                className="space-y-2 mt-2">
                {['None','1-2x/week','3-4x/week','5+times/week'].map(o => (
                  <div key={o} className="flex items-center gap-2">
                    <RadioGroupItem value={o} id={`exercise-${o}`} />
                    <Label htmlFor={`exercise-${o}`} className="text-sm cursor-pointer">{o}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <SectionLabel label="Diet" required />
              <RadioGroup value={form.diet} onValueChange={v => set('diet', v)} disabled={disabled}
                className="space-y-2 mt-2">
                {['Balanced','High Protein','Low Carb','Other'].map(o => (
                  <div key={o} className="flex items-center gap-2">
                    <RadioGroupItem value={o} id={`diet-${o}`} />
                    <Label htmlFor={`diet-${o}`} className="text-sm cursor-pointer">{o}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>

        <Separator />

        {/* Medical History */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">Medical History</h3>
          <p className="text-sm text-muted-foreground mb-4">Please check all that apply. This helps us ensure your safety.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
            {MEDICAL_CONDITIONS.map(c => (
              <div key={c} className="flex items-start gap-2.5">
                <Checkbox id={`med-${c}`} checked={form.medical_conditions.includes(c)}
                  onCheckedChange={() => toggleArray('medical_conditions', c)} disabled={disabled} className="mt-0.5" />
                <Label htmlFor={`med-${c}`} className="text-sm leading-tight cursor-pointer">{c}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* Explain checked */}
        <FieldLabel label="Please explain any checked items">
          <Textarea value={form.medical_explain} onChange={e => set('medical_explain', e.target.value)}
            disabled={disabled} rows={4} className="bg-muted/40" />
        </FieldLabel>

        <Separator />

        {/* Medications & Recent Treatments */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-3">Medications & Recent Treatments</h3>
          <FieldLabel label="List all medications, supplements, topical prescriptions, or blood thinners:">
            <Input value={form.medications} onChange={e => set('medications', e.target.value)} disabled={disabled} />
          </FieldLabel>
          <div className="mt-5">
            <SectionLabel label="Recent (30 days)" required />
            <div className="space-y-2.5 mt-2">
              {RECENT_TREATMENTS.map(t => (
                <div key={t} className="flex items-center gap-2.5">
                  <Checkbox id={`recent-${t}`} checked={form.recent_treatments.includes(t)}
                    onCheckedChange={() => toggleArray('recent_treatments', t)} disabled={disabled} />
                  <Label htmlFor={`recent-${t}`} className="text-sm cursor-pointer">{t}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Client Acknowledgements */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-1">
            Client Acknowledgements <span className="normal-case text-xs text-muted-foreground">SELECT ALL</span> <span className="text-destructive">*</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {[
              { key: 'ack_non_invasive' as const, label: 'I understand treatments are non-invasive and results vary.' },
              { key: 'ack_info_accurate' as const, label: 'I confirm all information provided is accurate.' },
              { key: 'ack_multiple_sessions' as const, label: 'I understand multiple sessions may be required.' },
              { key: 'ack_pre_post_instructions' as const, label: 'I agree to follow all pre- and post-treatment instructions.' },
              { key: 'ack_not_weight_loss' as const, label: 'I understand this is not a weight-loss procedure.' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-start gap-2.5">
                <Checkbox id={key} checked={form[key]} onCheckedChange={v => set(key, !!v)} disabled={disabled} className="mt-0.5" />
                <Label htmlFor={key} className="text-sm leading-snug cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Photography Consent */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-3">
            Photography Consent <span className="text-destructive">*</span>
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Checkbox id="photo_clinical" checked={form.photo_consent_clinical}
                onCheckedChange={v => set('photo_consent_clinical', !!v)} disabled={disabled} className="mt-0.5" />
              <Label htmlFor="photo_clinical" className="text-sm cursor-pointer">I consent to before & after photos for clinical records.</Label>
            </div>
            <div className="flex items-start gap-2.5">
              <Checkbox id="photo_marketing" checked={form.photo_consent_marketing}
                onCheckedChange={v => set('photo_consent_marketing', !!v)} disabled={disabled} className="mt-0.5" />
              <Label htmlFor="photo_marketing" className="text-sm cursor-pointer">I consent to anonymized marketing use (face hidden).</Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Maryland Legal Disclosure */}
        <div className="border border-border rounded-lg p-6 bg-muted/30">
          <h3 className="text-base font-bold text-foreground mb-3">MARYLAND LEGAL DISCLOSURE</h3>
          <p className="text-sm text-foreground leading-relaxed" style={{ textAlign: 'justify' }}>
            Elita MedSpa provides cosmetic, non-medical services only and does not diagnose or treat disease. 
            I release Elita MedSpa from liability related to undisclosed conditions or non-compliance, except 
            in cases of gross negligence or willful misconduct as permitted by Maryland law.
          </p>
        </div>

        <Separator />

        {/* Signatures */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">Signatures</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <FieldLabel label="Client Name" required>
              <Input placeholder="Printed Name" value={form.client_printed_name}
                onChange={e => set('client_printed_name', e.target.value)} disabled={disabled} required />
            </FieldLabel>
            <FieldLabel label="Today's date" required>
              <Input type="date" value={form.todays_date}
                onChange={e => set('todays_date', e.target.value)} disabled={disabled} required />
            </FieldLabel>
          </div>
          <div>
            <SectionLabel label="Signature" required />
            <div className="mt-2">
              <SignaturePad onSignatureChange={sig => set('signature_data', sig)}
                initialSignature={form.signature_data} disabled={disabled} />
            </div>
          </div>
        </div>

        {/* Submit */}
        {!disabled && (
          <div className="pt-4">
            <Button type="submit" className="w-full h-12 text-base font-semibold">
              Submit Intake Form
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

/* ─── Helper Components ───────────────────────────── */

function FieldLabel({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <p className="text-sm font-medium text-foreground">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </p>
  );
}

function CheckboxGroup({ label, required, items, selected, onToggle, disabled }: {
  label: string; required?: boolean; items: string[]; selected: string[];
  onToggle: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div>
      <SectionLabel label={label} required={required} />
      <div className="space-y-2.5 mt-2">
        {items.map(item => (
          <div key={item} className="flex items-center gap-2.5">
            <Checkbox id={`${label}-${item}`} checked={selected.includes(item)}
              onCheckedChange={() => onToggle(item)} disabled={disabled} />
            <Label htmlFor={`${label}-${item}`} className="text-sm cursor-pointer">{item}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}
