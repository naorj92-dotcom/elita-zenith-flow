import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Plus, Pin, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  important: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  info: 'bg-muted text-muted-foreground',
};

export function StaffAnnouncementsWidget() {
  const { staff } = useAuth();
  const { isOwner } = useUnifiedAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');

  const { data: announcements = [] } = useQuery({
    queryKey: ['staff-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_announcements')
        .select('*, staff:author_id(first_name, last_name)')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('staff_announcements')
        .insert({
          author_id: staff?.id,
          title: title.trim(),
          body: body.trim(),
          priority,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-announcements'] });
      setShowCreate(false);
      setTitle('');
      setBody('');
      setPriority('normal');
      toast.success('Announcement posted');
    },
    onError: () => toast.error('Failed to post announcement'),
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Announcements
          {announcements.length > 0 && (
            <Badge variant="secondary" className="text-xs">{announcements.length}</Badge>
          )}
        </CardTitle>
        {isOwner && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Post
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Write your announcement..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={4}
                />
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={!title.trim() || !body.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Post Announcement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No announcements</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <div
                key={a.id}
                className="p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-2 mb-1">
                  {a.is_pinned && <Pin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm text-foreground">{a.title}</h4>
                      <Badge variant="secondary" className={`text-xs ${PRIORITY_STYLES[a.priority] || ''}`}>
                        {a.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {a.staff && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {a.staff.first_name} {a.staff.last_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(a.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
