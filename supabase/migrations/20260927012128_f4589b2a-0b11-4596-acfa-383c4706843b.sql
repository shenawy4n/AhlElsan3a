CREATE OR REPLACE FUNCTION public.normalize_eg_phone(_p text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE n text;
BEGIN
  IF _p IS NULL THEN RETURN NULL; END IF;
  n := regexp_replace(translate(_p, '٠١٢٣٤٥٦٧٨٩', '0123456789'), '[^0-9]', '', 'g');
  IF n LIKE '0020%' THEN n := substr(n, 5);
  ELSIF n LIKE '20%' AND length(n) = 12 THEN n := substr(n, 3); END IF;
  IF n LIKE '0%' THEN n := substr(n, 2); END IF;
  IF n ~ '^1[0125][0-9]{8}$' OR n ~ '^[0-9]{8,9}$' THEN RETURN '+20' || n; END IF;
  RETURN NULL;
END $$;

CREATE TABLE public.provider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  category_id uuid NOT NULL REFERENCES public.categories(id),
  area_id uuid NOT NULL REFERENCES public.areas(id),
  description text,
  services text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL
);
GRANT SELECT ON public.provider_applications TO authenticated;
GRANT ALL ON public.provider_applications TO service_role;
ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read applications" ON public.provider_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.approve_application(_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.provider_applications; ph text; wa text; new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO a FROM public.provider_applications WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF a.status <> 'pending' THEN RAISE EXCEPTION 'not_pending'; END IF;
  ph := public.normalize_eg_phone(a.phone);
  IF ph IS NULL THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  wa := public.normalize_eg_phone(a.whatsapp);
  PERFORM pg_advisory_xact_lock(hashtextextended('provider_phone|' || ph, 0));
  IF EXISTS (SELECT 1 FROM public.providers WHERE public.normalize_eg_phone(phone) = ph) THEN
    RAISE EXCEPTION 'duplicate_phone'; END IF;
  INSERT INTO public.providers (name, category_id, area_id, phone, whatsapp, has_whatsapp, description, services)
  VALUES (a.name, a.category_id, a.area_id, ph, wa, wa IS NOT NULL, a.description, a.services)
  RETURNING id INTO new_id;
  UPDATE public.provider_applications SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), provider_id = new_id
  WHERE id = _id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.reject_application(_id uuid, _reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 2 OR length(_reason) > 300 THEN RAISE EXCEPTION 'invalid_reason'; END IF;
  UPDATE public.provider_applications SET status = 'rejected', rejection_reason = btrim(_reason), reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_pending'; END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.approve_application(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_application(uuid, text) TO authenticated;

INSERT INTO public.rate_limit_policies (form_type, max_requests, window_seconds) VALUES ('provider_application', 3, 600)
ON CONFLICT (form_type) DO NOTHING;