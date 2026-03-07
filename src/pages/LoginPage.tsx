import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import elitaLogo from '@/assets/elita-logo.png';

export function LoginPage() {
  const { signIn, loginWithPin, isAuthenticated, isLoading, role } = useUnifiedAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);

  if (isAuthenticated) {
    if (role === 'client') {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotSending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Logo */}
      <div className="pt-12 pb-8 flex justify-center">
        <img 
          src={elitaLogo} 
          alt="Elita Medical Spa" 
          className="h-14 w-auto object-contain"
        />
      </div>

      {/* Login Card */}
      <div className="flex-1 flex flex-col items-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-6">
            <h1 className="text-2xl font-heading font-semibold text-foreground">Staff Login</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access the dashboard</p>
          </div>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="pin" className="gap-2">
                <KeyRound className="h-4 w-4" />
                Quick PIN
              </TabsTrigger>
            </TabsList>

            {/* Email/Password Tab */}
            <TabsContent value="email">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@elitamedspa.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        required
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(null); }}
                          required
                          autoComplete="current-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={submitting || isLoading}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : 'Sign In'}
                    </Button>

                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(true); setForgotEmail(email); }}
                      className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PIN Tab */}
            <TabsContent value="pin">
              <PinPad 
                onSubmit={loginWithPin}
                isLoading={isLoading}
                title="Quick Access"
                subtitle="Enter your 4-digit PIN"
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm"
          >
            <Card>
              <CardContent className="pt-6 space-y-4">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to login
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Reset Password</h2>
                  <p className="text-sm text-muted-foreground mt-1">We'll send you a link to reset your password.</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@elitamedspa.com"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={forgotSending}>
                    {forgotSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Send Reset Link
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Client Portal Link */}
      <div className="text-center pb-8">
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
