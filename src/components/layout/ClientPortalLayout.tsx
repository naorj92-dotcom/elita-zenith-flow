import React, { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Home, Package, Image, ShoppingBag, Calendar, Clock, LogOut, Menu, X, FileText, Crown, Wallet, User, Heart, Gift, Star, CalendarPlus, History } from 'lucide-react';
import { CLIENT_NAVIGATION, CLIENT_MOBILE_NAV } from '@/config/navigation';

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

  // Flatten navigation for header
  const flatNavItems = CLIENT_NAVIGATION.flatMap(cat => cat.items).slice(0, 7);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-heading font-semibold">Elita</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {flatNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} to={item.href}>
                  <Button 
                    variant={isActive ? 'default' : 'ghost'} 
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
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
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t bg-card px-4 py-2 max-h-[70vh] overflow-y-auto">
            {CLIENT_NAVIGATION.map((category) => (
              <div key={category.label} className="py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                  {category.label}
                </p>
                {category.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
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
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-2 py-2 flex justify-around">
        {CLIENT_MOBILE_NAV.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px] ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer - hidden on mobile due to bottom nav */}
      <footer className="hidden lg:block border-t py-6 mt-auto">
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
