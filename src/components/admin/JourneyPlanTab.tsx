import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Loader2, Sparkles } from 'lucide-react';
import { CATEGORIES, type TreatmentCategory } from '@/lib/elitaMethod';
import { toast } from 'sonner';

const STAGE_ORDER: TreatmentCategory[] = ['freeze', 'tone', 'tight', 'glow'];

interface StageConfig {
  id: string;
  stage: string;
  description: string | null;
  timeline_estimate: string | null;
  sessions_target: number;
  service_ids: string[];
}

export function JourneyPlanTab({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();

  const { data: stageConfigs = [], isLoading } = useQuery({
    queryKey: ['journey-stage-configs-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journey_stage_configs')
        .select('*');
      if (error) throw error;
      return (data || []) as StageConfig[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['all-services-active'],
    queryFn: async () => {
      const { data } = await supabase.from('services').select('id, name, category').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: clientProgress = [] } = useQuery({
    queryKey: ['client-treatment-progress-admin', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_treatment_progress')
        .select('*')
        .eq('client_id', clientId);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="h-5 w-5 text-elita-camel" />
        <h3 className="text-lg font-heading font-semibold">Elita Journey Plan</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure each stage of the client's treatment journey. These settings apply globally to all clients.
      </p>

      {STAGE_ORDER.map((stageKey) => {
        const config = stageConfigs.find(c => c.stage === stageKey);
        const cat = CATEGORIES[stageKey];
        const progress = clientProgress.find((p: any) => p.category === stageKey);

        return (
          <StageConfigCard
            key={stageKey}
            stageKey={stageKey}
            config={config}
            cat={cat}
            services={services}
            progress={progress}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['journey-stage-configs-admin'] })}
          />
        );
      })}
    </div>
  );
}

function StageConfigCard({
  stageKey,
  config,
  cat,
  services,
  progress,
  onSaved,
}: {
  stageKey: TreatmentCategory;
  config: StageConfig | undefined;
  cat: { label: string; emoji: string; description: string };
  services: { id: string; name: string; category: string }[];
  progress: any;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState(config?.description || '');
  const [timeline, setTimeline] = useState(config?.timeline_estimate || '');
  const [sessionsTarget, setSessionsTarget] = useState(config?.sessions_target || 6);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(config?.service_ids || []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('journey_stage_configs')
        .upsert({
          id: config?.id,
          stage: stageKey,
          description: description || null,
          timeline_estimate: timeline || null,
          sessions_target: sessionsTarget,
          service_ids: selectedServiceIds,
        }, { onConflict: 'stage' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${cat.label} stage updated`);
      onSaved();
    },
    onError: () => toast.error('Failed to save'),
  });

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const sessionsCompleted = progress?.sessions_completed || 0;
  const pct = sessionsTarget > 0 ? Math.round((sessionsCompleted / sessionsTarget) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="text-lg">{cat.emoji}</span>
          <span>{cat.label}</span>
          <span className="text-xs text-muted-foreground font-normal">— {cat.description}</span>
          {progress && (
            <span className="ml-auto text-xs font-medium text-muted-foreground">
              {sessionsCompleted}/{sessionsTarget} sessions ({pct}%)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs font-medium">Stage Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this stage involves for clients..."
            rows={3}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium">Timeline Estimate</Label>
            <Input
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="e.g. 6 sessions over 8–10 weeks"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Total Sessions</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={sessionsTarget}
              onChange={(e) => setSessionsTarget(parseInt(e.target.value) || 1)}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium mb-2 block">Assigned Services</Label>
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => toggleService(svc.id)}
                className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                  selectedServiceIds.includes(svc.id)
                    ? 'border-primary bg-primary/5 font-medium text-foreground'
                    : 'border-border/40 text-muted-foreground hover:border-border'
                }`}
              >
                {svc.name}
              </button>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save {cat.label} Config
        </Button>
      </CardContent>
    </Card>
  );
}
