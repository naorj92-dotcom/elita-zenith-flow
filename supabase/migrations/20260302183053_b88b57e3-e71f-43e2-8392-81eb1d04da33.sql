
-- =============================================
-- SECURE CLIENT REGISTRATION: RPC function
-- Handles creating client record + client_profile + user_role
-- in a single atomic transaction after Supabase Auth signup
-- =============================================

CREATE OR REPLACE FUNCTION public.register_client(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Verify the calling user matches the p_user_id (prevent impersonation)
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  -- Check if this user already has a client profile
  IF EXISTS (SELECT 1 FROM public.client_profiles WHERE user_id = p_user_id) THEN
    SELECT client_id INTO v_client_id FROM public.client_profiles WHERE user_id = p_user_id;
    RETURN v_client_id;
  END IF;

  -- Create client record
  INSERT INTO public.clients (first_name, last_name, email)
  VALUES (p_first_name, p_last_name, p_email)
  RETURNING id INTO v_client_id;

  -- Link to client_profiles
  INSERT INTO public.client_profiles (user_id, client_id)
  VALUES (p_user_id, v_client_id);

  -- Create user_role entry
  INSERT INTO public.user_roles (user_id, role, client_id)
  VALUES (p_user_id, 'client', v_client_id);

  RETURN v_client_id;
END;
$$;

-- =============================================
-- STAFF REGISTRATION: RPC function for owner to register staff
-- Links existing staff record to a new Supabase Auth account
-- =============================================

CREATE OR REPLACE FUNCTION public.register_staff_auth(
  p_staff_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_role staff_role;
  v_app_role app_role;
  v_emp_type employee_type;
BEGIN
  -- Only owners can register staff auth
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Unauthorized: only owners can register staff';
  END IF;

  -- Check if staff already linked
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE staff_id = p_staff_id AND is_active = true) THEN
    RAISE EXCEPTION 'Staff member already has an account';
  END IF;

  -- Get staff role to determine app_role
  SELECT role INTO v_staff_role FROM public.staff WHERE id = p_staff_id;
  
  IF v_staff_role IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;

  -- Map staff_role to app_role and employee_type
  IF v_staff_role = 'admin' THEN
    v_app_role := 'owner';
    v_emp_type := NULL;
  ELSIF v_staff_role = 'front_desk' THEN
    v_app_role := 'employee';
    v_emp_type := 'front_desk';
  ELSE
    v_app_role := 'employee';
    v_emp_type := 'provider';
  END IF;

  -- Create user_role entry
  INSERT INTO public.user_roles (user_id, role, employee_type, staff_id)
  VALUES (p_user_id, v_app_role, v_emp_type, p_staff_id);
END;
$$;
