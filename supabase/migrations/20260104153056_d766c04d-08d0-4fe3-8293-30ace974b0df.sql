-- Phase 1: User Roles & Permissions System

-- Create app_role enum for the three user types
CREATE TYPE public.app_role AS ENUM ('owner', 'employee', 'client');

-- Create employee_type enum
CREATE TYPE public.employee_type AS ENUM ('front_desk', 'provider');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    employee_type employee_type NULL, -- Only for employees
    staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL, -- Link employees to staff record
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL, -- Link clients to client record
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND is_active = true
  LIMIT 1
$$;

-- Function to get employee type
CREATE OR REPLACE FUNCTION public.get_employee_type(_user_id uuid)
RETURNS employee_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_type
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'employee'
    AND is_active = true
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'owner'));

-- Phase 2: Audit Logs System

CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    reason text,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only owners can view audit logs
CREATE POLICY "Owners can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'owner'));

-- Allow inserts from authenticated users (for logging their actions)
CREATE POLICY "Authenticated users can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Phase 3: Membership Wallet/Benefit Tracking

CREATE TABLE public.membership_benefits_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_membership_id uuid REFERENCES public.client_memberships(id) ON DELETE CASCADE NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'rollover', 'expire', 'adjustment')),
    credits integer NOT NULL,
    balance_after integer NOT NULL,
    related_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
    related_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
    description text,
    performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_benefits_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own benefit ledger"
ON public.membership_benefits_ledger FOR SELECT
USING (
    client_membership_id IN (
        SELECT cm.id FROM public.client_memberships cm
        JOIN public.client_profiles cp ON cp.client_id = cm.client_id
        WHERE cp.user_id = auth.uid()
    )
);

CREATE POLICY "Staff can manage benefit ledger"
ON public.membership_benefits_ledger FOR ALL
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'employee'));

-- Phase 4: Enhanced Appointment Links

-- Add SOAP notes table
CREATE TABLE public.appointment_soap_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL UNIQUE,
    subjective text,
    objective text,
    assessment text,
    plan text,
    provider_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_soap_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage SOAP notes"
ON public.appointment_soap_notes FOR ALL
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'employee'));

-- Add rebooking tracking to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS rebooked_from_id uuid REFERENCES public.appointments(id),
ADD COLUMN IF NOT EXISTS rebooked_to_id uuid REFERENCES public.appointments(id),
ADD COLUMN IF NOT EXISTS aftercare_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS review_requested_at timestamptz,
ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Add machine assignment to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS machine_id uuid REFERENCES public.machines(id);

-- Phase 5: Service Requirements Enhancement

-- Add required resources to services
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS required_room_type text,
ADD COLUMN IF NOT EXISTS aftercare_template_id uuid REFERENCES public.notification_templates(id);

-- Create index for faster appointment lookups
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON public.appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Add updated_at trigger for new tables
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointment_soap_notes_updated_at
BEFORE UPDATE ON public.appointment_soap_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();