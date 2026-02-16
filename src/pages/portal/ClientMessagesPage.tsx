import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Loader2, Inbox, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ClientMessagesPage() {
  const { client } = useClientAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['client-messages', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!client?.id,
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!client?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('messages').insert({
        client_id: client.id,
        sender_type: 'client',
        subject: subject.trim() || null,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-messages'] });
      setSubject('');
      setBody('');
      toast.success('Message sent!');
    },
    onError: () => toast.error('Failed to send message'),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    sendMessage.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          Messages
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send us a message and we'll get back to you shortly.
        </p>
      </div>

      {/* Compose */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="text-lg font-heading">New Message</CardTitle>
          <CardDescription>Have a question or need assistance? We're here to help.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <Input
              placeholder="Subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
            />
            <Textarea
              placeholder="Type your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={2000}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!body.trim() || sendMessage.isPending} className="gap-2">
                {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Message
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            Conversation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              description="Send your first message above and our team will respond."
              compact
            />
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isClient = msg.sender_type === 'client';
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col gap-1 p-4 rounded-xl max-w-[85%]",
                      isClient
                        ? "ml-auto bg-primary/10 border border-primary/20"
                        : "mr-auto bg-secondary border border-border"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        {isClient ? 'You' : 'Elita Team'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {msg.subject && (
                      <p className="font-semibold text-sm">{msg.subject}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    {isClient && msg.is_read && (
                      <CheckCheck className="h-3.5 w-3.5 text-primary self-end" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
