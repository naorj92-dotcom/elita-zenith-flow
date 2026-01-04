// Elita MedSpa - Core Type Definitions
// Matches database schema

// Re-export role types for convenience  
export * from './roles';


// Staff & Authentication
export interface Staff {
  id: string;
  pin: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  avatar_url: string | null;
  is_active: boolean;
  hire_date: string;
  hourly_rate: number;
  service_commission_tier1: number;
  service_commission_tier2: number;
  service_commission_tier3: number;
  service_tier1_threshold: number;
  service_tier2_threshold: number;
  retail_commission_rate: number;
  created_at: string;
  updated_at: string;
}

export type StaffRole = 'admin' | 'provider' | 'front_desk';

export interface StaffWithStatus extends Staff {
  is_clocked_in: boolean;
  clock_in_time?: string;
  today_hours?: number;
}

// Time Clock
export interface TimeClock {
  id: string;
  staff_id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  notes: string | null;
  created_at: string;
}

export interface ClockStatus {
  is_clocked_in: boolean;
  clock_entry?: TimeClock;
}

// Clients
export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  avatar_url: string | null;
  is_vip: boolean;
  total_spent: number;
  visit_count: number;
  last_visit_date: string | null;
  created_at: string;
  updated_at: string;
}

// Services
export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  requires_consent: boolean;
  created_at: string;
  updated_at: string;
}

// Rooms
export interface Room {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

// Appointments
export interface Appointment {
  id: string;
  client_id: string | null;
  staff_id: string | null;
  service_id: string | null;
  room_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'checked_in' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show';

export interface AppointmentWithDetails extends Appointment {
  client?: Client;
  staff?: Staff;
  service?: Service;
  room?: Room;
}

// Transactions & Commissions
export interface Transaction {
  id: string;
  appointment_id: string | null;
  staff_id: string | null;
  client_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  commission_rate: number | null;
  commission_amount: number | null;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

export type TransactionType = 'service' | 'retail' | 'refund';

// Payroll Summary
export interface PayrollSummary {
  staff_id: string;
  staff_name: string;
  staff_role: StaffRole;
  hourly_rate: number;
  hours_worked: number;
  base_pay: number;
  service_sales: number;
  service_commission: number;
  retail_sales: number;
  retail_commission: number;
  tips: number;
  total_sales: number;
  total_earnings: number;
  service_count: number;
  retail_count: number;
  current_tier: number;
}

// Performance Dashboard
export interface PerformanceMetrics {
  hours: {
    today_hours: number;
    week_hours: number;
    total_hours: number;
  };
  sales: {
    today_sales: number;
    week_sales: number;
    month_sales: number;
  };
  commissions: {
    today_commission: number;
    week_commission: number;
    month_commission: number;
  };
  appointments: {
    today_count: number;
    week_count: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
