import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Clock, 
  DollarSign,
  Package,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  UserCog,
  FileText,
  Camera,
  Crown,
  Gift,
  ClipboardList,
  Bell,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', href: '/schedule', icon: Calendar },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Time Clock', href: '/timeclock', icon: Clock },
  { label: 'Payroll', href: '/payroll', icon: DollarSign, roles: ['admin', 'manager'] },
  { label: 'Waitlist', href: '/waitlist', icon: ClipboardList, roles: ['admin', 'front_desk'] },
  { label: 'Photos', href: '/photos', icon: Camera, roles: ['admin', 'provider'] },
  { label: 'Forms', href: '/forms', icon: FileText, roles: ['admin'] },
  { label: 'Services', href: '/services', icon: Sparkles, roles: ['admin'] },
  { label: 'Machines', href: '/machines', icon: Cpu, roles: ['admin'] },
  { label: 'Products', href: '/products', icon: Package, roles: ['admin'] },
  { label: 'Memberships', href: '/memberships', icon: Crown, roles: ['admin'] },
  { label: 'Gift Cards', href: '/gift-cards', icon: Gift, roles: ['admin'] },
  { label: 'Notifications', href: '/notifications', icon: Bell, roles: ['admin'] },
  { label: 'Staff', href: '/admin/staff', icon: UserCog, roles: ['admin'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { staff, logout, clockStatus } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return staff && item.roles.includes(staff.role);
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-xl text-sidebar-foreground">Elita</h1>
              <p className="text-xs text-muted-foreground">MedSpa</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {filteredNavItems.map((item, index) => {
            const isActive = location.pathname === item.href || 
                           location.pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-luxury-sm" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-transform group-hover:scale-110",
                    isActive ? "" : "text-muted-foreground"
                  )} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          {/* Clock Status */}
          {clockStatus && (
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
                {staff?.role?.replace('_', ' ')}
              </p>
            </div>
            <button
              onClick={logout}
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
          <Link to="/dashboard" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-heading text-lg">Elita</span>
          </Link>
          <div className="flex items-center gap-2">
            {clockStatus?.is_clocked_in && (
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            )}
            <button
              onClick={logout}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-2 py-2 flex justify-around">
        {filteredNavItems.slice(0, 5).map((item) => {
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
