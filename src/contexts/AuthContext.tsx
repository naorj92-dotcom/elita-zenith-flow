// Backward compatibility layer for legacy AuthContext
// This re-exports from UnifiedAuthContext to maintain compatibility

import { useUnifiedAuth } from './UnifiedAuthContext';
import { Staff, TimeClock, ClockStatus, StaffRole } from '@/types';

// Re-export the provider for places that might import AuthProvider directly
export { UnifiedAuthProvider as AuthProvider } from './UnifiedAuthContext';

// Backward compatible hook that matches the old AuthContext interface
export function useAuth() {
  const unified = useUnifiedAuth();
  
  // Map unified auth to legacy interface
  return {
    staff: unified.staff,
    clockStatus: unified.clockStatus,
    isAuthenticated: unified.isAuthenticated,
    isLoading: unified.isLoading,
    login: async () => false, // PIN auth removed
    logout: unified.signOut,
    clockIn: unified.clockIn,
    clockOut: unified.clockOut,
    refreshClockStatus: unified.refreshClockStatus,
  };
}
