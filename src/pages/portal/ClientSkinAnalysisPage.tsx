import React, { useState, useRef, useCallback } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Sparkles, Loader2, ArrowRight, Share2, RotateCcw, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SkinScoreRing } from '@/components/skin-analysis/SkinScoreRing';
import { FaceGuideOverlay } from '@/components/skin-analysis/FaceGuideOverlay';
import { format, differenceInDays } from 'date-fns';

type Step = 'intro' | 'capture' | 'loading' | 'results';

interface SkinConcern {
  name: string;
  severity: 'Mild' | 'Moderate' | 'Significant';
  description: string;
  area: string;
}

interface SkinRecommendation {
  service_name: string;
  reason: string;
  priority: 'high' | 'medium';
  cta: string;
}

interface AnalysisResult {
  overall_summary: string;
  skin_score: number;
  concerns: SkinConcern[];
  recommendations: SkinRecommendation[];
  next_steps: string;
}

interface SavedAnalysis {
  id: string;
  client_id: string;
  skin_score: number;
  overall_summary: string;
  concerns: SkinConcern[];
  recommendations: SkinRecommendation[];
  next_steps: string;
  shared_with_provider: boolean;
  created_at: string;
}

export function ClientSkinAnalysisPage() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('intro');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [comparingTo, setComparingTo] = useState<SavedAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: pastAnalyses, isLoading: loadingPast } = useQuery({
    queryKey: ['skin-analyses', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('skin_analyses')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      return (data || []) as unknown as SavedAnalysis[];
    },
    enabled: !!client?.id,
  });

  const latestAnalysis = pastAnalyses?.[0];
  const canAnalyze = !latestAnalysis || differenceInDays(new Date(), new Date(latestAnalysis.created_at)) >= 30;
  const daysSinceLast = latestAnalysis ? differenceInDays(new Date(), new Date(latestAnalysis.created_at)) : null;
  const daysUntilNext = latestAnalysis ? Math.max(0, 30 - (daysSinceLast || 0)) : 0;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setStep('capture');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAnalyze = async () => {
    if (!imagePreview || !client?.id) return;
    setStep('loading');
    try {
      const { data, error } = await supabase.functions.invoke('skin-analysis', {
        body: {
          imageBase64: imagePreview,
          clientId: client.id,
          clientName: client.first_name,
        },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.cooldown) {
          toast.error('You can only run one analysis per 30 days.');
          setStep('intro');
          return;
        }
        toast.error(data.error);
        setStep('capture');
        return;
      }
      setAnalysis(data.analysis);
      queryClient.invalidateQueries({ queryKey: ['skin-analyses', client.id] });
      setStep('results');
    } catch {
      toast.error('Analysis failed. Please try again.');
      setStep('capture');
    }
  };

  const handleShareWithProvider = async () => {
    if (!latestAnalysis && !analysis) return;
    const targetId = latestAnalysis?.id;
    if (!targetId) {
      toast.error('No analysis to share');
      return;
    }
    const { error } = await supabase
      .from('skin_analyses')
      .update({ shared_with_provider: true, shared_at: new Date().toISOString() })
      .eq('id', targetId);
    if (error) {
      toast.error('Failed to share');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['skin-analyses', client?.id] });
    toast.success('Analysis shared with your provider!');
  };

  const handleViewPast = (a: SavedAnalysis) => {
    setAnalysis({
      overall_summary: a.overall_summary || '',
      skin_score: a.skin_score,
      concerns: a.concerns || [],
      recommendations: a.recommendations || [],
      next_steps: a.next_steps || '',
    });
    setStep('results');
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'Mild': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Moderate': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Significant': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const compareChange = (current: SkinConcern, previous: SavedAnalysis) => {
    const prevConcern = previous.concerns?.find((c: SkinConcern) => c.name === current.name);
    if (!prevConcern) return 'new';
    const levels = ['Mild', 'Moderate', 'Significant'];
    const cur = levels.indexOf(current.severity);
    const prev = levels.indexOf(prevConcern.severity);
    if (cur < prev) return 'improved';
    if (cur > prev) return 'worsened';
    return 'same';
  };

  // STEP 1: INTRO
  if (step === 'intro') {
    return (
      <div className="space-y-5 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3 pt-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-[hsl(35,72%,56%)]/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-[hsl(35,72%,56%)]" />
          </div>
          <h1 className="text-2xl font-heading font-semibold">Your AI Skin Analysis</h1>
          <p className="text-muted-foreground text-sm">
            Get a personalized skin assessment and treatment recommendations in 60 seconds
          </p>
        </motion.div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Take a selfie in natural lighting, no makeup, facing directly forward for the most accurate analysis.
              </p>
            </div>

            {latestAnalysis && (
              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Last analyzed: {format(new Date(latestAnalysis.created_at), 'MMM d, yyyy')}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={() => handleViewPast(latestAnalysis)}>
                    View Last Results
                  </Button>
                </div>
              </div>
            )}

            {canAnalyze ? (
              <Button
                className="w-full gap-2 bg-[hsl(25,30%,28%)] hover:bg-[hsl(25,30%,22%)] text-white"
                size="lg"
                onClick={() => {
                  setImagePreview(null);
                  setAnalysis(null);
                  setComparingTo(null);
                  setStep('capture');
                }}
              >
                <Camera className="h-5 w-5" />
                Start My Analysis
              </Button>
            ) : (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Next analysis available in {daysUntilNext} day{daysUntilNext !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past analyses list */}
        {pastAnalyses && pastAnalyses.length > 1 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-heading font-semibold text-sm mb-3">Past Analyses</h3>
              <div className="space-y-2">
                {pastAnalyses.map((a) => (
                  <button
                    key={a.id}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                    onClick={() => handleViewPast(a)}
                  >
                    <div>
                      <p className="text-sm font-medium">{format(new Date(a.created_at), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-muted-foreground">Score: {a.skin_score}/100</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // STEP 2: CAPTURE
  if (step === 'capture') {
    return (
      <div className="space-y-5 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('intro')}>← Back</Button>
          <h2 className="font-heading font-semibold">Take Your Photo</h2>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            {!imagePreview ? (
              <div className="space-y-3">
                <div
                  className="relative border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
                  style={{ aspectRatio: '3/4' }}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Tap to take a selfie</p>
                  </div>
                  <FaceGuideOverlay />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
                  <img src={imagePreview} alt="Your photo" className="w-full h-full object-cover" />
                  <FaceGuideOverlay />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => setImagePreview(null)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retake
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-[hsl(25,30%,28%)] hover:bg-[hsl(25,30%,22%)] text-white"
                    onClick={handleAnalyze}
                  >
                    <Sparkles className="h-4 w-4" />
                    Confirm Photo
                  </Button>
                </div>
              </div>
            )}

            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handleFileChange} className="hidden" />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 3: LOADING
  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-full bg-[hsl(35,72%,56%)]/10 flex items-center justify-center"
        >
          <Sparkles className="h-10 w-10 text-[hsl(35,72%,56%)]" />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-heading font-semibold">Analyzing your skin...</h2>
          <p className="text-sm text-muted-foreground">This takes about 15 seconds</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // STEP 5: RESULTS
  if (step === 'results' && analysis) {
    const previousAnalysis = pastAnalyses && pastAnalyses.length > 1
      ? (comparingTo || pastAnalyses[1])
      : null;

    return (
      <div className="space-y-5 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setStep('intro'); setComparingTo(null); }}>← Back</Button>
          <h2 className="font-heading font-semibold">Your Results</h2>
        </div>

        {/* Score */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-[hsl(35,72%,56%)]/20">
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <p className="text-sm font-medium text-muted-foreground">Your Skin Score</p>
              <div className="flex items-center gap-6">
                <SkinScoreRing score={analysis.skin_score} />
                {comparingTo && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      vs {format(new Date(comparingTo.created_at), 'MMM d')}
                    </p>
                    <SkinScoreRing score={comparingTo.skin_score} size={90} />
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {analysis.skin_score > comparingTo.skin_score ? '↑' : analysis.skin_score < comparingTo.skin_score ? '↓' : '='}{' '}
                      {Math.abs(analysis.skin_score - comparingTo.skin_score)} pts
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground italic text-center leading-relaxed font-serif">
                {analysis.overall_summary}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Compare button */}
        {pastAnalyses && pastAnalyses.length > 1 && !comparingTo && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setComparingTo(pastAnalyses[1])}
          >
            <RefreshCw className="h-4 w-4" />
            Compare to {format(new Date(pastAnalyses[1].created_at), 'MMM d, yyyy')}
          </Button>
        )}

        {/* Concerns */}
        {analysis.concerns?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-heading font-semibold text-sm">Skin Concerns</h3>
                {analysis.concerns.map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="p-3 bg-secondary/30 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{c.name}</h4>
                      <Badge variant="outline" className={cn("text-[10px] border", severityColor(c.severity))}>
                        {c.severity}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{c.area}</Badge>
                      {comparingTo && (
                        <Badge variant="outline" className={cn("text-[10px]", {
                          'text-emerald-600': compareChange(c, comparingTo) === 'improved',
                          'text-amber-600': compareChange(c, comparingTo) === 'same',
                          'text-red-600': compareChange(c, comparingTo) === 'worsened',
                          'text-blue-600': compareChange(c, comparingTo) === 'new',
                        })}>
                          {compareChange(c, comparingTo)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recommendations */}
        {analysis.recommendations?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-heading font-semibold text-sm">Recommended Treatments</h3>
                {analysis.recommendations.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="p-3 bg-secondary/30 rounded-lg space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{r.service_name}</h4>
                      <Badge variant="outline" className={cn("text-[10px]",
                        r.priority === 'high' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}>
                        {r.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                    <Button
                      size="sm"
                      className="w-full gap-2 bg-[hsl(25,30%,28%)] hover:bg-[hsl(25,30%,22%)] text-white"
                      asChild
                    >
                      <Link to="/portal/book">
                        Book {r.service_name}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Next Steps */}
        {analysis.next_steps && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <p className="text-sm text-muted-foreground italic text-center px-4 font-serif">
              {analysis.next_steps}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {latestAnalysis && !latestAnalysis.shared_with_provider && (
            <Button variant="outline" className="flex-1 gap-2" onClick={handleShareWithProvider}>
              <Share2 className="h-4 w-4" />
              Share with Provider
            </Button>
          )}
          {latestAnalysis?.shared_with_provider && (
            <div className="flex-1 text-center text-xs text-muted-foreground py-2">
              ✓ Shared with your provider
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
