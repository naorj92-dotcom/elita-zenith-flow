import React, { useState, useMemo } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import { CLIENT_NAVIGATION, CLIENT_MOBILE_NAV } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import elitaLogo from '@/assets/elita-logo.png';
import type { NavCategory } from '@/config/navigation';

export function ClientPortalLayout() {
  const { isAuthenticated, isLoading, signOut, client } = useClientAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useSessionTimeout({
    timeoutMs: 30 * 60 * 1000,
    onTimeout: () => {
      toast.warning('Session expired due to inactivity');
      signOut();
    },
    enabled: isAuthenticated,
  });

  const { data: pendingFormsCount = 0 } = useQuery({
    queryKey: ['client-pending-forms-badge', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { count } = await supabase
        .from('client_forms')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: !!client?.id && isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['client-unread-messages', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('is_read', false);
      return count || 0;
    },
    enabled: !!client?.id && isAuthenticated,
    refetchInterval: 15000,
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const current = new Set<string>();
    CLIENT_NAVIGATION.forEach(cat => {
      if (cat.items.some(item =>
        location.pathname === item.href ||
        location.pathname.startsWith(item.href.split('?')[0] + '/')
      )) {
        current.add(cat.label);
      }
    });
    return current;
  });

  const toggleCategory = (label: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isItemActive = (href: string): boolean => {
    const basePath = href.split('?')[0];
    if (href.includes('?')) return location.pathname + location.search === href;
    if (href === '/portal') return location.pathname === '/portal';
    return location.pathname === basePath || location.pathname.startsWith(basePath + '/');
  };

  const isCategoryActive = (category: NavCategory): boolean => {
    return category.items.some(item => isItemActive(item.href));
  };

  const getBadgeCount = (href: string): number => {
    if (href === '/portal/forms') return pendingFormsCount;
    if (href === '/portal/messages') return unreadCount;
    return 0;
  };

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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-card border-r border-border">
        {/* Logo */}
        <div className="p-5 border-b border-border flex justify-center">
          <Link to="/portal" className="block">
            <img
              src={elitaLogo}
              alt="Elita Medical Spa"
              className="h-14 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {CLIENT_NAVIGATION.map((category) => {
            const isExpanded = expandedCategories.has(category.label);
            const isActive = isCategoryActive(category);
            const Icon = category.icon;

            if (category.items.length === 1) {
              const item = category.items[0];
              const ItemIcon = item.icon;
              const itemActive = isItemActive(item.href);
              const badge = getBadgeCount(item.href);

              return (
                <Link
                  key={category.label}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                    itemActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className={cn(
                    "w-[18px] h-[18px]",
                    itemActive ? "text-primary-foreground" : "text-muted-foreground"
                  )} />
                  <span className="text-sm font-medium">{category.label}</span>
                  {badge > 0 && (
                    <Badge className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] bg-destructive text-destructive-foreground border-0">
                      {badge}
                    </Badge>
                  )}
                </Link>
              );
            }

            return (
              <div key={category.label}>
                <button
                  onClick={() => toggleCategory(category.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className={cn(
                    "w-[18px] h-[18px]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="text-sm font-medium">{category.label}</span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="ml-auto"
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-3 pt-0.5 space-y-0.5">
                        {category.items.map((item) => {
                          const SubIcon = item.icon;
                          const itemActive = isItemActive(item.href);
                          const badge = getBadgeCount(item.href);

                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150",
                                itemActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              )}
                            >
                              <SubIcon className="w-4 h-4" />
                              <span className="text-sm">{item.label}</span>
                              {badge > 0 && (
                                <Badge className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] bg-destructive text-destructive-foreground border-0">
                                  {badge}
                                </Badge>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-xs">
                {client?.first_name?.[0]}{client?.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {client?.first_name} {client?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{client?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/portal">
              <img
                src={elitaLogo}
                alt="Elita Medical Spa"
                className="h-7 w-auto object-contain"
              />
            </Link>
            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <Link to="/portal/messages" className="relative p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-0.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <nav className="border-t border-border mt-3 pt-3 max-h-[70vh] overflow-y-auto -mx-4 px-4 pb-4">
              {CLIENT_NAVIGATION.map((category) => (
                <div key={category.label} className="py-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
                    {category.label}
                  </p>
                  {category.items.map((item) => {
                    const isActive = isItemActive(item.href);
                    const Icon = item.icon;
                    const badge = getBadgeCount(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg my-0.5 transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                        {badge > 0 && (
                          <Badge className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] bg-destructive text-destructive-foreground border-0">
                            {badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
              <div className="border-t border-border mt-3 pt-3">
                <button
                  onClick={() => { setMobileMenuOpen(false); signOut(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 w-full"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </nav>
          )}
        </header>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border px-2 py-2 flex justify-around">
          {CLIENT_MOBILE_NAV.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const badge = getBadgeCount(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px] relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Page Content */}
        <main className="flex-1 overflow-auto lg:pt-0 pt-14 pb-20 lg:pb-0 bg-background">
          <div className="container mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
