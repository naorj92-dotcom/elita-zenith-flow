// Demo data for client portal
import { addDays, subDays, format } from 'date-fns';

export const DEMO_PACKAGES = [
  {
    id: 'demo-pkg-1',
    client_id: 'demo-client-id',
    package_id: 'demo-pkg-def-1',
    sessions_used: 3,
    sessions_total: 6,
    purchase_date: subDays(new Date(), 60).toISOString(),
    expiry_date: addDays(new Date(), 120).toISOString(),
    status: 'active',
    notes: null,
    created_at: subDays(new Date(), 60).toISOString(),
    packages: {
      id: 'demo-pkg-def-1',
      name: 'HydraFacial Series',
      description: 'Deep cleansing and hydration treatment series',
      total_sessions: 6,
      price: 750,
    },
  },
  {
    id: 'demo-pkg-2',
    client_id: 'demo-client-id',
    package_id: 'demo-pkg-def-2',
    sessions_used: 1,
    sessions_total: 4,
    purchase_date: subDays(new Date(), 30).toISOString(),
    expiry_date: addDays(new Date(), 180).toISOString(),
    status: 'active',
    notes: null,
    created_at: subDays(new Date(), 30).toISOString(),
    packages: {
      id: 'demo-pkg-def-2',
      name: 'Laser Hair Removal - Full Legs',
      description: 'Complete laser hair removal package',
      total_sessions: 4,
      price: 1200,
    },
  },
  {
    id: 'demo-pkg-3',
    client_id: 'demo-client-id',
    package_id: 'demo-pkg-def-3',
    sessions_used: 3,
    sessions_total: 3,
    purchase_date: subDays(new Date(), 180).toISOString(),
    expiry_date: null,
    status: 'completed',
    notes: null,
    created_at: subDays(new Date(), 180).toISOString(),
    packages: {
      id: 'demo-pkg-def-3',
      name: 'Microneedling Package',
      description: 'Skin rejuvenation treatment series',
      total_sessions: 3,
      price: 600,
    },
  },
];

