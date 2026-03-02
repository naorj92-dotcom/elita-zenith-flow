import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import elitaLogo from '@/assets/elita-logo.png';

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export function SetupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingOwner, setIsCheckingOwner] = useState(true);
  const [ownerExists, setOwnerExists] = useState(false);

  useEffect(() => {
    checkAndLoad();
  }, []);

  const checkAndLoad = async () => {
    try {
      // Use the bootstrap function to check — if owner exists it returns 403
      // Instead, just load staff list via RPC since anon can't read staff table
      // We'll check owner existence when they submit
      
      // Fetch staff list using the edge function approach
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // For initial setup, we use a direct query via the anon key
      // Staff table requires auth, so we'll let the user pick from admin staff
      // Actually, we need to fetch staff without auth - let's use the edge function
      setIsCheckingOwner(false);
    } catch (err) {
      console.error('Setup check error:', err);
      setIsCheckingOwner(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: 'Error', description: "Passwords don't match", variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (!email) {
      toast({ title: 'Error', description: 'Email is required', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-owner', {
        body: {
          email,
          password,
          staffId: selectedStaffId || '0445f625-e7d3-46c0-8ab0-98a0973e1486', // Default to Maria Santos (admin)
        },
      });

      if (error) {
        toast({ title: 'Setup Failed', description: error.message || 'Failed to create owner account', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (data?.error) {
        if (data.error.includes('already exists')) {
          setOwnerExists(true);
        }
        toast({ title: 'Setup Failed', description: data.error, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      toast({ title: 'Success! 🎉', description: data.message || 'Owner account created. You can now sign in.' });
      
      // Auto sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Unexpected error', variant: 'destructive' });
    }

    setIsLoading(false);
  };

  if (isCheckingOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (ownerExists) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Setup Complete</CardTitle>
            <CardDescription>An owner account already exists. Please sign in.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={elitaLogo} alt="Elita Medical Spa" className="h-14 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-semibold">Initial Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your owner account to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Owner Account
            </CardTitle>
            <CardDescription>
              This is a one-time setup. The account will be linked to the admin staff record (Maria Santos).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setup-email">Email Address</Label>
                <Input
                  id="setup-email"
                  type="email"
                  placeholder="you@elitamedspa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-password">Password</Label>
                <Input
                  id="setup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-confirm">Confirm Password</Label>
                <Input
                  id="setup-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Owner Account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center mt-4 text-xs text-muted-foreground">
          Already set up?{' '}
          <a href="/login" className="text-primary hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
