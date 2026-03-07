import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, X, CheckCircle, XCircle, Undo2, UserRoundPen, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ScheduleAppointment } from '@/pages/SchedulePage';

interface AppointmentPopoverProps {
  appointment: ScheduleAppointment;
  clientDetails?: {
    phone?: string | null;
    email?: string | null;
    visit_count?: number;
    total_spent?: number;
    date_of_birth?: string | null;
  } | null;
  onClose: () => void;
  onStatusChange?: (id: string, status: string) => void;
  onClientChanged?: () => void;
}

function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

export function AppointmentPopover({ appointment, clientDetails, onClose, onStatusChange, onClientChanged }: AppointmentPopoverProps) {
  const start = new Date(appointment.scheduled_at);
  const end = new Date(start.getTime() + appointment.duration_minutes * 60000);
  const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  const age = calculateAge(clientDetails?.date_of_birth);
  const avgVisit = clientDetails && clientDetails.visit_count && clientDetails.visit_count > 0
    ? (clientDetails.total_spent || 0) / clientDetails.visit_count
    : 0;

  const [showClientSearch, setShowClientSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    if (!showClientSearch || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(6);
      setSearchResults(data || []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showClientSearch]);

  const handleChangeClient = async (client: ClientOption) => {
    setIsChanging(true);
    const { error } = await supabase
      .from('appointments')
      .update({ client_id: client.id })
      .eq('id', appointment.id);
    
    if (error) {
      toast.error('Failed to change client');
    } else {
      toast.success(`Client changed to ${client.first_name} ${client.last_name}`);
      onClientChanged?.();
      onClose();
    }
    setIsChanging(false);
  };

  const isGoogleEvent = appointment.id.startsWith('gcal-');

  return (
    <div data-appointment-popover className="w-80 bg-popover border border-border rounded-xl shadow-xl p-4 z-50" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link to={`/clients/${appointment.client_id}`} className="text-base font-bold text-foreground hover:text-primary transition-colors">
            {appointment.client_name}
          </Link>
          {clientDetails?.phone && (
            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
              <Phone className="w-3 h-3" />
              {clientDetails.phone}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
        <div><span className="text-muted-foreground">Num Visits:</span> <span className="font-medium">{clientDetails?.visit_count ?? 0}</span></div>
        <div><span className="text-muted-foreground">Avg. Visit:</span> <span className="font-medium">${avgVisit.toFixed(0)}</span></div>
        {age !== null && <div><span className="text-muted-foreground">Age:</span> <span className="font-medium">{age}</span></div>}
      </div>

      <Separator className="my-2" />

      {/* Appointment details */}
      <p className="text-sm font-medium text-foreground mb-1">{dateStr}, {timeStr}</p>
      <div className="flex items-start gap-3 text-xs text-muted-foreground mb-1">
        <span>{start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}</span>
        <span className="flex-1 font-medium text-foreground">{appointment.service_name}</span>
        <span className="truncate max-w-[80px]">{appointment.staff_name}</span>
      </div>
      <p className="text-sm font-semibold mt-2">${Number(appointment.total_amount).toFixed(2)}</p>

      {/* Status badge */}
      <div className="mt-2">
        <Badge variant="outline" className="text-[10px] capitalize">
          {appointment.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Change Client Section */}
      {!isGoogleEvent && (
        <>
          <Separator className="my-3" />
          {!showClientSearch ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => setShowClientSearch(true)}
            >
              <UserRoundPen className="w-3.5 h-3.5" />
              Change Client
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search client name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8"
                  autoFocus
                />
              </div>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {isSearching && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No clients found</p>
                )}
                {searchResults.map((client) => (
                  <button
                    key={client.id}
                    disabled={isChanging || client.id === appointment.client_id}
                    onClick={() => handleChangeClient(client)}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded-md text-xs transition-colors',
                      client.id === appointment.client_id
                        ? 'bg-primary/10 text-primary cursor-default'
                        : 'hover:bg-muted cursor-pointer'
                    )}
                  >
                    <span className="font-medium">{client.first_name} {client.last_name}</span>
                    {client.phone && <span className="text-muted-foreground text-[10px]">{client.phone}</span>}
                    {client.id === appointment.client_id && <Badge variant="outline" className="text-[9px] h-4">Current</Badge>}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => { setShowClientSearch(false); setSearchQuery(''); setSearchResults([]); }}
              >
                Cancel
              </Button>
            </div>
          )}
        </>
      )}

      <Separator className="my-3" />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Undo">
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          {!isGoogleEvent && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Cancel"
              onClick={() => onStatusChange?.(appointment.id, 'cancelled')}
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {!isGoogleEvent && (
            <Link to={`/schedule/${appointment.id}`}>
              <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
            </Link>
          )}
          {appointment.status === 'scheduled' && !isGoogleEvent && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onStatusChange?.(appointment.id, 'confirmed')}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Mark as Confirmed
            </Button>
          )}
          {appointment.status === 'confirmed' && !isGoogleEvent && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onStatusChange?.(appointment.id, 'checked_in')}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Check In
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
