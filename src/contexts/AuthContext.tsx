import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Staff, TimeClock, ClockStatus, StaffRole } from '@/types';

interface AuthContextType {
  staff: Staff | null;
  clockStatus: ClockStatus | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  clockIn: () => Promise<boolean>;
  clockOut: () => Promise<boolean>;
  refreshClockStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

    if (data) {
      setClockStatus({
        is_clocked_in: true,
        clock_entry: data as TimeClock,
      });
    } else {
      setClockStatus({
        is_clocked_in: false,
        clock_entry: undefined,
      });
    }
  }, []);

  const login = useCallback(async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('pin', pin)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (data) {
        const staffData: Staff = {
          ...data,
          role: data.role as StaffRole,
        };
        setStaff(staffData);
        await fetchClockStatus(data.id);
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchClockStatus]);

  const logout = useCallback(() => {
    setStaff(null);
    setClockStatus(null);
  }, []);

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

  const clockOut = useCallback(async (): Promise<boolean> => {
    if (!staff || !clockStatus?.clock_entry) return false;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_clock')
        .update({
          clock_out: new Date().toISOString(),
        })
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

  const refreshClockStatus = useCallback(async () => {
    if (staff) {
      await fetchClockStatus(staff.id);
    }
  }, [staff, fetchClockStatus]);

  return (
    <AuthContext.Provider
      value={{
        staff,
        clockStatus,
        isAuthenticated: !!staff,
        isLoading,
        login,
        logout,
        clockIn,
        clockOut,
        refreshClockStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
