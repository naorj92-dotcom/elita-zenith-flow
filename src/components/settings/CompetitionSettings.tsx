import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompetitionSettings {
  prize_description: string;
  is_visible: boolean;
  primary_metric: string;
  monthly_revenue_goal: number;
}

const DEFAULTS: CompetitionSettings = {
  prize_description: '🏆 Prize: $200 bonus + Elita Champion title',
  is_visible: true,
  primary_metric: 'revenue',
  monthly_revenue_goal: 50000,
};

export function CompetitionSettingsPanel() {
  const [settings, setSettings] = useState<CompetitionSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('value')
        .eq('key', 'competition_settings')
        .maybeSingle();
      if (data?.value) {
        setSettings({ ...DEFAULTS, ...(data.value as Record<string, any>) });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .eq('key', 'competition_settings')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('business_settings')
          .update({ value: settings as any })
          .eq('key', 'competition_settings');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_settings')
          .insert({ key: 'competition_settings', value: settings as any });
        if (error) throw error;
      }
      toast.success('Competition settings saved');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Competition Settings
        </CardTitle>
        <CardDescription>Configure the monthly sales competition</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Competition Visible to Staff</p>
            <p className="text-sm text-muted-foreground">Show the competition page for all staff</p>
          </div>
          <Switch
            checked={settings.is_visible}
            onCheckedChange={(v) => setSettings(s => ({ ...s, is_visible: v }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Monthly Prize Description</Label>
          <Input
            value={settings.prize_description}
            onChange={(e) => setSettings(s => ({ ...s, prize_description: e.target.value }))}
            placeholder="e.g. 🏆 $200 bonus + Elita Champion title"
          />
        </div>

        <div className="space-y-2">
          <Label>Primary Ranking Metric</Label>
          <Select
            value={settings.primary_metric}
            onValueChange={(v) => setSettings(s => ({ ...s, primary_metric: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="appointments">Appointments</SelectItem>
              <SelectItem value="upsells">Upsells</SelectItem>
              <SelectItem value="combined">Combined Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Monthly Team Revenue Goal ($)</Label>
          <Input
            type="number"
            value={settings.monthly_revenue_goal}
            onChange={(e) => setSettings(s => ({ ...s, monthly_revenue_goal: Number(e.target.value) }))}
          />
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Competition Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