// Helper to create a date with specific time
const createDateTime = (date: Date, hours: number, minutes: number = 0) => {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

export const DEMO_APPOINTMENTS = [
  {
    id: 'demo-apt-1',
    client_id: 'demo-client-id',
    staff_id: 'demo-staff-1',
    service_id: 'demo-svc-1',
    scheduled_at: createDateTime(addDays(new Date(), 3), 10, 0),
    duration_minutes: 60,
    status: 'confirmed',
    total_amount: 185,
    notes: null,
    services: {
      id: 'demo-svc-1',
      name: 'HydraFacial Signature',
      description: 'Deep cleansing and hydration',
      category: 'Facials',
      duration_minutes: 60,
      price: 185,
    },
    staff: {
      id: 'demo-staff-1',
      first_name: 'Sarah',
      last_name: 'Mitchell',
      role: 'provider',
    },
  },
  {
    id: 'demo-apt-2',
    client_id: 'demo-client-id',
    staff_id: 'demo-staff-2',
    service_id: 'demo-svc-2',
    scheduled_at: createDateTime(subDays(new Date(), 14), 14, 0),
    duration_minutes: 75,
    status: 'completed',
    total_amount: 250,
    notes: 'Great results, client very happy',
    services: {
      id: 'demo-svc-2',
      name: 'Body Sculpting Wrap',
      description: 'Detoxifying body wrap with contouring massage',
      category: 'Body Treatments',
      duration_minutes: 75,
      price: 250,
    },
    staff: {
      id: 'demo-staff-2',
      first_name: 'Emily',
      last_name: 'Chen',
      role: 'provider',
    },
  },
  {
    id: 'demo-apt-3',
    client_id: 'demo-client-id',
    staff_id: 'demo-staff-1',
    service_id: 'demo-svc-3',
    scheduled_at: createDateTime(subDays(new Date(), 45), 11, 30),
    duration_minutes: 90,
    status: 'completed',
    total_amount: 350,
    notes: null,
    services: {
      id: 'demo-svc-3',
      name: 'LED Light Therapy + Facial',
      description: 'Anti-aging LED treatment with custom facial',
      category: 'LED Therapy',
      duration_minutes: 90,
      price: 350,
    },
    staff: {
      id: 'demo-staff-1',
      first_name: 'Sarah',
      last_name: 'Mitchell',
      role: 'provider',
    },
  },
];

export const DEMO_PHOTOS = [
  {
    id: 'demo-photo-1',
    client_id: 'demo-client-id',
    service_id: 'demo-svc-1',
    appointment_id: null,
    before_photo_url: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400',
    after_photo_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
    taken_date: subDays(new Date(), 30).toISOString(),
    notes: 'After 3 HydraFacial treatments',
    is_visible_to_client: true,
    created_at: subDays(new Date(), 30).toISOString(),
    services: {
      id: 'demo-svc-1',
      name: 'HydraFacial Signature',
      category: 'Facials',
    },
  },
  {
    id: 'demo-photo-2',
    client_id: 'demo-client-id',
    service_id: 'demo-svc-4',
    appointment_id: null,
    before_photo_url: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400',
    after_photo_url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400',
    taken_date: subDays(new Date(), 60).toISOString(),
    notes: 'Microneedling series completed',
    is_visible_to_client: true,
    created_at: subDays(new Date(), 60).toISOString(),
    services: {
      id: 'demo-svc-4',
      name: 'Microneedling',
      category: 'Skin Rejuvenation',
    },
  },
];

export const DEMO_PRODUCT_RECOMMENDATIONS = [
  {
    id: 'demo-rec-1',
    client_id: 'demo-client-id',
    staff_id: 'demo-staff-1',
    product_name: 'SkinCeuticals C E Ferulic',
    product_description: 'Vitamin C serum for brightening and anti-aging. Apply every morning.',
    price: 182,
    product_url: 'https://www.skinceuticals.com',
    is_purchased: false,
    priority: 'high',
    recommended_date: subDays(new Date(), 7).toISOString(),
    created_at: subDays(new Date(), 7).toISOString(),
    staff: {
      first_name: 'Sarah',
      last_name: 'Mitchell',
    },
  },
  {
    id: 'demo-rec-2',
    client_id: 'demo-client-id',
    staff_id: 'demo-staff-2',
    product_name: 'EltaMD UV Clear SPF 46',
    product_description: 'Lightweight, oil-free sunscreen perfect for daily use.',
    price: 41,
    product_url: null,
    is_purchased: true,
    priority: 'normal',
    recommended_date: subDays(new Date(), 30).toISOString(),
    created_at: subDays(new Date(), 30).toISOString(),
    staff: {
      first_name: 'Emily',
      last_name: 'Chen',
    },
  },
];

export const DEMO_SERVICE_RECOMMENDATIONS = [
  {
    id: 'demo-svc-rec-1',
    client_id: 'demo-client-id',
    service_id: 'demo-svc-5',
    staff_id: 'demo-staff-1',
    reason: 'Based on your skin goals, a chemical peel would help with texture and tone improvement.',
    is_booked: false,
    priority: 'high',
    recommended_date: subDays(new Date(), 5).toISOString(),
    created_at: subDays(new Date(), 5).toISOString(),
    services: {
      id: 'demo-svc-5',
      name: 'VI Peel',
      description: 'Professional-grade chemical peel for rejuvenation',
      price: 350,
      duration_minutes: 45,
    },
    staff: {
      first_name: 'Sarah',
      last_name: 'Mitchell',
    },
  },
  {
    id: 'demo-svc-rec-2',
    client_id: 'demo-client-id',
    service_id: 'demo-svc-6',
    staff_id: 'demo-staff-2',
    reason: 'A relaxing body massage would complement your facial treatments beautifully.',
    is_booked: false,
    priority: 'normal',
    recommended_date: subDays(new Date(), 14).toISOString(),
    created_at: subDays(new Date(), 14).toISOString(),
    services: {
      id: 'demo-svc-6',
      name: 'Swedish Massage - 60min',
      description: 'Relaxing full-body massage',
      price: 120,
      duration_minutes: 60,
    },
    staff: {
      first_name: 'Emily',
      last_name: 'Chen',
    },
  },
];

// Demo membership usage history
export const DEMO_MEMBERSHIP = {
  id: 'demo-membership-1',
  client_id: 'demo-client-id',
  membership_id: 'demo-mem-def-1',
  start_date: subDays(new Date(), 90).toISOString(),
  next_billing_date: addDays(new Date(), 5).toISOString(),
  status: 'active',
  remaining_credits: 2,
  created_at: subDays(new Date(), 90).toISOString(),
  updated_at: new Date().toISOString(),
  memberships: {
    id: 'demo-mem-def-1',
    name: 'Radiance VIP',
    description: 'Monthly membership with exclusive benefits',
    price: 299,
    billing_period: 'monthly',
    monthly_service_credits: 3,
    retail_discount_percent: 15,
    priority_booking: true,
    benefits: ['3 Monthly Service Credits', '15% Retail Discount', 'Priority Booking', 'Exclusive Member Events'],
  },
};

export const DEMO_MEMBERSHIP_LEDGER = [
  {
    id: 'demo-ledger-1',
    client_membership_id: 'demo-membership-1',
    transaction_type: 'credit_added',
    credits: 3,
    balance_after: 3,
    description: 'Monthly credits added',
    created_at: subDays(new Date(), 30).toISOString(),
    related_service_id: null,
    related_appointment_id: null,
  },
  {
    id: 'demo-ledger-2',
    client_membership_id: 'demo-membership-1',
    transaction_type: 'credit_used',
    credits: -1,
    balance_after: 2,
    description: 'HydraFacial Signature',
    created_at: subDays(new Date(), 14).toISOString(),
    related_service_id: 'demo-svc-1',
    related_appointment_id: 'demo-apt-2',
  },
  {
    id: 'demo-ledger-3',
    client_membership_id: 'demo-membership-1',
    transaction_type: 'credit_added',
    credits: 3,
    balance_after: 5,
    description: 'Monthly credits added',
    created_at: subDays(new Date(), 60).toISOString(),
    related_service_id: null,
    related_appointment_id: null,
  },
  {
    id: 'demo-ledger-4',
    client_membership_id: 'demo-membership-1',
    transaction_type: 'credit_used',
    credits: -2,
    balance_after: 3,
    description: 'LED Light Therapy + Facial',
    created_at: subDays(new Date(), 45).toISOString(),
    related_service_id: 'demo-svc-3',
    related_appointment_id: 'demo-apt-3',
  },
];

// Demo client notes and flags
export const DEMO_CLIENT_NOTES = [
  {
    id: 'demo-note-1',
    content: 'Prefers morning appointments between 9-11am',
    created_at: subDays(new Date(), 60).toISOString(),
    staff_name: 'Sarah Mitchell',
    type: 'preference',
  },
  {
    id: 'demo-note-2',
    content: 'Allergic to certain fragrances - always use unscented products',
    created_at: subDays(new Date(), 90).toISOString(),
    staff_name: 'Dr. Chen',
    type: 'medical',
  },
];

export const DEMO_CLIENT_FLAGS = [
  { type: 'vip', label: 'VIP Member', color: 'gold' },
  { type: 'allergy', label: 'Fragrance Sensitivity', color: 'orange' },
];
