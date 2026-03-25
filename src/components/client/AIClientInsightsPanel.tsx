import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Brain, Sparkles, RefreshCw, ChevronDown, CalendarDays, AlertTriangle, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface AIClientInsightsPanelProps {
  clientId: string;
}

interface Insights {
  rebooking: string;
  upsell: string;
  retention_flag: string | null;
  conversation_starter: string;
}

interface CachedData {
  insights: Insights;
  generated_at: string;
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(clientId: string) {
  return `ai-client-insights-${clientId}`;
}

function getCachedInsights(clientId: string): CachedData | null {
  try {
    const raw = localStorage.getItem(getCacheKey(clientId));
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    const age = Date.now() - new Date(cached.generated_at).getTime();
    if (age > CACHE_DURATION_MS) {
      localStorage.removeItem(getCacheKey(clientId));
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

export function AIClientInsightsPanel({ clientId }: AIClientInsightsPanelProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CachedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = getCachedInsights(clientId);
    if (cached) setData(cached);
  }, [clientId]);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('ai-client-insights', {
        body: { clientId },
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      const cached: CachedData = {
        insights: result.insights,
        generated_at: result.generated_at,
      };
      localStorage.setItem(getCacheKey(clientId), JSON.stringify(cached));
      setData(cached);
    } catch (err: any) {
      setError(err.message || 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  const insightCards = data ? [
    { icon: CalendarDays, emoji: '📅', label: 'Rebooking Recommendation', text: data.insights.rebooking, color: 'text-primary' },
    { icon: Sparkles, emoji: '✨', label: 'Upsell Opportunity', text: data.insights.upsell, color: 'text-warning' },
    ...(data.insights.retention_flag ? [{
      icon: AlertTriangle, emoji: '⚠️', label: 'Retention Flag', text: data.insights.retention_flag, color: 'text-destructive',
    }] : []),
    { icon: MessageCircle, emoji: '💬', label: 'Conversation Starter', text: data.insights.conversation_starter, color: 'text-success' },
  ] : [];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full p-5 text-left hover:bg-accent/30 transition-colors rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <span className="font-heading font-semibold text-sm">AI Client Insights</span>
              {data && !open && (
                <span className="text-[11px] text-muted-foreground ml-1">
                  Updated {formatDistanceToNow(new Date(data.generated_at), { addSuffix: true })}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-5 px-5 space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
              {data && (
                <p className="text-xs text-muted-foreground">
                  Last updated {formatDistanceToNow(new Date(data.generated_at), { addSuffix: true })}
                </p>
              )}
              <Button
                onClick={fetchInsights}
                disabled={loading}
                variant={data ? 'outline' : 'default'}
                size="sm"
                className="gap-2 ml-auto"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {data ? 'Refresh' : 'Generate Insights'}
              </Button>
            </div>

            {/* Empty state */}
            {!data && !loading && !error && (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Generate AI-powered insights based on this client's history and journey.
                </p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-center py-4 text-destructive">
                <p className="text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchInsights} className="mt-2">
                  Try Again
                </Button>
              </div>
            )}

            {/* Insight Cards */}
            <AnimatePresence>
              {data && !loading && (
                <div className="space-y-3">
                  {insightCards.map((card, idx) => (
                    <motion.div
                      key={card.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg leading-none mt-0.5">{card.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${card.color}`}>
                            {card.label}
                          </p>
                          <p className="text-sm text-foreground leading-relaxed">{card.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
