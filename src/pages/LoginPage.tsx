import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import elitaLogo from '@/assets/elita-logo.png';

export function LoginPage() {
  const { signIn, isAuthenticated, isLoading, role } = useUnifiedAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  if (isAuthenticated) {
    if (role === 'client') return <Navigate to="/portal" replace />;
    if (role === 'owner' || role === 'employee') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/setup" replace />;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const secondsLeft = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Try again in ${secondsLeft}s.`);
      return;
    }
    setSubmitting(true);
    // Store remember-me preference
    if (rememberMe) {
      localStorage.setItem('elita_remember_me', 'true');
    } else {
      localStorage.removeItem('elita_remember_me');
    }
    const result = await signIn(email, password);
    if (result.error) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 5) {
        const lockDuration = Math.min(30, 5 * Math.pow(2, Math.floor(newAttempts / 5) - 1));
        setLockoutUntil(Date.now() + lockDuration * 1000);
        setError(`Account locked for ${lockDuration}s after ${newAttempts} failed attempts.`);
      } else {
        setError(`${result.error} (${5 - newAttempts} attempts remaining)`);
      }
    } else {
      setFailedAttempts(0);
      setLockoutUntil(null);
      // Log login event
      try {
        const { data: { user: loggedInUser } } = await supabase.auth.getUser();
        if (loggedInUser) {
          await supabase.from('security_logs').insert({
            user_id: loggedInUser.id,
            event_type: 'login',
            user_agent: navigator.userAgent,
          });
        }
      } catch { /* non-critical */ }
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
    if (error) toast.error(error.message);
    else { toast.success('Password reset email sent! Check your inbox.'); setShowForgotPassword(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-hero relative overflow-hidden">
      {/* Ambient glow layers */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(32 38% 56% / 0.06) 0%, hsl(34 24% 90% / 0.03) 40%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-[40vh]"
          style={{ background: 'linear-gradient(0deg, hsl(34 20% 93% / 0.4) 0%, transparent 100%)' }} />
      </div>

      {/* Logo */}
      <div className="pt-16 pb-10 flex justify-center relative z-10">
        <motion.img 
          src={elitaLogo} 
          alt="Elita Medical Spa" 
          className="h-16 w-auto object-contain"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Login Card */}
      <div className="flex-1 flex flex-col items-center px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
          className="w-full max-w-[400px] login-glow"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-heading font-semibold text-foreground">Staff Login</h1>
            <p className="text-sm text-muted-foreground mt-2">Sign in to access the dashboard</p>
          </div>

          <Card className="shadow-xl border-border/50" style={{ boxShadow: 'var(--shadow-xl), inset 0 1px 0 hsl(36 30% 100% / 0.5)' }}>
            <CardContent className="pt-8 pb-8 px-8">
              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email" type="email" placeholder="you@elitamedspa.com"
                    value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    required autoComplete="email" className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                      value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      required autoComplete="current-password" className="pr-10 h-12"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                    Remember me for 30 days
                  </Label>
                </div>

                <Button type="submit" className="w-full h-[3.25rem] text-[13px] font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-300" disabled={submitting || isLoading}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}
                </Button>

                <button type="button" onClick={() => { setShowForgotPassword(true); setForgotEmail(email); }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Forgot password?
                </button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
            <Card>
              <CardContent className="pt-7 space-y-5">
                <button onClick={() => setShowForgotPassword(false)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to login
                </button>
                <div>
                  <h2 className="text-lg font-heading font-semibold text-foreground">Reset Password</h2>
                  <p className="text-sm text-muted-foreground mt-1.5">We'll send you a link to reset your password.</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input id="forgot-email" type="email" value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@elitamedspa.com" required />
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
      <div className="text-center pb-12 relative z-10">
        <p className="text-sm text-muted-foreground">
          Client?{' '}
          <Link to="/portal/auth" className="text-elita-camel hover:text-elita-camel/80 font-medium transition-colors">
            Access Client Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
