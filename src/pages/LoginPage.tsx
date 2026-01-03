import React from 'react';
import { Navigate } from 'react-router-dom';
import { PinPad } from '@/components/auth/PinPad';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PinPad 
      onSubmit={login}
      isLoading={isLoading}
      title="Elita MedSpa"
      subtitle="Enter your PIN to clock in"
    />
  );
}
