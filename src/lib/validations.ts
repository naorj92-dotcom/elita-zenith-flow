import { z } from 'zod';

// ============================================
// Common Validation Utilities
// ============================================

const sanitizeString = (val: string) => val.trim();

// Common field schemas
export const uuidSchema = z.string().uuid('Invalid ID format');
export const emailSchema = z.string().email('Invalid email address').max(255);
export const phoneSchema = z.string().max(20).optional().nullable();
export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name is too long').transform(sanitizeString);
export const descriptionSchema = z.string().max(1000, 'Description is too long').optional().nullable();
export const notesSchema = z.string().max(2000, 'Notes are too long').optional().nullable();
export const urlSchema = z.string().url('Invalid URL').max(2000).optional().nullable();
export const priceSchema = z.number().min(0, 'Price must be positive').max(999999.99, 'Price is too high');
export const percentageSchema = z.number().min(0, 'Must be at least 0').max(100, 'Cannot exceed 100%');
export const quantitySchema = z.number().int('Must be a whole number').min(0, 'Cannot be negative').max(99999);

// ============================================
// Staff & Auth Schemas
// ============================================

export const staffSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema.optional().nullable(),
  phone: phoneSchema,
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'PIN must be numeric'),
  role: z.enum(['admin', 'provider', 'front_desk']),
  hourly_rate: priceSchema.optional().nullable(),
  service_commission_tier1: percentageSchema.optional().nullable(),
  service_commission_tier2: percentageSchema.optional().nullable(),
  service_commission_tier3: percentageSchema.optional().nullable(),
  service_tier1_threshold: priceSchema.optional().nullable(),
  service_tier2_threshold: priceSchema.optional().nullable(),
  retail_commission_rate: percentageSchema.optional().nullable(),
  is_active: z.boolean(),
});

export type StaffInput = z.infer<typeof staffSchema>;

// ============================================
// Client Schemas
// ============================================

export const clientSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema.optional().nullable(),
  phone: phoneSchema,
  date_of_birth: z.string().optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  notes: notesSchema,
  is_vip: z.boolean().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

// ============================================
// Service Schemas
// ============================================

export const serviceSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  category: z.string().min(1, 'Category is required').max(100),
  duration_minutes: z.number().int().min(5, 'Minimum 5 minutes').max(480, 'Maximum 8 hours'),
  price: priceSchema,
  is_active: z.boolean(),
  requires_consent: z.boolean(),
  machine_type_id: uuidSchema.optional().nullable(),
  recovery_buffer_minutes: z.number().int().min(0).max(120).optional(),
  aftercare_template_id: uuidSchema.optional().nullable(),
  required_room_type: z.string().max(100).optional().nullable(),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

// ============================================
// Product Schemas
// ============================================

export const productSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  category: z.string().min(1, 'Category is required').max(100),
  sku: z.string().max(50).optional().nullable(),
  price: priceSchema,
  cost: priceSchema,
  quantity_in_stock: quantitySchema,
  reorder_level: quantitySchema,
  is_active: z.boolean(),
  image_url: urlSchema,
});

export type ProductInput = z.infer<typeof productSchema>;

// ============================================
// Machine Schemas
// ============================================

export const machineSchema = z.object({
  name: nameSchema,
  machine_type: z.string().min(1, 'Machine type is required').max(100),
  status: z.enum(['active', 'inactive', 'maintenance']),
  quantity: z.number().int().min(1, 'Must have at least 1').max(100),
});

export type MachineInput = z.infer<typeof machineSchema>;

// ============================================
// Membership Schemas
// ============================================

export const membershipSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  price: priceSchema,
  billing_period: z.enum(['monthly', 'quarterly', 'annual']),
  monthly_service_credits: z.number().int().min(0).max(1000),
  retail_discount_percent: percentageSchema.optional().nullable(),
  priority_booking: z.boolean().optional(),
  benefits: z.array(z.string().max(200)).max(20),
  is_active: z.boolean(),
});

export type MembershipInput = z.infer<typeof membershipSchema>;

// ============================================
// Package Schemas
// ============================================

export const packageSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  price: priceSchema,
  total_sessions: z.number().int().min(1, 'Must have at least 1 session').max(1000),
  is_active: z.boolean(),
  services: z.array(z.object({
    service_id: uuidSchema,
    sessions: z.number().int().min(1).max(100),
  })).optional(),
});

export type PackageInput = z.infer<typeof packageSchema>;

// ============================================
// Gift Card Schemas
// ============================================

export const giftCardSchema = z.object({
  initial_amount: z.number().min(5, 'Minimum $5').max(10000, 'Maximum $10,000'),
  purchaser_name: z.string().max(100).optional().nullable(),
  purchaser_email: emailSchema.optional().nullable(),
  recipient_name: z.string().max(100).optional().nullable(),
  recipient_email: emailSchema.optional().nullable(),
  message: z.string().max(500, 'Message is too long').optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

export type GiftCardInput = z.infer<typeof giftCardSchema>;

// ============================================
// Form Template Schemas
// ============================================

export const formFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
  type: z.enum(['text', 'textarea', 'select', 'checkbox', 'date', 'email', 'phone', 'number']),
  required: z.boolean().optional(),
  options: z.array(z.string().max(200)).max(50).optional(),
  placeholder: z.string().max(200).optional(),
});

