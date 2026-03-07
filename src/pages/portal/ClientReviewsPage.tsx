import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Star, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ClientReviewsPage() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState('');

  // Fetch completed appointments without reviews
  const { data: completedAppointments = [] } = useQuery({
    queryKey: ['reviewable-appointments', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await supabase
        .from('appointments')
        .select('id, scheduled_at, services(name), staff(first_name, last_name)')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!client?.id,
  });

  // Fetch my reviews
  const { data: myReviews = [] } = useQuery({
    queryKey: ['my-reviews', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data } = await (supabase as any)
        .from('client_reviews')
        .select('*, services(name)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!client?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!client?.id) throw new Error('Not authenticated');
      const apt = completedAppointments.find((a: any) => a.id === selectedAppointment);
      const { error } = await (supabase as any)
        .from('client_reviews')
        .insert({
          client_id: client.id,
          appointment_id: selectedAppointment || null,
          service_id: (apt as any)?.services?.id || null,
          rating,
          review_text: reviewText.trim() || null,
          is_public: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      toast.success('Thank you for your review! 💛');
      setRating(5);
      setReviewText('');
      setSelectedAppointment('');
    },
    onError: () => toast.error('Failed to submit review'),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
            <p className="text-sm text-muted-foreground">Share your experience and help us improve</p>
          </div>
        </div>
      </motion.div>

      {/* Submit Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Write a Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Star Rating */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Select Appointment */}
          {completedAppointments.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">For which visit? (optional)</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {completedAppointments.map((apt: any) => (
                  <button
                    key={apt.id}
                    onClick={() => setSelectedAppointment(apt.id === selectedAppointment ? '' : apt.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedAppointment === apt.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <p className="text-sm font-medium">{apt.services?.name || 'Service'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(apt.scheduled_at), 'MMM d, yyyy')}
                      {apt.staff ? ` · ${apt.staff.first_name} ${apt.staff.last_name}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">Your Review</label>
            <Textarea
              placeholder="Tell us about your experience..."
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              rows={4}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Star className="w-4 h-4 mr-2" />
            )}
            Submit Review
          </Button>
        </CardContent>
      </Card>

      {/* My Reviews */}
      {myReviews.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">My Reviews</h2>
          <div className="space-y-3">
            {myReviews.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`}
                        />
                      ))}
                    </div>
                    {review.services?.name && (
                      <Badge variant="outline" className="text-xs">{review.services.name}</Badge>
                    )}
                    <Badge variant={review.is_approved ? 'default' : 'secondary'} className="text-xs ml-auto">
                      {review.is_approved ? 'Published' : 'Pending'}
                    </Badge>
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-muted-foreground">{review.review_text}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(review.created_at), 'MMM d, yyyy')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
