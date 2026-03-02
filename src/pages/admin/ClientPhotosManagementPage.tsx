import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Pencil, 
  Eye, 
  EyeOff,
  Search,
  User,
  Calendar,
  X,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PhotoAnnotationCanvas } from '@/components/photos/PhotoAnnotationCanvas';
import { SignedImage } from '@/components/photos/SignedImage';

interface Photo {
  id: string;
  client_id: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  notes: string | null;
  taken_date: string;
  is_visible_to_client: boolean;
  service_id: string | null;
  appointment_id: string | null;
  services?: { name: string } | null;
  clients?: { first_name: string; last_name: string } | null;
}

export function ClientPhotosManagementPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isAnnotateDialogOpen, setIsAnnotateDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [annotatingPhotoType, setAnnotatingPhotoType] = useState<'before' | 'after'>('before');

  // Form state
  const [uploadForm, setUploadForm] = useState({
    clientId: '',
    serviceId: '',
    notes: '',
    isVisibleToClient: true,
    beforePhoto: null as File | null,
    afterPhoto: null as File | null,
  });

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('last_name');
      return data || [];
    },
  });

  // Fetch services
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  // Fetch photos
  const { data: photos, isLoading } = useQuery({
    queryKey: ['admin-photos', selectedClientId],
    queryFn: async () => {
      let query = supabase
        .from('before_after_photos')
        .select('*, services(name), clients(first_name, last_name)')
        .order('taken_date', { ascending: false });

      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }

      const { data } = await query;
      return (data || []) as Photo[];
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadForm.clientId) {
        throw new Error('Please select a client');
      }

      let beforePhotoUrl = null;
      let afterPhotoUrl = null;

      // Upload before photo - store file path, not full URL (bucket is private)
      if (uploadForm.beforePhoto) {
        const fileExt = uploadForm.beforePhoto.name.split('.').pop();
        const fileName = `${uploadForm.clientId}/before-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('treatment-photos')
          .upload(fileName, uploadForm.beforePhoto);

        if (uploadError) throw uploadError;

        // Store the file path for signed URL generation later
        beforePhotoUrl = `treatment-photos/${fileName}`;
      }

      // Upload after photo - store file path, not full URL (bucket is private)
      if (uploadForm.afterPhoto) {
        const fileExt = uploadForm.afterPhoto.name.split('.').pop();
        const fileName = `${uploadForm.clientId}/after-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('treatment-photos')
          .upload(fileName, uploadForm.afterPhoto);

        if (uploadError) throw uploadError;

        // Store the file path for signed URL generation later
        afterPhotoUrl = `treatment-photos/${fileName}`;
      }

      // Create database record
      const { error } = await supabase.from('before_after_photos').insert({
        client_id: uploadForm.clientId,
        service_id: uploadForm.serviceId || null,
        before_photo_url: beforePhotoUrl,
        after_photo_url: afterPhotoUrl,
        notes: uploadForm.notes || null,
        is_visible_to_client: uploadForm.isVisibleToClient,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Photos uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-photos'] });
      
      // Notify client if photos are visible to them
      if (uploadForm.isVisibleToClient && uploadForm.clientId) {
        await notifyClientOfNewPhotos(uploadForm.clientId);
      }
      
      setIsUploadDialogOpen(false);
      setUploadForm({
        clientId: '',
        serviceId: '',
        notes: '',
        isVisibleToClient: true,
        beforePhoto: null,
        afterPhoto: null,
      });
    },
    onError: (error) => {
      toast.error(`Failed to upload: ${error.message}`);
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible, clientId }: { id: string; isVisible: boolean; clientId: string }) => {
      const { error } = await supabase
        .from('before_after_photos')
        .update({ is_visible_to_client: isVisible })
        .eq('id', id);
      if (error) throw error;
      return { isVisible, clientId };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-photos'] });
      toast.success('Visibility updated');
      if (result.isVisible) {
        await notifyClientOfNewPhotos(result.clientId);
      }
    },
  });

  // Notify client when new photos are shared with them
  const notifyClientOfNewPhotos = async (clientId: string) => {
    try {
      // Find the client's email
      const { data: clientData } = await supabase
        .from('clients')
        .select('email, first_name')
        .eq('id', clientId)
        .single();

      if (clientData?.email) {
        // Log the notification
        await supabase.from('notification_logs').insert({
          client_id: clientId,
          type: 'email',
          category: 'photo_shared',
          recipient: clientData.email,
          subject: 'New Progress Photos Available',
          body: `Hi ${clientData.first_name}, new progress photos from your recent treatment have been shared with you. Log in to your client portal to view them.`,
          status: 'pending',
        });

        // Send via edge function
        await supabase.functions.invoke('send-notification', {
          body: {
            to: clientData.email,
            subject: 'New Progress Photos Available ✨',
            body: `Hi ${clientData.first_name},\n\nNew progress photos from your recent treatment have been shared with you.\n\nLog in to your client portal to view your before & after results.\n\nBest regards,\nElita Medical Spa`,
            type: 'email',
          },
        });
      }
    } catch (err) {
      console.error('Failed to send photo notification:', err);
      // Don't block the main flow for notification failures
    }
  };

  // Save annotated photo
  const saveAnnotatedPhoto = async (dataUrl: string) => {
    if (!selectedPhoto) return;

    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Upload annotated image
      const fileName = `${selectedPhoto.client_id}/annotated-${annotatingPhotoType}-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('treatment-photos')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Store the file path for signed URL generation later (bucket is private)
      const storedPath = `treatment-photos/${fileName}`;

      // Update database record
      const updateField = annotatingPhotoType === 'before' 
        ? { before_photo_url: storedPath }
        : { after_photo_url: storedPath };

      const { error } = await supabase
        .from('before_after_photos')
        .update(updateField)
        .eq('id', selectedPhoto.id);

      if (error) throw error;

      toast.success('Annotated photo saved to client chart');
      queryClient.invalidateQueries({ queryKey: ['admin-photos'] });
      setIsAnnotateDialogOpen(false);
      setSelectedPhoto(null);
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    }
  };

  const openAnnotateDialog = (photo: Photo, type: 'before' | 'after') => {
    setSelectedPhoto(photo);
    setAnnotatingPhotoType(type);
    setIsAnnotateDialogOpen(true);
  };

  const filteredPhotos = photos?.filter((photo) => {
    if (!searchQuery) return true;
    const clientName = `${photo.clients?.first_name} ${photo.clients?.last_name}`.toLowerCase();
    return clientName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="font-heading text-3xl text-foreground mb-1">Treatment Photos</h1>
          <p className="text-muted-foreground">Manage and annotate client before/after photos</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Photos
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Treatment Photos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select
                  value={uploadForm.clientId}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={uploadForm.serviceId}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, serviceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Before Photo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadForm({ 
                      ...uploadForm, 
                      beforePhoto: e.target.files?.[0] || null 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>After Photo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadForm({ 
                      ...uploadForm, 
                      afterPhoto: e.target.files?.[0] || null 
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder="Treatment notes..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={uploadForm.isVisibleToClient}
                  onCheckedChange={(checked) => setUploadForm({ 
                    ...uploadForm, 
                    isVisibleToClient: checked 
                  })}
                />
                <Label>Visible to client in portal</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsUploadDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => uploadMutation.mutate()}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name..."
            className="pl-12"
          />
        </div>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filter by client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Clients</SelectItem>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.first_name} {client.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Photos Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
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
        ) : filteredPhotos?.length === 0 ? (
          <Card className="card-luxury">
            <CardContent className="py-12 text-center">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Photos Yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload treatment photos to start documenting client progress
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Upload First Photo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPhotos?.map((photo) => (
              <Card key={photo.id} className="card-luxury overflow-hidden">
                <CardContent className="p-0">
                  {/* Photo Grid */}
                  <div className="grid grid-cols-2">
                    <div className="relative aspect-[3/4] bg-muted group">
                      {photo.before_photo_url ? (
                        <>
                          <SignedImage
                            src={photo.before_photo_url}
                            alt="Before treatment"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => openAnnotateDialog(photo, 'before')}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <div className="bg-background/90 rounded-full p-2">
                              <Pencil className="w-5 h-5 text-foreground" />
                            </div>
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Badge className="absolute top-2 left-2 bg-background/80 text-foreground">
                        Before
                      </Badge>
                    </div>
                    <div className="relative aspect-[3/4] bg-muted group">
                      {photo.after_photo_url ? (
                        <>
                          <SignedImage
                            src={photo.after_photo_url}
                            alt="After treatment"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => openAnnotateDialog(photo, 'after')}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <div className="bg-background/90 rounded-full p-2">
                              <Pencil className="w-5 h-5 text-foreground" />
                            </div>
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                        After
                      </Badge>
                    </div>
                  </div>

                  {/* Photo Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {photo.clients?.first_name} {photo.clients?.last_name}
                      </span>
                    </div>
                    {photo.services?.name && (
                      <Badge variant="secondary" className="mb-2">
                        {photo.services.name}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(photo.taken_date), 'MMM d, yyyy')}</span>
                    </div>
                    {photo.notes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {photo.notes}
                      </p>
                    )}

                    {/* Visibility Toggle */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-sm">
                        {photo.is_visible_to_client ? (
                          <>
                            <Eye className="w-4 h-4 text-success" />
                            <span className="text-success">Visible to client</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Hidden</span>
                          </>
                        )}
                      </div>
                      <Switch
                        checked={photo.is_visible_to_client}
                        onCheckedChange={(checked) => 
                          toggleVisibilityMutation.mutate({ id: photo.id, isVisible: checked, clientId: photo.client_id })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Annotation Dialog */}
      <Dialog open={isAnnotateDialogOpen} onOpenChange={setIsAnnotateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Annotate {annotatingPhotoType === 'before' ? 'Before' : 'After'} Photo
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedPhoto && (
              <PhotoAnnotationCanvas
                imageUrl={
                  annotatingPhotoType === 'before'
                    ? selectedPhoto.before_photo_url || ''
                    : selectedPhoto.after_photo_url || ''
                }
                onSave={saveAnnotatedPhoto}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
