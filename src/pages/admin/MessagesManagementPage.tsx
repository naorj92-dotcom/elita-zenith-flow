import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle, Send, Loader2, Inbox, CheckCheck, User, Search, ArrowLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MessageThread {
  client_id: string;
  client_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export default function MessagesManagementPage() {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [search, setSearch] = useState('');

  // Fetch all messages grouped by client
  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ['message-threads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, clients(first_name, last_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Group by client
      const grouped = new Map<string, MessageThread>();
      for (const msg of data || []) {
        const cid = msg.client_id;
        const client = msg.clients as any;
        if (!grouped.has(cid)) {
          grouped.set(cid, {
            client_id: cid,
            client_name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
            last_message: msg.body,
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }
        if (msg.sender_type === 'client' && !msg.is_read) {
          grouped.get(cid)!.unread_count++;
        }
      }
      return Array.from(grouped.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
  });

  // Fetch messages for selected client
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['client-thread', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Mark unread client messages as read
      const unreadIds = (data || [])
        .filter((m) => m.sender_type === 'client' && !m.is_read)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      }

      return data || [];
    },
    enabled: !!selectedClientId,
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selectedClientId) throw new Error('No client selected');
      const { error } = await supabase.from('messages').insert({
        client_id: selectedClientId,
        sender_type: 'staff',
        body: replyBody.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-thread', selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      setReplyBody('');
      toast.success('Reply sent');
    },
    onError: () => toast.error('Failed to send reply'),
  });

  const selectedThread = threads.find((t) => t.client_id === selectedClientId);

  const filteredThreads = threads.filter((t) =>
    t.client_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          Messages
        </h1>
        <p className="text-sm text-muted-foreground mt-1">View and reply to client messages.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Thread List */}
        <Card className={cn("card-luxury lg:col-span-1 flex flex-col", selectedClientId && "hidden lg:flex")}>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            {threadsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState icon={Inbox} title="No messages" description="Client messages will appear here." compact />
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="divide-y divide-border">
                  {filteredThreads.map((thread) => (
                    <button
                      key={thread.client_id}
                      onClick={() => setSelectedClientId(thread.client_id)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors",
                        selectedClientId === thread.client_id && "bg-accent"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{thread.client_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{thread.last_message}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(thread.last_message_at), 'MMM d')}
                          </span>
                          {thread.unread_count > 0 && (
                            <Badge variant="default" className="text-[10px] h-5 min-w-5 flex items-center justify-center">
                              {thread.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className={cn("card-luxury lg:col-span-2 flex flex-col", !selectedClientId && "hidden lg:flex")}>
          {selectedClientId ? (
            <>
              <CardHeader className="border-b border-border pb-3 flex flex-row items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0"
                  onClick={() => setSelectedClientId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-heading">{selectedThread?.client_name}</CardTitle>
                  <CardDescription className="text-xs">Conversation</CardDescription>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => {
                        const isStaff = msg.sender_type === 'staff';
                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex flex-col gap-1 p-3 rounded-xl max-w-[80%]",
                              isStaff
                                ? "ml-auto bg-primary/10 border border-primary/20"
                                : "mr-auto bg-secondary border border-border"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-muted-foreground">
                                {isStaff ? 'You' : selectedThread?.client_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            {msg.subject && <p className="font-semibold text-sm">{msg.subject}</p>}
                            <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                            {isStaff && msg.is_read && (
                              <CheckCheck className="h-3 w-3 text-primary self-end" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {/* Reply */}
              <div className="border-t border-border p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!replyBody.trim()) return;
                    sendReply.mutate();
                  }}
                  className="flex gap-2"
                >
                  <Textarea
                    placeholder="Type a reply..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={2}
                    className="min-h-[44px] resize-none"
                    maxLength={2000}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!replyBody.trim() || sendReply.isPending}
                    className="shrink-0 self-end h-10 w-10"
                  >
                    {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={MessageCircle}
                title="Select a conversation"
                description="Choose a client from the list to view their messages."
                compact
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
