CREATE TABLE public.experience_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.experience_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_options TO authenticated;
GRANT ALL ON public.experience_options TO service_role;
ALTER TABLE public.experience_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read exp" ON public.experience_options FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write exp" ON public.experience_options FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.experience_options(label, sort_order) VALUES
('أقل من سنة',1),('1 - 3 سنوات',2),('4 - 7 سنوات',3),('8 - 10 سنوات',4),('أكثر من 10 سنوات',5);

ALTER TABLE public.providers
  ADD COLUMN experience_id uuid REFERENCES public.experience_options(id) ON DELETE SET NULL,
  ADD COLUMN is_verified boolean NOT NULL DEFAULT false;

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('profile_view','phone_click','whatsapp_click','search','category_view')),
  provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  query text CHECK (query IS NULL OR char_length(query) <= 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.analytics_events(created_at);
GRANT INSERT ON public.analytics_events TO anon;
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone log event" ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (NOT public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin read events" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.service_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.service_suggestions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_suggestions TO authenticated;
GRANT ALL ON public.service_suggestions TO service_role;
ALTER TABLE public.service_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone suggest" ON public.service_suggestions FOR INSERT TO anon, authenticated WITH CHECK (status = 'new');
CREATE POLICY "admin manage suggestions" ON public.service_suggestions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.app_settings(key,value) VALUES ('app_name','أهل الصنعة'),('tagline','كل صنعة عند أهلها'),('logo_url',NULL),('contact_phone',NULL),('contact_whatsapp',NULL),('default_provider_status','active');

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  admin_email text,
  action text NOT NULL,
  target text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.log_admin_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a text; t text; kind text;
BEGIN
  kind := CASE TG_TABLE_NAME WHEN 'providers' THEN 'صنايعي' WHEN 'categories' THEN 'قسم' ELSE 'منطقة' END;
  IF TG_OP = 'INSERT' THEN a := 'إضافة ' || kind; t := NEW.name;
  ELSIF TG_OP = 'DELETE' THEN a := 'حذف ' || kind; t := OLD.name;
  ELSE
    t := NEW.name;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      a := CASE WHEN NEW.status = 'active' THEN 'إظهار ' ELSE 'إخفاء ' END || kind;
    ELSIF TG_TABLE_NAME = 'providers' AND (to_jsonb(NEW)->>'is_verified') IS DISTINCT FROM (to_jsonb(OLD)->>'is_verified') THEN
      a := CASE WHEN (to_jsonb(NEW)->>'is_verified')::boolean THEN 'توثيق صنايعي' ELSE 'إلغاء توثيق صنايعي' END;
    ELSIF TG_TABLE_NAME = 'providers' AND (to_jsonb(NEW)->>'is_premium') IS DISTINCT FROM (to_jsonb(OLD)->>'is_premium') THEN
      a := CASE WHEN (to_jsonb(NEW)->>'is_premium')::boolean THEN 'تفعيل التمييز' ELSE 'إلغاء التمييز' END;
    ELSE a := 'تعديل ' || kind;
    END IF;
  END IF;
  INSERT INTO public.audit_log(admin_id, admin_email, action, target)
  VALUES (auth.uid(), auth.jwt()->>'email', a, t);
  RETURN COALESCE(NEW, OLD);
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_admin_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_providers AFTER INSERT OR UPDATE OR DELETE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();
CREATE TRIGGER audit_categories AFTER INSERT OR UPDATE OR DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();
CREATE TRIGGER audit_areas AFTER INSERT OR UPDATE OR DELETE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();