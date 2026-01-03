// Elita MedSpa - Core Type Definitions

// Staff & Authentication
export interface Staff {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  pin: string;
  hourly_base_pay: number;
  active: boolean;
  avatar_url?: string;
  created_at: string;
}

export type StaffRole = 'admin' | 'provider' | 'esthetician' | 'receptionist' | 'manager';

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
  clock_out?: string;
  total_hours?: number;
  created_at: string;
}

export interface ClockStatus {
  is_clocked_in: boolean;
  clock_entry?: TimeClock;
}

// Clients
export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

// Services
export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description?: string;
  price: number;
  cost?: number;
  duration_minutes: number;
  commission_rate: number;
  active: boolean;
  created_at: string;
}

export type ServiceCategory = 
  | 'injectables' 
  | 'facials' 
  | 'body' 
  | 'laser' 
  | 'wellness' 
  | 'consultation';

// Appointments
export interface Appointment {
  id: string;
  client_id: string;
  staff_id: string;
  service_id: string;
  room_id?: string;
  date: string;
  start_time: string;
  end_time?: string;
  status: AppointmentStatus;
  notes?: string;
  consent_signed: boolean;
  intake_completed: boolean;
  created_at: string;
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
  client_name: string;
  client_email?: string;
  client_phone?: string;
  staff_name: string;
  service_name: string;
  service_price: number;
  service_category?: ServiceCategory;
  duration_minutes: number;
  room_name?: string;
}

// Rooms
export interface Room {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

// Transactions & Commissions
export interface Transaction {
  id: string;
  staff_id: string;
  client_id?: string;
  appointment_id?: string;
  transaction_type: TransactionType;
  service_id?: string;
  retail_product_id?: string;
  amount: number;
  cost?: number;
  commission_amount: number;
  tip_amount?: number;
  created_at: string;
}

export type TransactionType = 'service' | 'retail' | 'tip';

// Commission Tiers
export interface CommissionTier {
  id: string;
  role: StaffRole;
  tier_name: string;
  min_monthly_sales: number;
  max_monthly_sales?: number;
  service_commission_rate: number;
  retail_commission_rate: number;
  created_at: string;
}

// Payroll
export interface PayrollSummary {
  staff_id: string;
  staff_name: string;
  staff_role: StaffRole;
  hourly_base_pay: number;
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
}

export interface PayrollReport {
  period: {
    start_date: string;
    end_date: string;
  };
  staff: PayrollSummary[];
  totals: {
    total_hours: number;
    total_base_pay: number;
    total_service_sales: number;
    total_service_commission: number;
    total_retail_sales: number;
    total_retail_commission: number;
    total_tips: number;
    total_earnings: number;
  };
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
    total_sales: number;
  };
  commissions: {
    today_commission: number;
    week_commission: number;
    month_commission: number;
    total_commission: number;
  };
  appointments: {
    today_count: number;
    week_count: number;
    upcoming: AppointmentWithDetails[];
  };
  current_tier?: CommissionTier;
  next_tier?: CommissionTier;
  sales_to_next_tier?: number;
}

// Retail Products
export interface RetailProduct {
  id: string;
  name: string;
  sku?: string;
  category: string;
  price: number;
  cost: number;
  retail_commission_rate: number;
  stock_quantity: number;
  active: boolean;
  created_at: string;
}

// Treatment Plans
export interface TreatmentPlan {
  id: string;
  client_id: string;
  staff_id: string;
  title: string;
  description?: string;
  goals?: string;
  recommended_treatments?: string;
  notes?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

// Before/After Photos
export interface BeforeAfterPhoto {
  id: string;
  client_id: string;
  treatment_plan_id?: string;
  photo_type: 'before' | 'after' | 'progress';
  photo_url: string;
  notes?: string;
  taken_at: string;
  created_at: string;
}

// Consent Forms
export interface ConsentForm {
  id: string;
  client_id: string;
  appointment_id?: string;
  form_type: string;
  signature_data: string;
  signed_at: string;
  created_at: string;
}

// Intake Forms
export interface IntakeForm {
  id: string;
  client_id: string;
  appointment_id?: string;
  medical_history?: Record<string, unknown>;
  allergies?: string;
  medications?: string;
  skin_concerns?: string;
  completed_at: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
