// Receipt data types for POS system

export interface RetailItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface TreatmentSummary {
  areaTreated?: string;
  intensity?: string;
  duration?: string;
  notes?: string;
  machineSettings?: string;
}

export interface PackageStatus {
  packageName: string;
  sessionsRemaining: number;
  sessionsTotal: number;
}

export interface MembershipStatus {
  tierName: string;
  nextBillingDate: string;
}

export interface ReceiptData {
  id: string;
  receiptNumber: string;
  transactionId?: string;
  appointmentId?: string;
  
  // Client info
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  
  // Provider info
  staffId?: string;
  providerName: string;
  
  // Service details
  serviceName?: string;
  servicePrice: number;
  machineUsed?: string;
  treatmentSummary?: TreatmentSummary;
  
  // Retail items
  retailItems: RetailItem[];
  retailTotal: number;
  
  // Financial
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  tipAmount: number;
  discountAmount: number;
  totalAmount: number;
  
  // Payment
  paymentMethod: 'card' | 'cash' | 'gift_card' | 'split';
  
  // Meta
  receiptFormat: 'thermal' | 'standard';
  googleReviewUrl: string;
  notes?: string;
  createdAt: Date;
  
  // Package & Membership Status
  packageStatus?: PackageStatus;
  membershipStatus?: MembershipStatus;
  nextRecommendedBooking?: string;
}

export interface BusinessInfo {
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  googleReviewUrl: string;
}

export const ELITE_MEDSPA_INFO: BusinessInfo = {
  name: 'Elite MedSpa',
  tagline: 'Elevate Your Beauty',
  address: '123 Luxury Lane, Suite 100',
  city: 'Beverly Hills',
  state: 'CA',
  zip: '90210',
  phone: '(310) 555-0123',
  email: 'info@elitemedspa.com',
  website: 'www.elitemedspa.com',
  googleReviewUrl: 'https://g.page/r/elite-medspa/review',
};

export function generateReceiptNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EMS-${year}${month}${day}-${random}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
