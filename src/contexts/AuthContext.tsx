import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Staff, ClockStatus } from '@/types';

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

// Mock staff data for demo (will be replaced with Supabase)
const mockStaffData: Staff[] = [
  {
    id: '1',
    name: 'Dr. Sarah Mitchell',
    email: 'sarah@elitamedspa.com',
    role: 'provider',
    pin: '1234',
    hourly_base_pay: 0,
    active: true,
    avatar_url: undefined,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Emma Rodriguez',
    email: 'emma@elitamedspa.com',
    role: 'esthetician',
    pin: '5678',
    hourly_base_pay: 25,
    active: true,
    avatar_url: undefined,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Admin User',
    email: 'admin@elitamedspa.com',
    role: 'admin',
    pin: '0000',
    hourly_base_pay: 35,
    active: true,
    avatar_url: undefined,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Rachel Kim',
    email: 'rachel@elitamedspa.com',
    role: 'receptionist',
    pin: '1111',
    hourly_base_pay: 20,
    active: true,
    avatar_url: undefined,
    created_at: new Date().toISOString(),
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const foundStaff = mockStaffData.find(s => s.pin === pin && s.active);
      
      if (foundStaff) {
        setStaff(foundStaff);
        // Initialize clock status
        setClockStatus({
          is_clocked_in: false,
          clock_entry: undefined,
        });
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setStaff(null);
    setClockStatus(null);
  }, []);

  const clockIn = useCallback(async (): Promise<boolean> => {
    if (!staff) return false;
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setClockStatus({
        is_clocked_in: true,
        clock_entry: {
          id: crypto.randomUUID(),
          staff_id: staff.id,
          clock_in: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
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
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const clockOutTime = new Date();
      const clockInTime = new Date(clockStatus.clock_entry.clock_in);
      const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
      
      setClockStatus({
        is_clocked_in: false,
        clock_entry: {
          ...clockStatus.clock_entry,
          clock_out: clockOutTime.toISOString(),
          total_hours: parseFloat(totalHours.toFixed(2)),
        },
      });
      return true;
    } finally {
      setIsLoading(false);
    }
  }, [staff, clockStatus]);

  const refreshClockStatus = useCallback(async () => {
    // Will be implemented with Supabase
  }, []);

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
