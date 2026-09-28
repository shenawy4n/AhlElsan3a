-- ===== Provider Applications =====
CREATE TABLE public.provider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  phone text NOT NULL CHECK (char_length(btrim(phone)) BETWEEN 6 AND 20),
  whatsapp text CHECK (whatsapp IS NULL OR char_length(btrim(whatsapp)) BETWEEN 6 AND 20),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
  experience_id uuid REFERENCES public.experience_options(id) ON DELETE SET NULL,
  description text CHECK (description IS NULL OR char_length(description) <= 1000),
  services text CHECK (services IS NULL OR char_length(services) <= 1000),
  working_hours text CHECK (working_hours IS NULL OR char_length(working_hours) <= 200),
  price_description text CHECK (price_description IS NULL OR char_length(price_description) <= 500),
  photo_url text,
  is_emergency_24h boolean NOT NULL DEFAULT false,
  has_workshop boolean NOT NULL DEFAULT false,
  workshop_name text CHECK (workshop_name IS NULL OR char_length(workshop_name) <= 100),
  workshop_address text CHECK (workshop_address IS NULL OR char_length(workshop_address) <= 300),
  working_hours_structured jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 300),
  reviewed_by_email text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provider_applications_status_created_idx ON public.provider_applications (status, created_at DESC);

GRANT INSERT ON public.provider_applications TO anon;
GRANT SELECT, INSERT, UPDATE ON public.provider_applications TO authenticated;
GRANT ALL ON public.provider_applications TO service_role;

ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can apply" ON public.provider_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending'
              AND EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_id AND c.status = 'active')
              AND EXISTS (SELECT 1 FROM public.areas a WHERE a.id = area_id AND a.status = 'active'));

CREATE POLICY "admin read applications" ON public.provider_applications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update applications" ON public.provider_applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== New provider fields =====
ALTER TABLE public.providers
  ADD COLUMN is_emergency_24h boolean NOT NULL DEFAULT false,
  ADD COLUMN has_workshop boolean NOT NULL DEFAULT false,
  ADD COLUMN workshop_name text,
  ADD COLUMN workshop_address text,
  ADD COLUMN working_hours_structured jsonb;

GRANT SELECT (is_emergency_24h, has_workshop, workshop_name, workshop_address, working_hours_structured)
  ON public.providers TO anon;

-- ===== Review RPCs =====
CREATE OR REPLACE FUNCTION public.approve_application(_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_row public.provider_applications%ROWTYPE;
  new_provider_id uuid;
  admin_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT * INTO app_row FROM public.provider_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF app_row.status <> 'pending' THEN
    RAISE EXCEPTION 'already_reviewed';
  END IF;

  SELECT email INTO admin_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.providers (
    name, phone, whatsapp, category_id, area_id, experience_id,
    description, services, working_hours, price_description, photo_url,
    is_emergency_24h, has_workshop, workshop_name, workshop_address,
    working_hours_structured, status
  ) VALUES (
    app_row.name, app_row.phone, app_row.whatsapp, app_row.category_id, app_row.area_id, app_row.experience_id,
    app_row.description, app_row.services, app_row.working_hours, app_row.price_description, app_row.photo_url,
    app_row.is_emergency_24h, app_row.has_workshop, app_row.workshop_name, app_row.workshop_address,
    app_row.working_hours_structured, 'active'
  ) RETURNING id INTO new_provider_id;

  UPDATE public.provider_applications
  SET status = 'approved', reviewed_by_email = admin_email, reviewed_at = now()
  WHERE id = _application_id;

  INSERT INTO public.audit_log (admin_id, admin_email, action, target)
  VALUES (auth.uid(), admin_email, 'application_approved', app_row.name);

  RETURN new_provider_id;
END $$;

CREATE OR REPLACE FUNCTION public.reject_application(_application_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_row public.provider_applications%ROWTYPE;
  admin_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT * INTO app_row FROM public.provider_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF app_row.status <> 'pending' THEN
    RAISE EXCEPTION 'already_reviewed';
  END IF;

  SELECT email INTO admin_email FROM auth.users WHERE id = auth.uid();

  UPDATE public.provider_applications
  SET status = 'rejected', rejection_reason = _reason, reviewed_by_email = admin_email, reviewed_at = now()
  WHERE id = _application_id;

  INSERT INTO public.audit_log (admin_id, admin_email, action, target)
  VALUES (auth.uid(), admin_email, 'application_rejected', app_row.name);
END $$;

-- Live count of pending applications for the admin badge (security definer so count is exact).
CREATE OR REPLACE FUNCTION public.pending_applications_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin') THEN
    (SELECT count(*)::integer FROM public.provider_applications WHERE status = 'pending')
  ELSE NULL END
$$;

REVOKE EXECUTE ON FUNCTION public.approve_application(uuid), public.reject_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_application(uuid), public.reject_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pending_applications_count() TO anon, authenticated;