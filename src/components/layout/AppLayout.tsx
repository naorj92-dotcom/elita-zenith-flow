import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut,
  ChevronDown,
  Search,
  Plus,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { 
  getNavigationForRole, 
  getMobileNavForRole,
  NavCategory,
} from '@/config/navigation';
import { Button } from '@/components/ui/button';
import elitaLogo from '@/assets/elita-logo.png';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { 
    staff, 
    role, 
    employeeType, 
    isOwner, 
    clockStatus, 
    signOut,
  } = useUnifiedAuth();
  
  const navigation = useMemo(() => 
    getNavigationForRole(role, employeeType), 
    [role, employeeType]
  );
  
  const mobileNavItems = useMemo(() => 
    getMobileNavForRole(role), 
    [role]
  );

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const current = new Set<string>();
    navigation.forEach(cat => {
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
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isItemActive = (href: string): boolean => {
    const basePath = href.split('?')[0];
    const currentPath = location.pathname;
    
    if (href.includes('?')) {
      return location.pathname + location.search === href;
    }
    
    return currentPath === basePath || currentPath.startsWith(basePath + '/');
  };

  const isCategoryActive = (category: NavCategory): boolean => {
    return category.items.some(item => isItemActive(item.href));
  };

  const handleLogout = async () => {
    await signOut();
  };

  const getRoleDisplay = () => {
    if (isOwner) return 'Owner';
    if (role === 'employee') {
      return employeeType === 'front_desk' ? 'Front Desk' : 'Provider';
    }
    if (role === 'client') return 'Client';
    return staff?.role?.replace('_', ' ') || 'Staff';
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Clean, minimal, no visual noise */}
      <aside className="hidden md:flex flex-col w-60 bg-card border-r border-border">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <Link to={role === 'client' ? '/portal' : '/dashboard'} className="block">
            <img 
              src={elitaLogo} 
              alt="Elita Medical Spa" 
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Navigation - Grouped sections */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navigation.map((category) => {
            const isExpanded = expandedCategories.has(category.label);
            const isActive = isCategoryActive(category);
            const Icon = category.icon;
            const visibleItems = category.items;

            // Single item categories render directly
            if (visibleItems.length === 1) {
              const item = visibleItems[0];
              const ItemIcon = item.icon;
              const itemActive = isItemActive(item.href);

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
                </Link>
              );
            }

            // Multi-item categories are expandable
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
                        {visibleItems.map((item) => {
                          const SubIcon = item.icon;
                          const itemActive = isItemActive(item.href);
                          
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
          {/* Clock Status */}
          {(role === 'owner' || role === 'employee') && clockStatus && (
            <div className={cn(
              "mb-3 px-3 py-2.5 rounded-lg text-sm",
              clockStatus.is_clocked_in 
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  clockStatus.is_clocked_in ? "bg-success" : "bg-muted-foreground"
                )} />
                <span className="font-medium text-xs">
                  {clockStatus.is_clocked_in ? 'On Shift' : 'Off Shift'}
                </span>
              </div>
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-xs">
                {staff?.first_name?.[0]}{staff?.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {staff?.first_name} {staff?.last_name}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {getRoleDisplay()}
              </p>
            </div>
            <button
              onClick={handleLogout}
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
        {/* Top Bar - Global search, quick actions, user menu */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 bg-card border-b border-border">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg w-72">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search clients, appointments..." 
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/schedule/new" className="gap-2">
                <Plus className="w-4 h-4" />
                New Appointment
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/pos" className="gap-2">
                <CreditCard className="w-4 h-4" />
                Checkout
              </Link>
            </Button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to={role === 'client' ? '/portal' : '/dashboard'}>
              <img 
                src={elitaLogo} 
                alt="Elita" 
                className="h-7 w-auto object-contain"
              />
            </Link>
            <div className="flex items-center gap-3">
              {clockStatus?.is_clocked_in && (
                <div className="w-2 h-2 rounded-full bg-success" />
              )}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border px-2 py-2 flex justify-around">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
                            location.pathname.startsWith(item.href + '/');
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

        {/* Page Content */}
        <main className="flex-1 overflow-auto md:pt-0 pt-14 pb-20 md:pb-0 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
