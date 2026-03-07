import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Sparkles, TrendingUp, ShoppingBag, Users, Settings, Megaphone, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './DateRangeFilter';
import { motion, AnimatePresence } from 'framer-motion';

interface AIInsightsPanelProps {
  dateRange: DateRange;
}

interface Recommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'revenue' | 'operations' | 'retention' | 'inventory' | 'marketing';
}

interface InsightsResponse {
  recommendations: Recommendation[];
  summary: string;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  revenue: TrendingUp,
  operations: Settings,
  retention: Users,
  inventory: ShoppingBag,
  marketing: Megaphone,
};

const impactColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-primary/10 text-primary border-primary/20',
};

export function AIInsightsPanel({ dateRange }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-business-insights', {
        body: {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setInsights(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Business Recommendations
            </CardTitle>
            <CardDescription>
              AI-powered analysis of your business data with actionable suggestions
            </CardDescription>
          </div>
          <Button
            onClick={fetchInsights}
            disabled={loading}
            variant={insights ? 'outline' : 'default'}
            size="sm"
            className="gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {insights ? 'Refresh' : 'Generate Insights'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!insights && !loading && !error && (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Click "Generate Insights" to analyze your business data and receive personalized recommendations.
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-6 text-destructive">
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchInsights} className="mt-3">
              Try Again
            </Button>
          </div>
        )}

        <AnimatePresence>
          {insights && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Summary */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm font-medium text-foreground">{insights.summary}</p>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                {insights.recommendations.map((rec, idx) => {
                  const Icon = categoryIcons[rec.category] || TrendingUp;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 rounded-lg border border-border/50 bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-foreground">{rec.title}</h4>
                            <Badge variant="outline" className={`text-xs ${impactColors[rec.impact]}`}>
                              {rec.impact} impact
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
