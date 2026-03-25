import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gift, Loader2 } from 'lucide-react';

interface ReferralSettings {
  enabled: boolean;
  referrer_reward: string;
  referee_reward: string;
}

const DEFAULT_SETTINGS: ReferralSettings = {
  enabled: true,
  referrer_reward: '$50 credit',
  referee_reward: '10% off first visit',
};

export function ReferralProgramSettings() {
  const [settings, setSettings] = useState<ReferralSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('business_settings')
      .select('value')
      .eq('key', 'referral_program')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setSettings(data.value as any);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('business_settings')
      .upsert({ key: 'referral_program', value: settings as any }, { onConflict: 'key' });
    setSaving(false);
    if (error) toast.error('Failed to save');
    else toast.success('Referral settings saved');
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Referral Program
        </CardTitle>
        <CardDescription>
          Configure the refer-a-friend program for client portal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Referral Program</p>
            <p className="text-sm text-muted-foreground">Show referral page in client portal</p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Referrer Reward (what the existing client gets)</Label>
            <Input
              value={settings.referrer_reward}
              onChange={(e) => setSettings({ ...settings, referrer_reward: e.target.value })}
              placeholder="e.g. $50 credit, 500 points"
            />
          </div>
          <div className="space-y-2">
            <Label>New Client Reward (what the referred friend gets)</Label>
            <Input
              value={settings.referee_reward}
              onChange={(e) => setSettings({ ...settings, referee_reward: e.target.value })}
              placeholder="e.g. 10% off first visit"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Referral Settings
        </Button>
      </CardContent>
    </Card>
  );
}
