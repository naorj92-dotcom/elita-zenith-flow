import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { PinPad } from '@/components/auth/PinPad';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-hero">
      <PinPad 
        onSubmit={login}
        isLoading={isLoading}
        title="Elita MedSpa"
        subtitle="Enter your PIN to clock in"
      />
      <div className="text-center pb-8">
        <p className="text-sm text-muted-foreground">
          Client?{' '}
          <Link to="/portal/auth" className="text-primary hover:underline">
            Access Client Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
