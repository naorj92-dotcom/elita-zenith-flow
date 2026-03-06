import React, { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, Menu, X } from 'lucide-react';
import { CLIENT_NAVIGATION, CLIENT_MOBILE_NAV } from '@/config/navigation';
import { cn } from '@/lib/utils';
import elitaLogo from '@/assets/elita-logo.png';

export function ClientPortalLayout() {
  const { isAuthenticated, isLoading, signOut, client, isDemo } = useClientAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch pending forms count for badge
  const { data: pendingFormsCount = 0 } = useQuery({
    queryKey: ['client-pending-forms-badge', client?.id, isDemo],
    queryFn: async () => {
      if (isDemo) return 2;
      if (!client?.id) return 0;
      const { count } = await supabase
        .from('client_forms')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: (!!client?.id || isDemo) && isAuthenticated,
    refetchInterval: 30000, // Poll every 30s for new form assignments
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/auth" replace />;
  }

  const flatNavItems = CLIENT_NAVIGATION.flatMap(cat => cat.items).slice(0, 6);
  const isFormsLink = (href: string) => href === '/portal/forms';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Clean, minimal */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/portal">
            <img 
              src={elitaLogo} 
              alt="Elita Medical Spa" 
              className="h-8 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {flatNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              const showBadge = isFormsLink(item.href) && pendingFormsCount > 0;
              return (
                <Link key={item.href} to={item.href}>
                  <Button 
                    variant={isActive ? 'default' : 'ghost'} 
                    size="sm"
                    className="gap-2 relative"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {showBadge && (
                      <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] bg-destructive text-destructive-foreground border-0">
                        {pendingFormsCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">{client?.first_name} {client?.last_name}</p>
              <p className="text-xs text-muted-foreground">{client?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-border bg-card px-4 py-3 max-h-[70vh] overflow-y-auto">
            {CLIENT_NAVIGATION.map((category) => (
              <div key={category.label} className="py-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  {category.label}
                </p>
                {category.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  const showBadge = isFormsLink(item.href) && pendingFormsCount > 0;
                  return (
                    <Link 
                      key={item.href} 
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button 
                        variant={isActive ? 'secondary' : 'ghost'} 
                        className="w-full justify-start gap-3 my-0.5"
                        size="sm"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                        {showBadge && (
                          <Badge className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] bg-destructive text-destructive-foreground border-0">
                            {pendingFormsCount}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 lg:pb-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border px-2 py-2 flex justify-around">
        {CLIENT_MOBILE_NAV.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <footer className="hidden lg:block border-t border-border py-6 mt-auto bg-card">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Elita Medical Spa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
