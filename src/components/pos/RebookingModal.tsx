import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarClock, ArrowRight, Bell, X } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface RebookService {
  serviceId: string;
  serviceName: string;
  rebookingIntervalDays: number;
}

interface RebookingModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientFirstName: string;
  staffId: string;
  services: RebookService[];
}

export function RebookingModal({ open, onClose, clientId, clientFirstName, staffId, services }: RebookingModalProps) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  if (services.length === 0) return null;

  const handleBookNow = (service: RebookService) => {
    const suggestedDate = addDays(new Date(), service.rebookingIntervalDays);
    // Navigate to schedule with pre-filled params
    const params = new URLSearchParams({
      client: clientId,
      service: service.serviceId,
      staff: staffId,
      date: format(suggestedDate, 'yyyy-MM-dd'),
    });
    onClose();
    navigate(`/schedule?${params.toString()}`);
  };

  const handleRemindMe = async (service: RebookService) => {
    setSaving(true);
    const suggestedDate = addDays(new Date(), service.rebookingIntervalDays);
    const remindAt = addDays(suggestedDate, -7); // Remind 7 days before

    const { error } = await supabase.from('rebook_reminders').insert({
      client_id: clientId,
      service_id: service.serviceId,
      staff_id: staffId,
      suggested_date: format(suggestedDate, 'yyyy-MM-dd'),
      remind_at: format(remindAt, 'yyyy-MM-dd'),
    });

    setSaving(false);
    if (error) {
      toast.error('Failed to set reminder');
    } else {
      toast.success(`Reminder set for ${format(remindAt, 'MMM d, yyyy')}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <CalendarClock className="h-5 w-5 text-primary" />
            Book {clientFirstName}'s next visit?
          </DialogTitle>
          <DialogDescription>
            Based on recommended treatment intervals
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {services.map((service) => {
            const suggestedDate = addDays(new Date(), service.rebookingIntervalDays);
            return (
              <Card key={service.serviceId} className="card-luxury">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{service.serviceName}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Ideal next visit: <span className="font-medium text-foreground">{format(suggestedDate, 'EEEE, MMM d, yyyy')}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => handleBookNow(service)}>
                      Book Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => handleRemindMe(service)}
                      disabled={saving}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      Remind Me
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
            Skip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
