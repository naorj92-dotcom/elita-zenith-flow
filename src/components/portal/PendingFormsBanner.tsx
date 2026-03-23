import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export function PendingFormsBanner() {
  const { client } = useClientAuth();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['client-pending-forms-count', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { count } = await supabase
        .from('client_forms')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: !!client?.id,
  });

  const { data: nextAppointment } = useQuery({
    queryKey: ['client-next-apt-banner', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data } = await supabase
        .from('appointments')
        .select('scheduled_at')
        .eq('client_id', client.id)
        .gte('scheduled_at', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_at', { ascending: true })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!client?.id,
  });

  if (pendingCount === 0) return null;

  const message = nextAppointment
    ? `Action required: Complete your forms before your ${format(new Date(nextAppointment.scheduled_at), 'MMM d')} visit`
    : `You have ${pendingCount} form${pendingCount > 1 ? 's' : ''} waiting to be completed`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          to="/portal/forms"
          className="flex items-center gap-3 w-full px-5 py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, hsl(38 80% 52%), hsl(32 76% 48%))',
            color: 'hsl(24 30% 12%)',
          }}
        >
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" strokeWidth={2.5} />
          <span className="flex-1 leading-snug">{message}</span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
