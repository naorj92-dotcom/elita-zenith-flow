import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Image, Calendar } from 'lucide-react';

export function ClientPhotosPage() {
  const { client } = useClientAuth();

  const { data: photos, isLoading } = useQuery({
    queryKey: ['client-photos', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('before_after_photos')
        .select('*, services(*)')
        .eq('client_id', client.id)
        .eq('is_visible_to_client', true)
        .order('taken_date', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Progress Photos</h1>
        <p className="text-muted-foreground mt-1">Your before and after treatment photos</p>
      </div>

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
            <Card key={photo.id} className="card-luxury overflow-hidden">
              <CardContent className="p-0">
                {/* Photo Grid */}
                <div className="grid grid-cols-2">
                  <div className="relative aspect-[3/4] bg-muted">
                    {photo.before_photo_url ? (
                      <img
                        src={photo.before_photo_url}
                        alt="Before treatment"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-background/80 text-foreground">
                      Before
                    </Badge>
                  </div>
                  <div className="relative aspect-[3/4] bg-muted">
                    {photo.after_photo_url ? (
                      <img
                        src={photo.after_photo_url}
                        alt="After treatment"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                      After
                    </Badge>
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
    </div>
  );
}
