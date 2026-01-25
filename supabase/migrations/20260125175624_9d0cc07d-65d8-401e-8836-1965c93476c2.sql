-- Create a secure function to validate staff PIN
-- Uses SECURITY DEFINER to bypass RLS for authentication purposes
CREATE OR REPLACE FUNCTION public.validate_staff_pin(p_pin text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  role staff_role,
  is_active boolean,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.first_name,
    s.last_name,
    s.email,
    s.phone,
    s.role,
    s.is_active,
    s.avatar_url
  FROM public.staff s
  WHERE s.pin = p_pin
    AND s.is_active = true
  LIMIT 1;
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.validate_staff_pin(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_staff_pin(text) TO authenticated;