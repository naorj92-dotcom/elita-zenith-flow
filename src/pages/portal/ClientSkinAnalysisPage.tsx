import React, { useState, useRef } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, Sparkles, Loader2, CheckCircle2, Sun, User, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

type AnalysisArea = 'face' | 'body';

interface SkinAnalysis {
  analysis_area: string;
  skin_type: string;
  concerns: string[];
  score: number;
  recommendations: { treatment: string; reason: string; priority: string; price?: number }[];
  daily_tips: string[];
  summary: string;
}

export function ClientSkinAnalysisPage() {
  const { client } = useClientAuth();
  const [analysisArea, setAnalysisArea] = useState<AnalysisArea>('face');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [concerns, setConcerns] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('skin-analysis', {
        body: {
          imageBase64: imagePreview,
          clientName: client?.first_name,
          concerns,
          analysisArea,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setAnalysis(data.analysis);
    } catch {
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-info/10 text-info border-info/20';
    }
  };

  const areaConfig = {
    face: {
      icon: '🧑',
      label: 'Face',
      description: 'Analyze facial skin for wrinkles, acne, pigmentation, and more',
      uploadHint: 'Take a clear, well-lit photo of your face',
      capture: 'user' as const,
    },
    body: {
      icon: '🦵',
      label: 'Body',
      description: 'Analyze body skin for cellulite, stretch marks, texture, and more',
      uploadHint: 'Take a clear photo of the area you want analyzed',
      capture: 'environment' as const,
    },
  };

  const config = areaConfig[analysisArea];

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-semibold">AI Skin Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a photo to get personalized treatment recommendations from our menu
        </p>
      </div>

      {/* Area Selector */}
      <div className="grid grid-cols-2 gap-3">
        {(['face', 'body'] as AnalysisArea[]).map((area) => {
          const ac = areaConfig[area];
          const isActive = analysisArea === area;
          return (
            <button
              key={area}
              onClick={() => { setAnalysisArea(area); setAnalysis(null); }}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30 bg-card"
              )}
            >
              <span className="text-2xl">{ac.icon}</span>
              <h3 className={cn("font-semibold mt-1.5", isActive ? "text-primary" : "text-foreground")}>{ac.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{ac.description}</p>
              {isActive && (
                <motion.div
                  layoutId="area-indicator"
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Upload Section */}
      <Card>
        <CardContent className="p-5">
          <div className="space-y-4">
            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">Upload {config.label} Photo</h3>
                <p className="text-xs text-muted-foreground">{config.uploadHint}</p>
                <Button className="mt-3" variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Photo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative max-w-sm mx-auto">
                  <img
                    src={imagePreview}
                    alt="Your photo"
                    className="rounded-xl w-full object-cover max-h-72"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-card/90 text-foreground border border-border text-xs">
                      {config.icon} {config.label}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 h-7 text-xs bg-card/90"
                    onClick={() => { setImagePreview(null); setAnalysis(null); }}
                  >
                    Change
                  </Button>
                </div>

                <Textarea
                  placeholder={analysisArea === 'face'
                    ? "Any concerns? (e.g., acne, fine lines, uneven skin tone...)"
                    : "Any concerns? (e.g., cellulite, stretch marks, scarring, skin texture...)"
                  }
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  className="resize-none text-sm"
                  rows={2}
                />

                <Button
                  className="w-full gap-2"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing your {config.label.toLowerCase()}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyze My {config.label}
                    </>
                  )}
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture={config.capture}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary Card */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="font-heading font-semibold text-base">
                        {analysisArea === 'face' ? 'Facial' : 'Body'} Skin Profile
                      </h3>
                      {analysis.skin_type && (
                        <Badge variant="outline" className="capitalize text-xs">{analysis.skin_type}</Badge>
                      )}
                      {analysis.score > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs">{analysis.score}/100</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                  </div>
                </div>

                {analysis.concerns && analysis.concerns.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {analysis.concerns.map((concern, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {concern}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommended Treatments from our menu */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-heading flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Recommended Services
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Based on your analysis — from our service menu</p>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {analysis.recommendations.map((rec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-sm font-bold text-primary">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{rec.treatment}</h4>
                          <Badge variant="outline" className={cn("text-[10px]", getPriorityColor(rec.priority))}>
                            {rec.priority}
                          </Badge>
                          {rec.price && (
                            <span className="text-xs font-medium text-primary">${rec.price}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                      </div>
                    </motion.div>
                  ))}
                  <Button className="w-full mt-2 gap-2" asChild>
                    <Link to="/portal/book">
                      Book a Treatment
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Daily Tips */}
            {analysis.daily_tips && analysis.daily_tips.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-heading flex items-center gap-2">
                    <Sun className="h-4 w-4 text-primary" />
                    Daily Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {analysis.daily_tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-muted-foreground">{tip}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Analyze another area */}
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setImagePreview(null); setAnalysis(null); setConcerns(''); }}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Analyze Another Area
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