export const formTemplateSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  form_type: z.enum(['intake', 'consent', 'contract', 'custom']),
  fields: z.array(formFieldSchema).max(100, 'Maximum 100 fields'),
  requires_signature: z.boolean(),
  is_active: z.boolean(),
});

export type FormTemplateInput = z.infer<typeof formTemplateSchema>;

// ============================================
// Notification Template Schemas
// ============================================

export const notificationTemplateSchema = z.object({
  name: nameSchema,
  type: z.enum(['email', 'sms']),
  category: z.string().min(1, 'Category is required').max(100),
  subject: z.string().max(200, 'Subject is too long').optional().nullable(),
  body: z.string().min(1, 'Body is required').max(5000, 'Body is too long'),
  variables: z.array(z.string().max(50)).max(50).optional(),
  is_active: z.boolean(),
});

export type NotificationTemplateInput = z.infer<typeof notificationTemplateSchema>;

// ============================================
// Transaction & POS Schemas
// ============================================

export const transactionSchema = z.object({
  client_id: uuidSchema,
  staff_id: uuidSchema,
  transaction_type: z.enum(['service', 'retail', 'refund']),
  amount: z.number().min(-99999.99).max(999999.99),
  description: z.string().max(500).optional().nullable(),
  appointment_id: uuidSchema.optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const receiptSchema = z.object({
  receipt_number: z.string().min(1).max(50),
  client_id: uuidSchema,
  staff_id: uuidSchema,
  service_name: z.string().max(200).optional().nullable(),
  service_price: priceSchema,
  machine_used: z.string().max(100).optional().nullable(),
  treatment_summary: z.record(z.string().max(500)).optional(),
  retail_items: z.array(z.object({
    id: z.string(),
    name: z.string().max(200),
    quantity: z.number().int().min(1).max(100),
    price: priceSchema,
    total: priceSchema,
  })).max(50).optional(),
  retail_total: priceSchema,
  subtotal: priceSchema,
  tax_rate: percentageSchema,
  tax_amount: priceSchema,
  tip_amount: priceSchema,
  discount_amount: priceSchema,
  total_amount: priceSchema,
  payment_method: z.enum(['card', 'cash', 'gift_card', 'split']),
  google_review_url: urlSchema,
});

export type ReceiptInput = z.infer<typeof receiptSchema>;

// ============================================
// Appointment Schemas
// ============================================

export const appointmentSchema = z.object({
  client_id: uuidSchema,
  service_id: uuidSchema,
  staff_id: uuidSchema,
  scheduled_at: z.string().datetime('Invalid date format'),
  duration_minutes: z.number().int().min(5).max(480),
  total_amount: priceSchema,
  status: z.enum(['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show']),
  notes: notesSchema,
  room_id: uuidSchema.optional().nullable(),
  machine_id: uuidSchema.optional().nullable(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

// ============================================
// Photo Upload Schemas
// ============================================

export const photoUploadSchema = z.object({
  client_id: uuidSchema,
  service_id: uuidSchema.optional().nullable(),
  appointment_id: uuidSchema.optional().nullable(),
  before_photo_url: z.string().max(500).optional().nullable(),
  after_photo_url: z.string().max(500).optional().nullable(),
  notes: notesSchema,
  is_visible_to_client: z.boolean(),
});

export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;

// File validation helper
export const validateFile = (
  file: File,
  options: {
    allowedTypes?: string[];
    maxSizeMB?: number;
  } = {}
): { valid: boolean; error?: string; safeName: string } => {
  const { allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], maxSizeMB = 10 } = options;
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
      safeName: '' 
    };
  }
  
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
      safeName: '' 
    };
  }
  
  // Sanitize filename - remove special characters
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();
  
  return { valid: true, safeName };
};

// ============================================
// Waitlist Schemas
// ============================================

export const waitlistSchema = z.object({
  client_id: uuidSchema,
  service_id: uuidSchema.optional().nullable(),
  preferred_staff_id: uuidSchema.optional().nullable(),
  preferred_date: z.string().optional().nullable(),
  preferred_time_range: z.string().max(100).optional().nullable(),
  notes: notesSchema,
  status: z.enum(['waiting', 'contacted', 'booked', 'cancelled']).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

// ============================================
// Staff Goals Schemas
// ============================================

export const staffGoalSchema = z.object({
  staff_id: uuidSchema,
  goal_date: z.string(),
  daily_sales_goal: z.number().min(0).max(1000000),
  goal_achieved: z.boolean().optional(),
  bonus_commission_rate: percentageSchema.optional().nullable(),
});

export type StaffGoalInput = z.infer<typeof staffGoalSchema>;

// ============================================
// Client Form Submission Schemas
// ============================================

export const clientFormSubmissionSchema = z.object({
  responses: z.record(z.unknown()).optional(),
  signature_data: z.string().max(100000, 'Signature data too large').optional().nullable(),
  signed_at: z.string().datetime().optional().nullable(),
  status: z.enum(['draft', 'pending', 'completed', 'expired']),
});

export type ClientFormSubmissionInput = z.infer<typeof clientFormSubmissionSchema>;

// ============================================
// Validation Helper Function
// ============================================

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Return the first error message
  const firstError = result.error.errors[0];
  const fieldPath = firstError.path.join('.');
  const message = fieldPath ? `${fieldPath}: ${firstError.message}` : firstError.message;
  
  return { success: false, error: message };
}
