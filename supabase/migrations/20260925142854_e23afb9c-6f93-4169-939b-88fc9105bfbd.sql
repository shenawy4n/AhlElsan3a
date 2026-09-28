-- ===== Admin allow-list =====
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  is_owner boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  added_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_users_single_owner ON public.admin_users (is_owner) WHERE is_owner;
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users a JOIN auth.users u ON lower(u.email) = a.email
                 WHERE u.id = _user_id AND a.active AND a.is_owner)
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _role = 'admin' THEN
    EXISTS (SELECT 1 FROM public.admin_users a JOIN auth.users u ON lower(u.email) = a.email
            WHERE u.id = _user_id AND a.active)
  ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) END
$$;

CREATE POLICY "owner reads admins" ON public.admin_users FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Existing admin becomes the permanent owner
INSERT INTO public.admin_users (email, is_owner, added_by_email)
SELECT lower(u.email), true, 'system'
FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id
WHERE r.role = 'admin' AND u.email IS NOT NULL
ORDER BY r.created_at LIMIT 1;

-- No more auto-claiming: just reports whether caller is an admin
CREATE OR REPLACE FUNCTION public.claim_first_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.my_admin_level() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_owner(auth.uid()) THEN 'owner'
              WHEN public.has_role(auth.uid(), 'admin') THEN 'admin' ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.admin_add(_email text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(btrim(_email)); new_id uuid; me text;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'not_owner'; END IF;
  IF e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(e) > 255 THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE email = e) THEN RAISE EXCEPTION 'already_admin'; END IF;
  SELECT email INTO me FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_users (email, added_by_email) VALUES (e, me) RETURNING id INTO new_id;
  INSERT INTO public.audit_log (admin_id, admin_email, action, target) VALUES (auth.uid(), me, 'admin_added', e);
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_active(_id uuid, _active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; me text;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'not_owner'; END IF;
  UPDATE public.admin_users SET active = _active WHERE id = _id AND NOT is_owner RETURNING email INTO t;
  IF t IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT email INTO me FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.audit_log (admin_id, admin_email, action, target)
  VALUES (auth.uid(), me, CASE WHEN _active THEN 'admin_reactivated' ELSE 'admin_deactivated' END, t);
END $$;

CREATE OR REPLACE FUNCTION public.admin_revoke(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; me text;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'not_owner'; END IF;
  DELETE FROM public.admin_users WHERE id = _id AND NOT is_owner RETURNING email INTO t;
  IF t IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT email INTO me FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.audit_log (admin_id, admin_email, action, target) VALUES (auth.uid(), me, 'admin_access_revoked', t);
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_add(text), public.admin_set_active(uuid, boolean), public.admin_revoke(uuid), public.my_admin_level() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add(text), public.admin_set_active(uuid, boolean), public.admin_revoke(uuid), public.my_admin_level() TO authenticated;

-- ===== Hide phone numbers from public =====
ALTER TABLE public.providers ADD COLUMN has_whatsapp boolean GENERATED ALWAYS AS (coalesce(btrim(whatsapp), '') <> '') STORED;
REVOKE SELECT ON public.providers FROM anon;
GRANT SELECT (id, name, category_id, area_id, description, services, price_description, working_hours, photo_url,
  status, is_premium, premium_expires_at, created_at, updated_at, experience_id, is_verified, has_whatsapp)
  ON public.providers TO anon;

CREATE OR REPLACE FUNCTION public.contact_provider(_provider_id uuid, _kind text)
RETURNS TABLE (phone text, secondary_phone text, whatsapp text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _kind NOT IN ('phone_click', 'whatsapp_click', 'phone_reveal') THEN RAISE EXCEPTION 'invalid_kind'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    INSERT INTO public.analytics_events (event_type, provider_id, category_id)
    SELECT _kind, p.id, p.category_id FROM public.providers p WHERE p.id = _provider_id AND p.status = 'active';
  END IF;
  RETURN QUERY SELECT
    CASE WHEN _kind <> 'whatsapp_click' THEN p.phone END,
    CASE WHEN _kind = 'phone_reveal' THEN p.secondary_phone END,
    CASE WHEN _kind = 'whatsapp_click' THEN p.whatsapp END
  FROM public.providers p WHERE p.id = _provider_id AND p.status = 'active';
END $$;
GRANT EXECUTE ON FUNCTION public.contact_provider(uuid, text) TO anon, authenticated;

-- ===== Security warning: reports accepted anything =====
DROP POLICY "anyone can report" ON public.reports;
DROP POLICY "auth can report" ON public.reports;
CREATE POLICY "anyone can report" ON public.reports FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'new' AND char_length(btrim(reason)) BETWEEN 1 AND 200
              AND coalesce(char_length(details), 0) <= 1000
              AND EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.status = 'active'));