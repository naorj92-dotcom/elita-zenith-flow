import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Clock, 
  DollarSign,
  Package,
  Settings,
  ChevronRight,
  Sparkles,
  UserCog,
  FileText,
  Camera,
  Crown,
  Gift,
  ClipboardList,
  Bell,
  Cpu,
  ShoppingCart,
  Receipt,
  BarChart3,
  TrendingUp,
  Target,
  PieChart,
  Briefcase,
  Wrench,
  CreditCard,
  Shield,
  Home,
  CalendarPlus,
  History,
  User,
  Heart,
  Wallet,
  Star,
  BookOpen,
  MessageCircle,
  ClipboardList as ClipboardListIcon,
} from 'lucide-react';
import { AppRole, EmployeeType } from '@/types/roles';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavCategory {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

// Owner Navigation - Full access
export const OWNER_NAVIGATION: NavCategory[] = [
  {
    label: 'Home',
    icon: LayoutDashboard,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    items: [
      { label: 'Business', href: '/analytics?tab=sales', icon: BarChart3 },
      { label: 'Staff Performance', href: '/analytics?tab=staff', icon: Target },
      { label: 'Machine ROI', href: '/analytics?tab=machines', icon: Cpu },
      { label: 'Products', href: '/analytics?tab=products', icon: PieChart },
      { label: 'Expert Insights', href: '/analytics?tab=insights', icon: Sparkles },
    ],
  },
  {
    label: 'Scheduling',
    icon: Calendar,
    items: [
      { label: 'Calendar', href: '/schedule', icon: Calendar },
      { label: 'Waitlist', href: '/waitlist', icon: ClipboardList },
    ],
  },
  {
    label: 'Clients',
    icon: Users,
    items: [
      { label: 'Client List', href: '/clients', icon: Users },
      { label: 'Photos', href: '/photos', icon: Camera },
    ],
  },
  {
    label: 'Messages',
    icon: MessageCircle,
    items: [
      { label: 'Messages', href: '/messages', icon: MessageCircle },
    ],
  },
  {
    label: 'POS',
    icon: ShoppingCart,
    items: [
      { label: 'Checkout', href: '/pos', icon: ShoppingCart },
      { label: 'Receipts', href: '/receipts', icon: Receipt },
    ],
  },
  {
    label: 'Services',
    icon: Sparkles,
    items: [
      { label: 'Services', href: '/services', icon: Sparkles },
      { label: 'Packages', href: '/packages', icon: Package },
      { label: 'Memberships', href: '/memberships', icon: Crown },
      { label: 'Gift Cards', href: '/gift-cards', icon: Gift },
    ],
  },
  {
    label: 'Operations',
    icon: Wrench,
    items: [
      { label: 'Machines', href: '/machines', icon: Cpu },
      { label: 'Inventory', href: '/products', icon: Package },
      { label: 'Forms & Consents', href: '/forms', icon: FileText },
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Exclusive Deals', href: '/deals', icon: Gift },
      { label: 'Aftercare Tips', href: '/aftercare-tips', icon: Heart },
    ],
  },
  {
    label: 'Team',
    icon: Briefcase,
    items: [
      { label: 'Staff', href: '/staff', icon: UserCog },
      { label: 'Time Clock', href: '/timeclock', icon: Clock },
      { label: 'Payroll', href: '/payroll', icon: DollarSign },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    items: [
      { label: 'General', href: '/settings?tab=general', icon: Settings },
      { label: 'Payments', href: '/settings?tab=payments', icon: CreditCard },
      { label: 'Policies', href: '/settings?tab=policies', icon: Shield },
      { label: 'Audit Trail', href: '/audit-log', icon: Shield },
    ],
  },
];

// Employee Navigation - Operational access only
export const EMPLOYEE_NAVIGATION: NavCategory[] = [
  {
    label: 'Home',
    icon: LayoutDashboard,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Schedule',
    icon: Calendar,
    items: [
      { label: 'Calendar', href: '/schedule', icon: Calendar },
    ],
  },
  {
    label: 'Clients',
    icon: Users,
    items: [
      { label: 'Client List', href: '/clients', icon: Users },
      { label: 'Client Packages', href: '/client-packages', icon: Package },
      { label: 'Photos', href: '/photos', icon: Camera },
    ],
  },
  {
    label: 'POS',
    icon: ShoppingCart,
    items: [
      { label: 'Checkout', href: '/pos', icon: ShoppingCart },
    ],
  },
  {
    label: 'Waitlist',
    icon: ClipboardList,
    items: [
      { label: 'Waitlist', href: '/waitlist', icon: ClipboardList },
    ],
  },
  {
    label: 'My Reports',
    icon: TrendingUp,
    items: [
      { label: 'My Reports', href: '/my-reports', icon: TrendingUp },
    ],
  },
  {
    label: 'Time Clock',
    icon: Clock,
    items: [
      { label: 'Time Clock', href: '/timeclock', icon: Clock },
    ],
  },
];

// Front Desk Employee - Additional access
export const FRONT_DESK_ADDITIONAL: NavItem[] = [
  { label: 'Receipts', href: '/receipts', icon: Receipt },
];

// Client Portal Navigation
export const CLIENT_NAVIGATION: NavCategory[] = [
  {
    label: 'Home',
    icon: Home,
    items: [
      { label: 'Dashboard', href: '/portal', icon: Home },
    ],
  },
  {
    label: 'Book',
    icon: CalendarPlus,
    items: [
      { label: 'Book Appointment', href: '/portal/book', icon: CalendarPlus },
      { label: 'Join Waitlist', href: '/portal/waitlist', icon: ClipboardListIcon },
    ],
  },
  {
    label: 'My Appointments',
    icon: Calendar,
    items: [
      { label: 'Upcoming', href: '/portal/appointments', icon: Calendar },
      { label: 'History', href: '/portal/history', icon: History },
    ],
  },
  {
    label: 'My Membership',
    icon: Crown,
    items: [
      { label: 'Membership', href: '/portal/memberships', icon: Crown },
      { label: 'Benefits', href: '/portal/benefits', icon: Star },
    ],
  },
  {
    label: 'My Packages',
    icon: Package,
    items: [
      { label: 'Packages', href: '/portal/packages', icon: Package },
    ],
  },
  {
    label: 'Photos',
    icon: Camera,
    items: [
      { label: 'My Photos', href: '/portal/photos', icon: Camera },
    ],
  },
  {
    label: 'Forms',
    icon: FileText,
    items: [
      { label: 'Forms & Consents', href: '/portal/forms', icon: FileText },
    ],
  },
  {
    label: 'Payments',
    icon: Wallet,
    items: [
      { label: 'Payment History', href: '/portal/payments', icon: Wallet },
      { label: 'Gift Cards', href: '/portal/gift-cards', icon: Gift },
    ],
  },
  {
    label: 'Messages',
    icon: MessageCircle,
    items: [
      { label: 'Chat', href: '/portal/messages', icon: MessageCircle },
    ],
  },
  {
    label: 'Profile',
    icon: User,
    items: [
      { label: 'My Profile', href: '/portal/profile', icon: User },
      { label: 'Recommendations', href: '/portal/recommendations', icon: Heart },
      { label: 'AI Skin Analysis', href: '/portal/skin-analysis', icon: Sparkles },
      { label: 'Refer a Friend', href: '/portal', icon: Gift },
      { label: 'Reviews', href: '/portal/reviews', icon: Star },
      { label: 'Family', href: '/portal/family', icon: Users },
      { label: 'Rewards Store', href: '/portal/rewards', icon: Gift },
    ],
  },
];

// Mobile navigation shortcuts
export const OWNER_MOBILE_NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', href: '/schedule', icon: Calendar },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'POS', href: '/pos', icon: ShoppingCart },
  { label: 'Reports', href: '/analytics', icon: BarChart3 },
];

export const EMPLOYEE_MOBILE_NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', href: '/schedule', icon: Calendar },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'POS', href: '/pos', icon: ShoppingCart },
  { label: 'Clock', href: '/timeclock', icon: Clock },
];

