-- Staff announcements table for internal communication
CREATE TABLE public.staff_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.staff_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view announcements"
  ON public.staff_announcements
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
  );

CREATE POLICY "Owners can manage announcements"
  ON public.staff_announcements
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));