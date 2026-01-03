import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, Phone, Calendar, Check, X, Users } from 'lucide-react';
import { format } from 'date-fns';

export function WaitlistManagementPage() {
  const { staff } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('waiting');

  if (staff?.role !== 'admin' && staff?.role !== 'front_desk') {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: waitlistEntries, isLoading } = useQuery({
    queryKey: ['waitlist', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('waitlist')
        .select(`
          *,
          clients (id, first_name, last_name, phone, email),
          services (id, name, category),
          staff (id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'contacted') {
        updates.contacted_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('waitlist')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Waitlist entry updated');
    },
    onError: () => toast.error('Failed to update entry'),
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      waiting: 'bg-warning/10 text-warning border-warning/20',
      contacted: 'bg-info/10 text-info border-info/20',
      booked: 'bg-success/10 text-success border-success/20',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return styles[status] || '';
  };

  const getTimeRangeLabel = (range: string) => {
    const labels: Record<string, string> = {
      morning: '🌅 Morning (8am-12pm)',
      afternoon: '☀️ Afternoon (12pm-5pm)',
      evening: '🌙 Evening (5pm-8pm)',
    };
    return labels[range] || range;
  };

  const waitingCount = waitlistEntries?.filter(e => e.status === 'waiting').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Waitlist</h1>
          <p className="text-muted-foreground mt-1">Manage client waitlist requests</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Users className="h-4 w-4 mr-2" />
            {waitingCount} waiting
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {['waiting', 'contacted', 'booked', 'cancelled'].map(status => {
          const count = waitlistEntries?.filter(e => e.status === status).length || 0;
          return (
            <Card 
              key={status} 
              className={`card-luxury cursor-pointer ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-heading font-semibold">{count}</p>
                <p className="text-sm text-muted-foreground capitalize">{status}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entries</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="card-luxury">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Preferred Date</TableHead>
              <TableHead>Time Preference</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waitlistEntries?.map(entry => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {entry.clients?.first_name} {entry.clients?.last_name}
                    </p>
                    {entry.clients?.phone && (
                      <a 
                        href={`tel:${entry.clients.phone}`} 
                        className="text-xs text-primary flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        {entry.clients.phone}
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {entry.services?.name || 'Any service'}
                  {entry.services?.category && (
                    <p className="text-xs text-muted-foreground">{entry.services.category}</p>
                  )}
                </TableCell>
                <TableCell>
                  {entry.preferred_date ? (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(entry.preferred_date), 'MMM d, yyyy')}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Flexible</span>
                  )}
                </TableCell>
                <TableCell>
                  {entry.preferred_time_range ? (
                    <span className="text-sm">{getTimeRangeLabel(entry.preferred_time_range)}</span>
                  ) : (
                    <span className="text-muted-foreground">Any time</span>
                  )}
                </TableCell>
                <TableCell>
                  {entry.staff ? (
                    `${entry.staff.first_name} ${entry.staff.last_name}`
                  ) : (
                    <span className="text-muted-foreground">Any provider</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadge(entry.status)}>
                    {entry.status}
                  </Badge>
                  {entry.contacted_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.contacted_at), 'MMM d, h:mm a')}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(entry.created_at), 'MMM d')}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {entry.status === 'waiting' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: entry.id, status: 'contacted' })}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Mark Contacted
                      </Button>
                    )}
                    {entry.status === 'contacted' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: entry.id, status: 'booked' })}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Booked
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: entry.id, status: 'cancelled' })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {waitlistEntries?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No waitlist entries found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading waitlist...</div>
      )}
    </div>
  );
}
