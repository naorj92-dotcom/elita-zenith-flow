import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Home, Package, Image, ShoppingBag, Calendar, Clock, LogOut, Menu, X, FileText } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/portal', icon: Home, label: 'Dashboard' },
  { href: '/portal/forms', icon: FileText, label: 'My Forms' },
  { href: '/portal/packages', icon: Package, label: 'My Packages' },
  { href: '/portal/photos', icon: Image, label: 'Progress Photos' },
  { href: '/portal/recommendations', icon: ShoppingBag, label: 'Recommendations' },
  { href: '/portal/history', icon: Clock, label: 'History' },
  { href: '/portal/book', icon: Calendar, label: 'Book Appointment' },
];

export function ClientPortalLayout() {
  const { isAuthenticated, isLoading, signOut, client } = useClientAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-heading font-semibold">Elita</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <Button 
                    variant={isActive ? 'default' : 'ghost'} 
                    size="sm"
                    className="gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{client?.first_name} {client?.last_name}</p>
              <p className="text-xs text-muted-foreground">{client?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t bg-card px-4 py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link 
                  key={item.href} 
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button 
                    variant={isActive ? 'secondary' : 'ghost'} 
                    className="w-full justify-start gap-3 my-1"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Elita MedSpa. All rights reserved.</p>
          <p className="mt-1">
            Questions? <a href="tel:+15551234567" className="text-primary hover:underline">Call us</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
