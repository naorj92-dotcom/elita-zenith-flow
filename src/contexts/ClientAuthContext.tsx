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
  signUp: (email: string, password: string, firstName: string, lastName: string, referralCode?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);


export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClientProfile = useCallback(async (userId: string) => {
    const { data: profile } = await supabase
      .from('client_profiles')
      .select('*, clients(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile?.clients) {
      setClient(profile.clients as Client);
    } else {
      // No profile yet — try to create one (handles post-email-confirmation)
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata;
      if (meta?.first_name && meta?.last_name && user?.email) {
        const { data: clientId, error: rpcError } = await supabase
          .rpc('register_client', {
            p_user_id: userId,
            p_first_name: meta.first_name,
            p_last_name: meta.last_name,
            p_email: user.email,
          });
        if (!rpcError && clientId) {
          // If signed up via referral link, link the referral
          if (meta?.referral_code) {
            const { data: referrer } = await supabase
              .from('clients')
              .select('id')
              .eq('referral_code', meta.referral_code)
              .maybeSingle();
            if (referrer?.id) {
              // Set referring_client_id
              await supabase.from('clients').update({ referring_client_id: referrer.id } as any).eq('id', clientId);
              // Create referral record
              await supabase.from('referrals').insert({
                referrer_client_id: referrer.id,
                referred_client_id: clientId,
                referral_code: meta.referral_code,
                status: 'booked',
              } as any);
            }
          }
          // Re-fetch the newly created profile
          const { data: newProfile } = await supabase
            .from('client_profiles')
            .select('*, clients(*)')
            .eq('user_id', userId)
            .maybeSingle();
          if (newProfile?.clients) {
            setClient(newProfile.clients as Client);
          }
        }
      }
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

  const signUp = async (email: string, password: string, firstName: string, lastName: string, referralCode?: string): Promise<{ error: string | null }> => {
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
            ...(referralCode ? { referral_code: referralCode } : {}),
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { error: 'This email is already registered. Please sign in instead.' };
        }
        return { error: error.message };
      }

      // Client profile will be created on first sign-in via fetchClientProfile

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
    setClient(null);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
    // Force navigation to auth page
    window.location.href = '/portal/auth';
  };

  return (
    <ClientAuthContext.Provider
      value={{
        user,
        session,
        client,
        isAuthenticated: !!user,
        isLoading,
        signUp,
        signIn,
        signOut,
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
