import React, { useState, useMemo } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ClientNotificationBell } from '@/components/portal/ClientNotificationBell';
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
    onTimeout: () => { toast.warning('Session expired due to inactivity'); signOut(); },
    enabled: isAuthenticated,
  });

  const { data: pendingFormsCount = 0 } = useQuery({
    queryKey: ['client-pending-forms-badge', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { count } = await supabase.from('client_forms').select('*', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'pending');
      return count || 0;
    },
    enabled: !!client?.id && isAuthenticated, refetchInterval: 30000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['client-unread-messages', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('client_id', client.id).eq('is_read', false);
      return count || 0;
    },
    enabled: !!client?.id && isAuthenticated, refetchInterval: 15000,
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const current = new Set<string>();
    CLIENT_NAVIGATION.forEach(cat => {
      if (cat.items.some(item => location.pathname === item.href || location.pathname.startsWith(item.href.split('?')[0] + '/'))) {
        current.add(cat.label);
      }
    });
    return current;
  });

  const toggleCategory = (label: string) => {
    setExpandedCategories(prev => { const next = new Set(prev); if (next.has(label)) next.delete(label); else next.add(label); return next; });
  };

  const isItemActive = (href: string): boolean => {
    const basePath = href.split('?')[0];
    if (href.includes('?')) return location.pathname + location.search === href;
    if (href === '/portal') return location.pathname === '/portal';
    return location.pathname === basePath || location.pathname.startsWith(basePath + '/');
  };

  const isCategoryActive = (category: NavCategory): boolean => category.items.some(item => isItemActive(item.href));

  const getBadgeCount = (href: string): number => {
    if (href === '/portal/forms') return pendingFormsCount;
    if (href === '/portal/messages') return unreadCount;
    return 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-elita-camel" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/portal/auth" replace />;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-sidebar border-r border-sidebar-border">
        <div className="p-4 pb-3 border-b border-sidebar-border flex justify-center">
          <Link to="/portal"><img src={elitaLogo} alt="Elita Medical Spa" className="h-12 w-auto object-contain" /></Link>
        </div>

        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {CLIENT_NAVIGATION.map((category) => {
            const isExpanded = expandedCategories.has(category.label);
            const isActive = isCategoryActive(category);
            const Icon = category.icon;

            if (category.items.length === 1) {
              const item = category.items[0];
              const itemActive = isItemActive(item.href);
              const badge = getBadgeCount(item.href);
              return (
                <Link key={category.label} to={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-sm",
                    itemActive ? "bg-elita-camel/12 text-elita-camel font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}>
                  <Icon className={cn("w-4 h-4", itemActive ? "text-elita-camel" : "text-muted-foreground")} />
                  <span>{category.label}</span>
                  {badge > 0 && (
                    <Badge className="ml-auto h-4.5 min-w-[18px] px-1 text-[9px] bg-destructive text-destructive-foreground border-0">{badge}</Badge>
                  )}
                </Link>
              );
            }

            return (
              <div key={category.label}>
                <button onClick={() => toggleCategory(category.label)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-sm",
                    isActive ? "bg-sidebar-accent text-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}>
                  <Icon className={cn("w-4 h-4", isActive ? "text-elita-camel" : "text-muted-foreground")} />
                  <span>{category.label}</span>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }} className="ml-auto">
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                      <div className="pl-3 pt-0.5 space-y-0.5">
                        {category.items.map((item) => {
                          const SubIcon = item.icon;
                          const itemActive = isItemActive(item.href);
                          const badge = getBadgeCount(item.href);
                          return (
                            <Link key={item.href} to={item.href}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150 text-sm",
                                itemActive ? "bg-elita-camel/10 text-elita-camel font-medium" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                              )}>
                              <SubIcon className="w-3.5 h-3.5" />
                              <span>{item.label}</span>
                              {badge > 0 && (
                                <Badge className="ml-auto h-4.5 min-w-[18px] px-1 text-[9px] bg-destructive text-destructive-foreground border-0">{badge}</Badge>
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

        {/* User */}
        <div className="p-2.5 border-t border-sidebar-border">
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-elita-camel/10 flex items-center justify-center">
              <span className="text-elita-camel font-semibold text-[11px]">{client?.first_name?.[0]}{client?.last_name?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{client?.first_name} {client?.last_name}</p>
            </div>
            <button onClick={signOut} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Sign Out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-2.5">
          <div className="flex items-center justify-between">
            <Link to="/portal"><img src={elitaLogo} alt="Elita Medical Spa" className="h-7 w-auto object-contain" /></Link>
            <div className="flex items-center gap-0.5">
              <ThemeToggle compact />
              <ClientNotificationBell />
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground">
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="border-t border-border mt-2.5 pt-2.5 max-h-[70vh] overflow-y-auto -mx-4 px-4 pb-4">
              {CLIENT_NAVIGATION.map((category) => (
                <div key={category.label} className="py-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1">{category.label}</p>
                  {category.items.map((item) => {
                    const isActive = isItemActive(item.href);
                    const Icon = item.icon;
                    const badge = getBadgeCount(item.href);
                    return (
                      <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)}
                        className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg my-0.5 transition-colors text-sm", isActive ? "bg-elita-camel/10 text-elita-camel font-medium" : "text-foreground hover:bg-accent")}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {badge > 0 && (<Badge className="ml-auto h-4 min-w-[16px] px-1 text-[9px] bg-destructive text-destructive-foreground border-0">{badge}</Badge>)}
                      </Link>
                    );
                  })}
                </div>
              ))}
              <div className="border-t border-border mt-2 pt-2">
                <button onClick={() => { setMobileMenuOpen(false); signOut(); }} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 w-full text-sm">
                  <LogOut className="h-4 w-4" /><span className="font-medium">Sign Out</span>
                </button>
              </div>
            </nav>
          )}
        </header>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1.5 flex justify-around">
          {CLIENT_MOBILE_NAV.map((item) => {
            const isActive = item.href === '/portal'
              ? location.pathname === '/portal'
              : location.pathname.startsWith(item.href);
            const Icon = item.icon;
            const badge = getBadgeCount(item.href);
            return (
              <Link key={item.href} to={item.href}
                className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] relative", isActive ? "text-elita-camel" : "text-muted-foreground")}>
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-2 h-3.5 min-w-[14px] px-0.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">{badge}</span>
                  )}
                </div>
                <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Page Content */}
        <main className="flex-1 overflow-auto md:pt-0 pt-12 pb-16 md:pb-0 bg-background">
          <div className="container mx-auto px-4 py-5 md:py-6">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