export const CLIENT_MOBILE_NAV: NavItem[] = [
  { label: 'Home', href: '/portal', icon: Home },
  { label: 'Book', href: '/portal/book', icon: CalendarPlus },
  { label: 'Appointments', href: '/portal/appointments', icon: Calendar },
  { label: 'Membership', href: '/portal/memberships', icon: Crown },
  { label: 'Profile', href: '/portal/profile', icon: User },
];

// Get navigation for role
export function getNavigationForRole(role: AppRole | null, employeeType?: EmployeeType | null): NavCategory[] {
  if (!role) return [];
  
  switch (role) {
    case 'owner':
      return OWNER_NAVIGATION;
    case 'employee':
      // Add front desk specific items
      if (employeeType === 'front_desk') {
        const nav = [...EMPLOYEE_NAVIGATION];
        const posCategory = nav.find(c => c.label === 'POS');
        if (posCategory) {
          posCategory.items = [...posCategory.items, ...FRONT_DESK_ADDITIONAL];
        }
        return nav;
      }
      return EMPLOYEE_NAVIGATION;
    case 'client':
      return CLIENT_NAVIGATION;
    default:
      return [];
  }
}

// Get mobile nav for role
export function getMobileNavForRole(role: AppRole | null): NavItem[] {
  if (!role) return [];
  
  switch (role) {
    case 'owner':
      return OWNER_MOBILE_NAV;
    case 'employee':
      return EMPLOYEE_MOBILE_NAV;
    case 'client':
      return CLIENT_MOBILE_NAV;
    default:
      return [];
  }
}
