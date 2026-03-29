-- Fix the SECURITY DEFINER view warning by setting it to SECURITY INVOKER
ALTER VIEW public.products_public SET (security_invoker = on);

-- The column-level grant approach for staff won't work well with RLS - 
-- owners need financial columns, others don't. Let's use a different approach:
-- Grant all columns back but only to owner role via RLS
REVOKE ALL ON public.staff FROM anon, authenticated;
GRANT SELECT ON public.staff TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.staff TO authenticated;