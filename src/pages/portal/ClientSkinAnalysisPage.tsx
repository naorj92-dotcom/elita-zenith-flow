import React, { useState, useRef } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, Sparkles, Loader2, AlertCircle, CheckCircle2, Sun, Droplets, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SkinAnalysis {
  skin_type: string;
  concerns: string[];
  score: number;
  recommendations: { treatment: string; reason: string; priority: string }[];
  daily_tips: string[];
  summary: string;
}

export function ClientSkinAnalysisPage() {
  const { client } = useClientAuth();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">AI Skin Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Upload a selfie to get personalized treatment recommendations
        </p>
      </div>

      {/* Upload Section */}
      <Card className="card-luxury">
        <CardContent className="p-6">
          <div className="space-y-4">
            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">Upload a Selfie</h3>
                <p className="text-sm text-muted-foreground">
                  Take a clear, well-lit photo of your face for the best analysis
                </p>
                <Button className="mt-4" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Photo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative max-w-sm mx-auto">
                  <img
                    src={imagePreview}
                    alt="Your selfie"
                    className="rounded-xl w-full object-cover max-h-80"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => { setImagePreview(null); setAnalysis(null); }}
                  >
                    Change
                  </Button>
                </div>

                <Textarea
                  placeholder="Any specific concerns? (e.g., acne, fine lines, uneven skin tone...)"
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  className="resize-none"
                  rows={2}
                />

                <Button
                  className="w-full"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing your skin...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze My Skin
                    </>
                  )}
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="card-luxury border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-heading font-semibold text-lg">Your Skin Profile</h3>
                    {analysis.skin_type && (
                      <Badge variant="outline" className="capitalize">{analysis.skin_type}</Badge>
                    )}
                    {analysis.score && (
                      <Badge className="bg-primary text-primary-foreground">{analysis.score}/100</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                </div>
              </div>

              {analysis.concerns && analysis.concerns.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {analysis.concerns.map((concern, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {concern}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommended Treatments */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <Card className="card-luxury">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Recommended Treatments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{rec.treatment}</h4>
                        <Badge variant="outline" className={`text-[10px] ${getPriorityColor(rec.priority)}`}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{rec.reason}</p>
                    </div>
                  </div>
                ))}
                <Button className="w-full mt-2" asChild>
                  <a href="/portal/book">Book a Consultation</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Daily Tips */}
          {analysis.daily_tips && analysis.daily_tips.length > 0 && (
            <Card className="card-luxury">
              <CardHeader>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Sun className="h-5 w-5 text-primary" />
                  Daily Skincare Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.daily_tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
