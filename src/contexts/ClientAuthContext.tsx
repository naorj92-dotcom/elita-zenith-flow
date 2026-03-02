import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Client } from '@/types';

interface ClientAuthContextType {
  user: User | null;
  session: Session | null;
  client: Client | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemo: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

// Demo client data
const DEMO_CLIENT: Client = {
  id: 'demo-client-id',
  first_name: 'Victoria',
  last_name: 'Hamilton',
  email: 'victoria@demo.com',
  phone: '(555) 123-4567',
  date_of_birth: '1990-05-15',
  address: '123 Luxury Lane',
  city: 'Beverly Hills',
  state: 'CA',
  zip: '90210',
  notes: 'VIP Client - Prefers morning appointments',
  avatar_url: null,
  is_vip: true,
  total_spent: 12500,
  visit_count: 24,
  last_visit_date: new Date().toISOString(),
  created_at: '2023-01-15T00:00:00Z',
  updated_at: new Date().toISOString(),
};

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const fetchClientProfile = useCallback(async (userId: string) => {
    const { data: profile } = await supabase
      .from('client_profiles')
      .select('*, clients(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile?.clients) {
      setClient(profile.clients as Client);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchClientProfile(session.user.id);
          }, 0);
        } else {
          setClient(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchClientProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchClientProfile]);

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<{ error: string | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/portal`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { error: 'This email is already registered. Please sign in instead.' };
        }
        return { error: error.message };
      }

      if (data.user) {
        // Use secure RPC function to create client record + profile + role atomically
        const { data: clientId, error: rpcError } = await supabase
          .rpc('register_client', {
            p_user_id: data.user.id,
            p_first_name: firstName,
            p_last_name: lastName,
            p_email: email,
          });

        if (rpcError) {
          console.error('Error registering client:', rpcError);
          return { error: 'Failed to create client profile.' };
        }

        // Fetch the created client data
        if (clientId) {
          await fetchClientProfile(data.user.id);
        }
      }

      return { error: null };
    } catch (err) {
      return { error: 'An unexpected error occurred.' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password.' };
        }
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      return { error: 'An unexpected error occurred.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setClient(null);
    setIsDemo(false);
  };

  const enterDemoMode = () => {
    setIsDemo(true);
    setClient(DEMO_CLIENT);
    setIsLoading(false);
  };

  return (
    <ClientAuthContext.Provider
      value={{
        user,
        session,
        client,
        isAuthenticated: !!user || isDemo,
        isLoading,
        isDemo,
        signUp,
        signIn,
        signOut,
        enterDemoMode,
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
}
