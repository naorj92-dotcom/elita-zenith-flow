import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Cake, Eye, Gift } from 'lucide-react';

interface BirthdayCampaignConfig {
  enabled: boolean;
  days_before: number;
  gift_type: 'discount' | 'free_addon' | 'custom';
  discount_percent: number;
  free_addon_service_id: string | null;
  message_template: string;
}

const DEFAULT_CONFIG: BirthdayCampaignConfig = {
  enabled: false,
  days_before: 7,
  gift_type: 'discount',
  discount_percent: 20,
  free_addon_service_id: null,
  message_template: 'Happy Birthday, [first_name]! 🎂\n\nAs a special gift, enjoy [gift_details].\n\nUse code: [code]\n\nBook now: [portal_url]\n\nExpires in 30 days.',
};

const samplePreview = (template: string, giftType: string, discountPercent: number) => {
  let giftDetails = '';
  if (giftType === 'discount') giftDetails = `${discountPercent}% off your next visit`;
  else if (giftType === 'free_addon') giftDetails = 'a complimentary add-on service';
  else giftDetails = 'a special birthday treat';

  return template
    .replace(/\[first_name\]/g, 'Sarah')
    .replace(/\[gift_details\]/g, giftDetails)
    .replace(/\[code\]/g, 'BDAY-X7KM2P')
    .replace(/\[portal_url\]/g, 'https://portal.elitamedspa.com');
};

export function BirthdayCampaignSection() {
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['birthday-campaign-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('value')
        .eq('key', 'birthday_campaign')
        .maybeSingle();
      return (data?.value as unknown as BirthdayCampaignConfig) || DEFAULT_CONFIG;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services-for-addon'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const current = config || DEFAULT_CONFIG;

  const saveMutation = useMutation({
    mutationFn: async (newConfig: BirthdayCampaignConfig) => {
      const { error } = await supabase
        .from('business_settings')
        .upsert({ key: 'birthday_campaign', value: newConfig as any }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthday-campaign-config'] });
      toast.success('Birthday campaign saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const updateField = <K extends keyof BirthdayCampaignConfig>(field: K, value: BirthdayCampaignConfig[K]) => {
    saveMutation.mutate({ ...current, [field]: value });
  };

  if (isLoading) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Cake className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle className="text-base">Birthday Campaign</CardTitle>
                <CardDescription>Auto-send birthday gifts to clients</CardDescription>
              </div>
            </div>
            <Switch
              checked={current.enabled}
              onCheckedChange={(checked) => updateField('enabled', checked)}
            />
          </div>
        </CardHeader>

        {current.enabled && (
          <CardContent className="space-y-5">
            {/* Days before */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Days before birthday</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={current.days_before}
                  onChange={(e) => updateField('days_before', Number(e.target.value) || 7)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Gift type */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Gift type</Label>
              <RadioGroup
                value={current.gift_type}
                onValueChange={(v) => updateField('gift_type', v as BirthdayCampaignConfig['gift_type'])}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="discount" id="bday-discount" />
                  <Label htmlFor="bday-discount" className="text-sm">Discount %</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="free_addon" id="bday-addon" />
                  <Label htmlFor="bday-addon" className="text-sm">Free Add-on</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="bday-custom" />
                  <Label htmlFor="bday-custom" className="text-sm">Custom message only</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Conditional fields */}
            {current.gift_type === 'discount' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Discount percentage</Label>
                <div className="flex items-center gap-2 max-w-[200px]">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={current.discount_percent}
                    onChange={(e) => updateField('discount_percent', Number(e.target.value) || 20)}
                    className="h-9"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            )}

            {current.gift_type === 'free_addon' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Free add-on service</Label>
                <Select
                  value={current.free_addon_service_id || ''}
                  onValueChange={(v) => updateField('free_addon_service_id', v || null)}
                >
                  <SelectTrigger className="h-9 max-w-sm">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Message template */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Message template</Label>
              <Textarea
                value={current.message_template}
                onChange={(e) => updateField('message_template', e.target.value)}
                rows={5}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Variables: <code>[first_name]</code>, <code>[gift_details]</code>, <code>[code]</code>, <code>[portal_url]</code>
              </p>
            </div>

            {/* Preview */}
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Preview Message
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Message Preview
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg bg-muted/50 p-4 border whitespace-pre-wrap text-sm">
            {samplePreview(current.message_template, current.gift_type, current.discount_percent)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
