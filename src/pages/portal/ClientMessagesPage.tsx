import React, { useState, useRef, useEffect } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, MessageCircle, CheckCheck } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from 'sonner';

interface Message {
  id: string;
  body: string;
  sender_type: string;
  is_read: boolean;
  created_at: string;
  subject: string | null;
  sender_staff_id: string | null;
  staff?: { first_name: string; last_name: string } | null;
}

const DEMO_MESSAGES: Message[] = [
  {
    id: 'd1',
    body: 'Hi! Just a reminder that your Hydrafacial appointment is coming up this Friday at 2pm. Please arrive 10 minutes early. See you soon! 💆‍♀️',
    sender_type: 'staff',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    subject: null,
    sender_staff_id: 's1',
    staff: { first_name: 'Sarah', last_name: 'Johnson' },
  },
  {
    id: 'd2',
    body: 'Thank you! I\'ll be there. Quick question — should I avoid any skincare products before the treatment?',
    sender_type: 'client',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    subject: null,
    sender_staff_id: null,
    staff: null,
  },
  {
    id: 'd3',
    body: 'Great question! Please avoid retinol and exfoliants for 48 hours before your appointment. Regular cleanser and moisturizer are fine. 😊',
    sender_type: 'staff',
    is_read: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    subject: null,
    sender_staff_id: 's1',
    staff: { first_name: 'Sarah', last_name: 'Johnson' },
  },
  {
    id: 'd4',
    body: 'Your latest before & after photos have been uploaded to your portal. Check them out under the Photos section!',
    sender_type: 'staff',
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    subject: null,
    sender_staff_id: 's2',
    staff: { first_name: 'Dr. Emily', last_name: 'Chen' },
  },
];

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

export function ClientMessagesPage() {
  const { client, isDemo } = useClientAuth();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['client-messages', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_MESSAGES;
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*, staff:sender_staff_id(first_name, last_name)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!client?.id || isDemo,
    refetchInterval: 10000,
  });

  // Mark unread messages as read
  useEffect(() => {
    if (isDemo || !client?.id) return;
    const unread = messages.filter(m => !m.is_read && m.sender_type === 'staff');
    if (unread.length > 0) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unread.map(m => m.id))
        .then();
    }
  }, [messages, client?.id, isDemo]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (isDemo) {
        toast.info('Sending is disabled in demo mode');
        return;
      }
      if (!client?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('messages').insert({
        client_id: client.id,
        body,
        sender_type: 'client',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['client-messages'] });
    },
    onError: () => toast.error('Failed to send message'),
  });

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const grouped: { label: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const label = formatDateLabel(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) {
      last.msgs.push(msg);
    } else {
      grouped.push({ label, msgs: [msg] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Messages
          </CardTitle>
          <p className="text-sm text-muted-foreground">Chat with our team</p>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="No messages yet"
                description="Send us a message and we'll get back to you shortly."
                compact
              />
            ) : (
              grouped.map((group) => (
                <div key={group.label}>
                  <div className="flex justify-center my-3">
                    <Badge variant="secondary" className="text-[10px] font-normal px-2.5 py-0.5">
                      {group.label}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {group.msgs.map((msg) => {
                      const isClient = msg.sender_type === 'client';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              isClient
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                            }`}
                          >
                            {!isClient && msg.staff && (
                              <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                                {msg.staff.first_name} {msg.staff.last_name}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                            <div className={`flex items-center gap-1 mt-1 ${isClient ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[10px] opacity-60">
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </span>
                              {isClient && msg.is_read && (
                                <CheckCheck className="h-3 w-3 opacity-60" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border p-3 flex gap-2 items-end">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMutation.isPending}
              className="shrink-0 h-11 w-11 rounded-full"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
