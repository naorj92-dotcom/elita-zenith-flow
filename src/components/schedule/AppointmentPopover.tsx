import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, X, CheckCircle, XCircle, Undo2, UserRoundPen, Search, Loader2, Sparkles, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
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

const recommendationMap: Record<string, string> = {
  'Hydrafacial': 'Chemical Peel',
  'Chemical Peel': 'Microneedling',
  'Microneedling': 'PRP Facial',
  'PRP Facial': 'Skin Tightening',
  'Botox': 'Dermal Fillers',
  'Dermal Fillers': 'Skin Tightening',
  'Laser Hair Removal': 'Skin Rejuvenation',
};

export function AppointmentPopover({ appointment, clientDetails, onClose, onStatusChange, onClientChanged }: AppointmentPopoverProps) {
  const start = new Date(appointment.scheduled_at);
  const end = new Date(start.getTime() + appointment.duration_minutes * 60000);
  const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  const age = calculateAge(clientDetails?.date_of_birth);

  const [showClientSearch, setShowClientSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const isGoogleEvent = appointment.id.startsWith('gcal-');

  // Fetch client's active packages for session tracking
  const { data: clientPackage } = useQuery({
    queryKey: ['apt-client-package', appointment.client_id],
    queryFn: async () => {
      if (!appointment.client_id) return null;
      const { data } = await supabase
        .from('client_packages')
        .select('sessions_used, sessions_total, packages(name)')
        .eq('client_id', appointment.client_id)
        .eq('status', 'active')
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!appointment.client_id && !isGoogleEvent,
  });

  // Get suggested next treatment
  const suggestedNext = recommendationMap[appointment.service_name] || null;

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

  return (
    <div data-appointment-popover className="w-80 bg-popover border border-border rounded-xl shadow-xl p-4 z-50" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <Link to={`/clients/${appointment.client_id}`} className="text-base font-bold text-foreground hover:text-primary transition-colors">
            {appointment.client_name}
          </Link>
          {clientDetails?.phone && (
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              {clientDetails.phone}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Compact stats */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
        <span>{clientDetails?.visit_count ?? 0} visits</span>
        <span>·</span>
        <span>${((clientDetails?.total_spent || 0) / Math.max(clientDetails?.visit_count || 1, 1)).toFixed(0)} avg</span>
        {age !== null && <><span>·</span><span>Age {age}</span></>}
      </div>

      <Separator className="my-2" />

      {/* Appointment */}
      <div className="mb-2">
        <p className="font-semibold text-foreground text-sm">{appointment.service_name}</p>
        <p className="text-xs text-muted-foreground">{timeStr} · {appointment.staff_name}</p>
        <p className="text-sm font-semibold text-foreground mt-1">${Number(appointment.total_amount).toFixed(2)}</p>
      </div>

      {/* Session progress (inline) */}
      {clientPackage && (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 mb-2">
          <Package className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-foreground truncate">{(clientPackage as any).packages?.name || 'Package'}</p>
          </div>
          <span className="text-xs font-semibold text-primary whitespace-nowrap">
            {(clientPackage as any).sessions_used}/{(clientPackage as any).sessions_total}
          </span>
        </div>
      )}

      {/* Suggested next treatment */}
      {suggestedNext && !isGoogleEvent && (
        <div className="flex items-center gap-2 bg-accent/40 rounded-lg px-3 py-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-[11px] text-foreground">
            <span className="text-muted-foreground">Suggested next:</span>{' '}
            <span className="font-medium">{suggestedNext}</span>
          </p>
        </div>
      )}

      {/* Status badge */}
      <Badge variant="outline" className="text-[10px] capitalize mb-2">
        {appointment.status.replace('_', ' ')}
      </Badge>

      {/* Change Client */}
      {!isGoogleEvent && (
        <>
          <Separator className="my-2" />
          {!showClientSearch ? (
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-7" onClick={() => setShowClientSearch(true)}>
              <UserRoundPen className="w-3.5 h-3.5" /> Change Client
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search client..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-7 text-xs pl-8" autoFocus />
              </div>
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {isSearching && <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}
                {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No clients found</p>}
                {searchResults.map((c) => (
                  <button key={c.id} disabled={isChanging || c.id === appointment.client_id} onClick={() => handleChangeClient(c)}
                    className={cn('w-full flex items-center justify-between p-1.5 rounded-md text-xs', c.id === appointment.client_id ? 'bg-primary/10 text-primary' : 'hover:bg-muted cursor-pointer')}>
                    <span className="font-medium">{c.first_name} {c.last_name}</span>
                    {c.id === appointment.client_id && <Badge variant="outline" className="text-[9px] h-4">Current</Badge>}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full text-xs h-6" onClick={() => { setShowClientSearch(false); setSearchQuery(''); setSearchResults([]); }}>Cancel</Button>
            </div>
          )}
        </>
      )}

      <Separator className="my-2" />

      {/* Quick Actions */}
      {!isGoogleEvent && (
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Quick Actions</p>
          <div className="grid grid-cols-3 gap-1.5">
            <Link to={`/clients/${appointment.client_id}?tab=forms`}>
              <Button variant="outline" size="sm" className="w-full h-8 text-[10px] gap-1 px-1.5">📝 Notes</Button>
            </Link>
            <Link to={`/clients/${appointment.client_id}?tab=products`}>
              <Button variant="outline" size="sm" className="w-full h-8 text-[10px] gap-1 px-1.5">💡 Recommend</Button>
            </Link>
            <Link to={`/schedule/new?client=${appointment.client_id}`}>
              <Button variant="outline" size="sm" className="w-full h-8 text-[10px] gap-1 px-1.5">🔄 Rebook</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Status Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Undo"><Undo2 className="w-3.5 h-3.5" /></Button>
          {!isGoogleEvent && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Cancel" onClick={() => onStatusChange?.(appointment.id, 'cancelled')}>
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="flex gap-1.5">
          {!isGoogleEvent && (
            <Link to={`/schedule/${appointment.id}`}>
              <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
            </Link>
          )}
          {appointment.status === 'scheduled' && !isGoogleEvent && (
            <Button size="sm" className="h-7 text-xs" onClick={() => onStatusChange?.(appointment.id, 'confirmed')}>
              <CheckCircle className="w-3 h-3 mr-1" /> Confirm
            </Button>
          )}
          {(appointment.status === 'confirmed' || appointment.status === 'scheduled') && !isGoogleEvent && (
            <Button size="sm" className="h-7 text-xs" onClick={() => onStatusChange?.(appointment.id, 'checked_in')}>
              Check In
            </Button>
          )}
          {appointment.status === 'checked_in' && !isGoogleEvent && (
            <Button size="sm" className="h-7 text-xs bg-success hover:bg-success/90 text-success-foreground" onClick={() => onStatusChange?.(appointment.id, 'in_progress')}>
              Start
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
