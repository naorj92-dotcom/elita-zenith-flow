import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import elitaLogo from '@/assets/elita-logo.png';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function ClientAuthPage() {
  const { signIn, signUp, isAuthenticated, isLoading: authLoading } = useClientAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(refCode ? 'signup' : 'signin');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="h-6 w-6 animate-spin text-elita-camel" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/portal" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) { toast({ title: 'Validation Error', description: result.error.errors[0].message, variant: 'destructive' }); return; }
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    if (error) toast({ title: 'Sign In Failed', description: error, variant: 'destructive' });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = signupSchema.safeParse({ firstName: signupFirstName, lastName: signupLastName, email: signupEmail, password: signupPassword, confirmPassword: signupConfirmPassword });
    if (!result.success) { toast({ title: 'Validation Error', description: result.error.errors[0].message, variant: 'destructive' }); return; }
    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupFirstName, signupLastName, refCode || undefined);
    setIsLoading(false);
    if (error) toast({ title: 'Sign Up Failed', description: error, variant: 'destructive' });
    else toast({ title: 'Welcome!', description: 'Your account has been created successfully.' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Cinematic ambient background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 50% 30%, hsl(34 48% 60% / 0.1) 0%, transparent 55%),
              radial-gradient(ellipse 80% 60% at 30% 70%, hsl(30 40% 52% / 0.05) 0%, transparent 50%),
              radial-gradient(ellipse 70% 50% at 75% 20%, hsl(34 36% 55% / 0.06) 0%, transparent 50%),
              linear-gradient(180deg, hsl(33 30% 96.5%) 0%, hsl(32 28% 93%) 50%, hsl(33 30% 96%) 100%)
            `
          }}
        />
        {/* Animated spotlight */}
        <motion.div
          className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(34 48% 60% / 0.08) 0%, transparent 55%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Vignette */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, hsl(22 20% 16% / 0.08) 100%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex justify-center mb-5"
          >
            <img src={elitaLogo} alt="Elita MedSpa" className="h-18 w-auto" />
          </motion.div>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.4em] font-medium">Client Portal</p>
        </div>

        <Card className="glass gold-edge rounded-[1.75rem] overflow-hidden"
              style={{ boxShadow: '0 24px 80px hsl(22 24% 18% / 0.1), 0 0 60px hsl(34 48% 60% / 0.06), inset 0 1px 0 hsl(36 36% 100% / 0.6)' }}>
          <CardHeader className="text-center pb-3 pt-8">
            <CardTitle className="text-2xl font-heading">Welcome</CardTitle>
            <CardDescription className="mt-2">
              Sign in to view your treatments and book appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-7">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="your@email.com" value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)} required disabled={isLoading} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)} required disabled={isLoading} className="h-12 rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full h-13 rounded-xl btn-glow" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing In...</> : 'Sign In'}
                  </Button>
                  <button type="button" onClick={() => { setShowForgotPassword(true); setForgotEmail(loginEmail); }}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">
                    Forgot password?
                  </button>
                  <div className="pt-3 border-t border-border/30 text-center">
                    <p className="text-sm text-muted-foreground">
                      Don't have an account?{' '}
                      <button type="button" onClick={() => setActiveTab('signup')}
                        className="text-elita-camel font-medium hover:underline transition-colors">Sign Up</button>
                    </p>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-first-name">First Name</Label>
                      <Input id="signup-first-name" type="text" placeholder="Victoria" value={signupFirstName}
                        onChange={(e) => setSignupFirstName(e.target.value)} required disabled={isLoading} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-last-name">Last Name</Label>
                      <Input id="signup-last-name" type="text" placeholder="Hamilton" value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)} required disabled={isLoading} className="h-12 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="your@email.com" value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)} required disabled={isLoading} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)} required disabled={isLoading} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input id="signup-confirm-password" type="password" placeholder="••••••••" value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)} required disabled={isLoading} className="h-12 rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full h-13 rounded-xl btn-glow" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account...</> : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
              <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="w-full max-w-sm glass gold-edge rounded-2xl">
                    <CardContent className="pt-7 space-y-5">
                      <button onClick={() => setShowForgotPassword(false)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-4 w-4" /> Back
                      </button>
                      <div>
                        <h2 className="text-lg font-heading font-semibold text-foreground">Reset Password</h2>
                        <p className="text-sm text-muted-foreground mt-1.5">We'll email you a reset link.</p>
                      </div>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!forgotEmail.trim()) return;
                        setForgotSending(true);
                        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        setForgotSending(false);
                        if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        else { toast({ title: 'Email Sent', description: 'Check your inbox for a reset link.' }); setShowForgotPassword(false); }
                      }} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-email-client">Email</Label>
                          <Input id="forgot-email-client" type="email" value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)} required className="h-12 rounded-xl" />
                        </div>
                        <Button type="submit" className="w-full btn-glow" disabled={forgotSending}>
                          {forgotSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Send Reset Link
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Login Link */}
        <p className="text-center mt-10 text-sm text-muted-foreground/50">
          Staff member?{' '}
          <a href="/login" className="text-elita-camel font-medium hover:underline">Staff Login</a>
        </p>
      </motion.div>
    </div>
  );
}
