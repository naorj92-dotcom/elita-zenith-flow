import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { 
  getNavigationForRole, 
  getMobileNavForRole,
  NavCategory,
  NavItem 
} from '@/config/navigation';

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
    loginWithPin 
  } = useUnifiedAuth();
  
  // Get navigation based on role
  const navigation = useMemo(() => 
    getNavigationForRole(role, employeeType), 
    [role, employeeType]
  );
  
  const mobileNavItems = useMemo(() => 
    getMobileNavForRole(role), 
    [role]
  );

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    // Auto-expand category containing current route
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

  // Role display text
  const getRoleDisplay = () => {
    if (isOwner) return 'Owner';
    if (role === 'employee') {
      return employeeType === 'front_desk' ? 'Front Desk' : 'Provider';
    }
    if (role === 'client') return 'Client';
    // Legacy staff role display
    return staff?.role?.replace('_', ' ') || 'Staff';
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link to={role === 'client' ? '/portal' : '/dashboard'} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-xl text-sidebar-foreground">Elita</h1>
              <p className="text-xs text-muted-foreground">MedSpa OS</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                    itemActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-luxury-sm" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-transform group-hover:scale-110",
                    itemActive ? "" : "text-muted-foreground"
                  )} />
                  <span className="font-medium text-sm">{category.label}</span>
                </Link>
              );
            }

            // Multi-item categories are expandable
            return (
              <div key={category.label}>
                <button
                  onClick={() => toggleCategory(category.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                    isActive
                      ? "bg-sidebar-primary/50 text-sidebar-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-transform group-hover:scale-110",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="font-medium text-sm">{category.label}</span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-auto"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pt-1 space-y-1">
                        {visibleItems.map((item) => {
                          const SubIcon = item.icon;
                          const itemActive = isItemActive(item.href);
                          
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 group",
                                itemActive
                                  ? "bg-sidebar-accent text-sidebar-foreground"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                              )}
                            >
                              <SubIcon className={cn(
                                "w-4 h-4",
                                itemActive ? "text-primary" : "text-muted-foreground"
                              )} />
                              <span className="text-sm">{item.label}</span>
                              {itemActive && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary ml-auto" />
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
        <div className="p-4 border-t border-sidebar-border">
          {/* Clock Status - Only show for employees/owners */}
          {(role === 'owner' || role === 'employee') && clockStatus && (
            <div className={cn(
              "mb-4 px-4 py-3 rounded-lg text-sm",
              clockStatus.is_clocked_in 
                ? "bg-success/10 text-success border border-success/20"
                : "bg-muted text-muted-foreground"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  clockStatus.is_clocked_in ? "bg-success animate-pulse" : "bg-muted-foreground"
                )} />
                <span className="font-medium">
                  {clockStatus.is_clocked_in ? 'Clocked In' : 'Clocked Out'}
                </span>
              </div>
              {clockStatus.is_clocked_in && clockStatus.clock_entry && (
                <p className="mt-1 text-xs opacity-80">
                  Since {new Date(clockStatus.clock_entry.clock_in).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              )}
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">
                {staff?.first_name?.[0]}{staff?.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-sidebar-foreground truncate">
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

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to={role === 'client' ? '/portal' : '/dashboard'} className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-heading text-lg">Elita</span>
          </Link>
          <div className="flex items-center gap-2">
            {clockStatus?.is_clocked_in && (
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-2 py-2 flex justify-around">
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
