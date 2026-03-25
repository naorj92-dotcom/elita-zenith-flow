import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, EmployeeType, UserRole, RolePermissions, ROLE_PERMISSIONS, EMPLOYEE_TYPE_PERMISSIONS } from '@/types/roles';
import { Staff, TimeClock, ClockStatus, Client } from '@/types';

interface UnifiedAuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Role info
  role: AppRole | null;
  employeeType: EmployeeType | null;
  userRole: UserRole | null;
  permissions: RolePermissions | null;
  
  // Staff/Client data
  staff: Staff | null;
  client: Client | null;
  clockStatus: ClockStatus | null;
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  // Legacy PIN auth removed — use email/password
  
  // Time clock
  clockIn: () => Promise<boolean>;
  clockOut: () => Promise<boolean>;
  refreshClockStatus: () => Promise<void>;
  
  // Helper checks
  isOwner: boolean;
  isEmployee: boolean;
  isClient: boolean;
  isFrontDesk: boolean;
  isProvider: boolean;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Role state
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  
  // Data state
  const [staff, setStaff] = useState<Staff | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);

  // Fetch user role from database
  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      if (data) {
        const role = data as UserRole;
        setUserRole(role);
        
        // Set permissions based on role
        const basePermissions = ROLE_PERMISSIONS[role.role];
        if (role.role === 'employee' && role.employee_type) {
          const employeePerms = EMPLOYEE_TYPE_PERMISSIONS[role.employee_type];
          setPermissions({ ...basePermissions, ...employeePerms });
        } else {
          setPermissions(basePermissions);
        }

        // Fetch linked staff/client data
        if (role.staff_id) {
          await fetchStaffData(role.staff_id);
        }
        if (role.client_id) {
          await fetchClientData(role.client_id);
        }

        return role;
      }
      return null;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return null;
    }
  }, []);

  // Fetch staff data
  const fetchStaffData = async (staffId: string) => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .maybeSingle();

    if (!error && data) {
      setStaff(data as Staff);
      await fetchClockStatus(staffId);
    }
  };

  // Fetch client data
  const fetchClientData = async (clientId: string) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (!error && data) {
      setClient(data as Client);
    }
  };

  // Fetch clock status
  const fetchClockStatus = useCallback(async (staffId: string) => {
    const { data, error } = await supabase
      .from('time_clock')
      .select('*')
      .eq('staff_id', staffId)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching clock status:', error);
      return;
    }

    setClockStatus({
      is_clocked_in: !!data,
      clock_entry: data as TimeClock | undefined,
    });
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Fail-safe: never keep protected routes on an infinite spinner
    const loadingFailSafe = window.setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    // IMPORTANT: Set up listener BEFORE getSession per Supabase best practices
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user) {
        // Keep loading true while we fetch the role — prevents premature redirect to /setup
        setIsLoading(true);
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(() => {
          fetchUserRole(newSession.user.id).finally(() => {
            window.clearTimeout(loadingFailSafe);
            setIsLoading(false);
          });
        }, 0);
      } else {
        // Clear all state on sign out
        setUserRole(null);
        setPermissions(null);
        setStaff(null);
        setClient(null);
        setClockStatus(null);
        window.clearTimeout(loadingFailSafe);
        setIsLoading(false);
      }
    });

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error || !initialSession?.user) {
          setIsLoading(false);
          return;
        }
        
        setSession(initialSession);
        setUser(initialSession.user);
        await fetchUserRole(initialSession.user.id);
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        window.clearTimeout(loadingFailSafe);
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      window.clearTimeout(loadingFailSafe);
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  // Sign in with email/password
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }
      // Don't set isLoading=false here — onAuthStateChange will handle it
      // after the role is fetched, preventing premature redirect to /setup
      return { error: null };
    } catch (err: any) {
      setIsLoading(false);
      return { error: err.message || 'Sign in failed' };
    }
  }, []);

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    // Clear local state first to unblock UI immediately
    setUser(null);
    setSession(null);
    setUserRole(null);
    setPermissions(null);
    setStaff(null);
    setClient(null);
    setClockStatus(null);
    
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Ignore errors (e.g. session_not_found) — state is already cleared
      console.warn('Sign out error (ignored):', err);
    }
  }, []);


  // Clock in
  const clockIn = useCallback(async (): Promise<boolean> => {
    if (!staff) return false;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_clock')
        .insert({
          staff_id: staff.id,
          clock_in: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Clock in error:', error);
        return false;
      }

      setClockStatus({
        is_clocked_in: true,
        clock_entry: data as TimeClock,
      });
      return true;
    } finally {
      setIsLoading(false);
    }
  }, [staff]);

  // Clock out
  const clockOut = useCallback(async (): Promise<boolean> => {
    if (!staff || !clockStatus?.clock_entry) return false;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_clock')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', clockStatus.clock_entry.id)
        .select()
        .single();

      if (error) {
        console.error('Clock out error:', error);
        return false;
      }

      setClockStatus({
        is_clocked_in: false,
        clock_entry: data as TimeClock,
      });
      return true;
    } finally {
      setIsLoading(false);
    }
  }, [staff, clockStatus]);

  // Refresh clock status
  const refreshClockStatus = useCallback(async () => {
    if (staff) {
      await fetchClockStatus(staff.id);
    }
  }, [staff, fetchClockStatus]);

  // Computed values
  const role = userRole?.role ?? null;
  const employeeType = userRole?.employee_type ?? null;
  const isAuthenticated = !!staff || !!user;
  const isOwner = role === 'owner';
  const isEmployee = role === 'employee';
  const isClient = role === 'client';
  const isFrontDesk = employeeType === 'front_desk';
  const isProvider = employeeType === 'provider';

  return (
    <UnifiedAuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated,
        role,
        employeeType,
        userRole,
        permissions,
        staff,
        client,
        clockStatus,
        signIn,
        signUp,
        signOut,
        clockIn,
        clockOut,
        refreshClockStatus,
        isOwner,
        isEmployee,
        isClient,
        isFrontDesk,
        isProvider,
      }}
    >
      {children}
    </UnifiedAuthContext.Provider>
  );
}

export function useUnifiedAuth() {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
}

// Convenience hooks
export function useRole() {
  const { role, employeeType, isOwner, isEmployee, isClient, isFrontDesk, isProvider } = useUnifiedAuth();
  return { role, employeeType, isOwner, isEmployee, isClient, isFrontDesk, isProvider };
}

export function usePermissions() {
  const { permissions } = useUnifiedAuth();
  return permissions;
}
