import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { PinPad } from '@/components/auth/PinPad';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import elitaLogo from '@/assets/elita-logo.png';

export function LoginPage() {
  const { loginWithPin, isAuthenticated, isLoading, role } = useUnifiedAuth();

  if (isAuthenticated) {
    if (role === 'client') {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Logo */}
      <div className="pt-16 pb-10 flex justify-center">
        <img 
          src={elitaLogo} 
          alt="Elita Medical Spa" 
          className="h-16 w-auto object-contain"
        />
      </div>

      {/* PIN Pad */}
      <div className="flex-1 flex flex-col">
        <PinPad 
          onSubmit={loginWithPin}
          isLoading={isLoading}
          title="Staff Login"
          subtitle="Enter your PIN to clock in"
        />
      </div>

      {/* Client Portal Link */}
      <div className="text-center pb-10">
        <p className="text-sm text-muted-foreground">
          Client?{' '}
          <Link to="/portal/auth" className="text-primary hover:text-primary-hover transition-colors">
            Access Client Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
