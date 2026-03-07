import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Camera, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { SignedImage } from '@/components/photos/SignedImage';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ProgressTimelineWidget() {
  const { client } = useClientAuth();

  const { data: photos } = useQuery({
    queryKey: ['client-progress-timeline', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('before_after_photos')
        .select('*, services(name)')
        .eq('client_id', client.id)
        .eq('is_visible_to_client', true)
        .order('taken_date', { ascending: true });
      return data || [];
    },
    enabled: !!client?.id,
  });

  if (!photos || photos.length === 0) return null;

  // Group by service for a transformation timeline
  const byService = photos.reduce((acc: Record<string, any[]>, photo) => {
    const serviceName = photo.services?.name || 'Treatment';
    if (!acc[serviceName]) acc[serviceName] = [];
    acc[serviceName].push(photo);
    return acc;
  }, {});

  return (
    <Card className="card-luxury overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Your Transformation
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal/photos" className="text-xs gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(byService).slice(0, 2).map(([serviceName, servicePhotos]) => (
          <div key={serviceName}>
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{serviceName}</span>
              <Badge variant="outline" className="text-[10px]">
                {servicePhotos.length} session{servicePhotos.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            {/* Horizontal scroll timeline */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {servicePhotos.map((photo: any, idx: number) => (
                <div key={photo.id} className="flex-shrink-0 w-24 space-y-1">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {photo.after_photo_url ? (
                      <SignedImage
                        src={photo.after_photo_url}
                        alt={`Session ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : photo.before_photo_url ? (
                      <SignedImage
                        src={photo.before_photo_url}
                        alt={`Session ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute bottom-1 left-1 text-[9px] px-1 py-0 bg-background/80 text-foreground backdrop-blur-sm">
                      #{idx + 1}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {format(new Date(photo.taken_date), 'MMM d')}
                  </p>
                </div>
              ))}
            </div>

            {servicePhotos.length >= 2 && (
              <Link to="/portal/photos">
                <div className="mt-2 text-xs text-primary flex items-center gap-1 cursor-pointer hover:underline">
                  <TrendingUp className="h-3 w-3" />
                  See your full transformation →
                </div>
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
