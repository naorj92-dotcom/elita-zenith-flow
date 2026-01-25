import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Image, Calendar, Eye, ZoomIn, ArrowLeftRight } from 'lucide-react';
import { DEMO_PHOTOS } from '@/hooks/useDemoData';
import { SignedImage } from '@/components/photos/SignedImage';

export function ClientPhotosPage() {
  const { client, isDemo } = useClientAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ['client-photos', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) {
        return DEMO_PHOTOS;
      }
      if (!client?.id) return [];
      const { data } = await supabase
        .from('before_after_photos')
        .select('*, services(*)')
        .eq('client_id', client.id)
        .eq('is_visible_to_client', true)
        .order('taken_date', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id || isDemo,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Progress Photos</h1>
        <p className="text-muted-foreground mt-1">Your before and after treatment photos</p>
      </div>

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <Eye className="h-5 w-5 text-primary" />
          <p className="text-sm">Viewing demo progress photos</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="card-luxury">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-48 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : photos?.length === 0 ? (
        <Card className="card-luxury">
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Photos Yet</h3>
            <p className="text-muted-foreground">
              Progress photos will appear here after your treatments
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {photos?.map((photo) => (
            <Card 
              key={photo.id} 
              className="card-luxury overflow-hidden group cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <CardContent className="p-0">
                {/* Photo Grid - Side by Side */}
                <div className="grid grid-cols-2 relative">
                  {/* Before */}
                  <div className="relative aspect-[3/4] bg-muted">
                    {photo.before_photo_url ? (
                      <SignedImage
                        src={photo.before_photo_url}
                        alt="Before treatment"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-background/80 text-foreground backdrop-blur-sm">
                      Before
                    </Badge>
                  </div>

                  {/* Center divider with arrow */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="h-10 w-10 rounded-full bg-background shadow-lg flex items-center justify-center border">
                      <ArrowLeftRight className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  {/* After */}
                  <div className="relative aspect-[3/4] bg-muted">
                    {photo.after_photo_url ? (
                      <SignedImage
                        src={photo.after_photo_url}
                        alt="After treatment"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                      After
                    </Badge>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-background rounded-full p-3 shadow-lg">
                      <ZoomIn className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>
                
                {/* Photo Info */}
                <div className="p-4">
                  <h3 className="font-semibold">{photo.services?.name || 'Treatment'}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(photo.taken_date), 'MMMM d, yyyy')}</span>
                  </div>
                  {photo.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{photo.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full-screen comparison dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedPhoto?.services?.name || 'Progress Photo'}</span>
              {selectedPhoto?.taken_date && (
                <span className="text-sm font-normal text-muted-foreground">
                  {format(new Date(selectedPhoto.taken_date), 'MMMM d, yyyy')}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center py-1">Before</Badge>
              <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                {selectedPhoto?.before_photo_url ? (
                  <SignedImage
                    src={selectedPhoto.before_photo_url}
                    alt="Before treatment"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* After */}
            <div className="space-y-2">
              <Badge className="w-full justify-center py-1">After</Badge>
              <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                {selectedPhoto?.after_photo_url ? (
                  <SignedImage
                    src={selectedPhoto.after_photo_url}
                    alt="After treatment"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedPhoto?.notes && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {selectedPhoto.notes}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
