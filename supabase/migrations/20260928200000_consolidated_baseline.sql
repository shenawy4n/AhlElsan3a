-- Consolidated baseline: exact snapshot of the live public schema (2026-09-28).
-- Replaces all earlier migration files. Safe to run on an empty Supabase database.
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: admin_add(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_add(_email text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE e text := lower(btrim(_email)); new_id uuid; me text;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'not_owner'; END IF;
  IF e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(e) > 255 THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE email = e) THEN RAISE EXCEPTION 'already_admin'; END IF;
  SELECT email INTO me FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_users (email, added_by_email) VALUES (e, me) RETURNING id INTO new_id;
  INSERT INTO public.audit_log (admin_id, admin_email, action, target) VALUES (auth.uid(), me, 'admin_added', e);
  RETURN new_id;
END $_$;


--
-- Name: admin_revoke(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_revoke(_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE t text; me text;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'not_owner'; END IF;
  DELETE FROM public.admin_users WHERE id = _id AND NOT is_owner RETURNING email INTO t;
  IF t IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT email INTO me FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.audit_log (admin_id, admin_email, action, target) VALUES (auth.uid(), me, 'admin_access_revoked', t);
END $$;


--
-- Name: admin_set_active(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_active(_id uuid, _active boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE t text; me text;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'not_owner'; END IF;
  UPDATE public.admin_users SET active = _active WHERE id = _id AND NOT is_owner RETURNING email INTO t;
  IF t IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT email INTO me FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.audit_log (admin_id, admin_email, action, target)
  VALUES (auth.uid(), me, CASE WHEN _active THEN 'admin_reactivated' ELSE 'admin_deactivated' END, t);
END $$;


--
-- Name: approve_application(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_application(_application_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: approve_review(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_review(_review_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  r public.reviews%ROWTYPE;
  admin_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT * INTO r FROM public.reviews WHERE id = _review_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'already_reviewed'; END IF;

  SELECT email INTO admin_email FROM auth.users WHERE id = auth.uid();

  UPDATE public.reviews
  SET status = 'approved', reviewed_by_email = admin_email, reviewed_at = now()
  WHERE id = _review_id;

  INSERT INTO public.audit_log (admin_id, admin_email, action, target)
  VALUES (auth.uid(), admin_email, 'review_approved', r.reviewer_name);
END $$;


--
-- Name: check_rate_limit(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(_ip text, _form_type text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_max integer := 5;
  v_window integer := 600;
  v_count integer;
BEGIN
  IF _ip IS NULL OR btrim(_ip) = '' OR _form_type IS NULL OR btrim(_form_type) = '' THEN
    RETURN false;
  END IF;
  SELECT max_requests, window_seconds INTO v_max, v_window
    FROM public.rate_limit_policies WHERE form_type = _form_type;
  v_max := COALESCE(v_max, 5);
  v_window := COALESCE(v_window, 600);

  -- Serialize concurrent calls for the same (ip, form_type) until the transaction ends.
  PERFORM pg_advisory_xact_lock(hashtextextended(_ip || '|' || _form_type, 0));

  SELECT count(*) INTO v_count FROM public.rate_limit_events
   WHERE ip = _ip AND form_type = _form_type
     AND created_at > now() - make_interval(secs => v_window);

  IF v_count >= v_max THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_events (ip, form_type) VALUES (_ip, _form_type);
  RETURN true;
END $$;


--
-- Name: claim_first_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_first_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
$$;


--
-- Name: cleanup_rate_limit_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_rate_limit_events() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_keep integer; v_deleted integer;
BEGIN
  SELECT GREATEST(600, COALESCE(max(window_seconds), 600)) INTO v_keep FROM public.rate_limit_policies;
  DELETE FROM public.rate_limit_events WHERE created_at < now() - make_interval(secs => v_keep);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $$;


--
-- Name: contact_provider(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.contact_provider(_provider_id uuid, _kind text) RETURNS TABLE(phone text, secondary_phone text, whatsapp text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: delete_review(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_review(_review_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  r public.reviews%ROWTYPE;
  admin_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT * INTO r FROM public.reviews WHERE id = _review_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  SELECT email INTO admin_email FROM auth.users WHERE id = auth.uid();

  DELETE FROM public.reviews WHERE id = _review_id;

  INSERT INTO public.audit_log (admin_id, admin_email, action, target)
  VALUES (auth.uid(), admin_email, 'review_deleted', r.reviewer_name);
END $$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE WHEN _role = 'admin' THEN
    EXISTS (SELECT 1 FROM public.admin_users a JOIN auth.users u ON lower(u.email) = a.email
            WHERE u.id = _user_id AND a.active)
  ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) END
$$;


--
-- Name: is_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_owner(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users a JOIN auth.users u ON lower(u.email) = a.email
                 WHERE u.id = _user_id AND a.active AND a.is_owner)
$$;


--
-- Name: log_admin_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_admin_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: my_admin_level(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_admin_level() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE WHEN public.is_owner(auth.uid()) THEN 'owner'
              WHEN public.has_role(auth.uid(), 'admin') THEN 'admin' ELSE NULL END
$$;


--
-- Name: pending_applications_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pending_applications_count() RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin') THEN
    (SELECT count(*)::integer FROM public.provider_applications WHERE status = 'pending')
  ELSE NULL END
$$;


--
-- Name: pending_reviews_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pending_reviews_count() RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin') THEN
    (SELECT count(*)::integer FROM public.reviews WHERE status = 'pending')
  ELSE NULL END
$$;


--
-- Name: provider_rating(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.provider_rating(_provider_id uuid) RETURNS TABLE(avg_rating numeric, review_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0), COUNT(*)
  FROM public.reviews
  WHERE provider_id = _provider_id AND status = 'approved'
$$;


--
-- Name: reject_application(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_application(_application_id uuid, _reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: reject_review(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_review(_review_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  r public.reviews%ROWTYPE;
  admin_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT * INTO r FROM public.reviews WHERE id = _review_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'already_reviewed'; END IF;

  SELECT email INTO admin_email FROM auth.users WHERE id = auth.uid();

  UPDATE public.reviews
  SET status = 'rejected', reviewed_by_email = admin_email, reviewed_at = now()
  WHERE id = _review_id;

  INSERT INTO public.audit_log (admin_id, admin_email, action, target)
  VALUES (auth.uid(), admin_email, 'review_rejected', r.reviewer_name);
END $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    is_owner boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    added_by_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_users_email_check CHECK ((email = lower(email)))
);


--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    provider_id uuid,
    category_id uuid,
    query text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT analytics_events_event_type_check CHECK ((event_type = ANY (ARRAY['profile_view'::text, 'phone_click'::text, 'whatsapp_click'::text, 'search'::text, 'category_view'::text]))),
    CONSTRAINT analytics_events_query_check CHECK (((query IS NULL) OR (char_length(query) <= 80)))
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    admin_email text,
    action text NOT NULL,
    target text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    icon text DEFAULT 'wrench'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: experience_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experience_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: provider_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    whatsapp text,
    category_id uuid NOT NULL,
    area_id uuid NOT NULL,
    experience_id uuid,
    description text,
    services text,
    working_hours text,
    price_description text,
    photo_url text,
    is_emergency_24h boolean DEFAULT false NOT NULL,
    has_workshop boolean DEFAULT false NOT NULL,
    workshop_name text,
    workshop_address text,
    working_hours_structured jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    reviewed_by_email text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT provider_applications_description_check CHECK (((description IS NULL) OR (char_length(description) <= 1000))),
    CONSTRAINT provider_applications_name_check CHECK (((char_length(btrim(name)) >= 2) AND (char_length(btrim(name)) <= 100))),
    CONSTRAINT provider_applications_phone_check CHECK (((char_length(btrim(phone)) >= 6) AND (char_length(btrim(phone)) <= 20))),
    CONSTRAINT provider_applications_price_description_check CHECK (((price_description IS NULL) OR (char_length(price_description) <= 500))),
    CONSTRAINT provider_applications_rejection_reason_check CHECK (((rejection_reason IS NULL) OR (char_length(rejection_reason) <= 300))),
    CONSTRAINT provider_applications_services_check CHECK (((services IS NULL) OR (char_length(services) <= 1000))),
    CONSTRAINT provider_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT provider_applications_whatsapp_check CHECK (((whatsapp IS NULL) OR ((char_length(btrim(whatsapp)) >= 6) AND (char_length(btrim(whatsapp)) <= 20)))),
    CONSTRAINT provider_applications_working_hours_check CHECK (((working_hours IS NULL) OR (char_length(working_hours) <= 200))),
    CONSTRAINT provider_applications_workshop_address_check CHECK (((workshop_address IS NULL) OR (char_length(workshop_address) <= 300))),
    CONSTRAINT provider_applications_workshop_name_check CHECK (((workshop_name IS NULL) OR (char_length(workshop_name) <= 100)))
);


--
-- Name: providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category_id uuid NOT NULL,
    area_id uuid NOT NULL,
    phone text NOT NULL,
    secondary_phone text,
    whatsapp text,
    description text,
    services text,
    price_description text,
    working_hours text,
    photo_url text,
    status text DEFAULT 'active'::text NOT NULL,
    is_premium boolean DEFAULT false NOT NULL,
    premium_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    experience_id uuid,
    is_verified boolean DEFAULT false NOT NULL,
    has_whatsapp boolean GENERATED ALWAYS AS ((COALESCE(btrim(whatsapp), ''::text) <> ''::text)) STORED,
    is_emergency_24h boolean DEFAULT false NOT NULL,
    has_workshop boolean DEFAULT false NOT NULL,
    workshop_name text,
    workshop_address text,
    working_hours_structured jsonb
);


--
-- Name: rate_limit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip text NOT NULL,
    form_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rate_limit_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limit_policies (
    form_type text NOT NULL,
    max_requests integer DEFAULT 5 NOT NULL,
    window_seconds integer DEFAULT 600 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rate_limit_policies_max_requests_check CHECK ((max_requests > 0)),
    CONSTRAINT rate_limit_policies_window_seconds_check CHECK ((window_seconds > 0))
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    status text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    reviewer_name text NOT NULL,
    rating integer NOT NULL,
    comment text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by_email text,
    CONSTRAINT reviews_comment_check CHECK (((comment IS NULL) OR (char_length(comment) <= 500))),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_reviewer_name_check CHECK (((char_length(btrim(reviewer_name)) >= 2) AND (char_length(btrim(reviewer_name)) <= 60))),
    CONSTRAINT reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: service_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_suggestions_name_check CHECK (((char_length(name) >= 2) AND (char_length(name) <= 60)))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: experience_options experience_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experience_options
    ADD CONSTRAINT experience_options_pkey PRIMARY KEY (id);


--
-- Name: provider_applications provider_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_applications
    ADD CONSTRAINT provider_applications_pkey PRIMARY KEY (id);


--
-- Name: providers providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_events rate_limit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_events
    ADD CONSTRAINT rate_limit_events_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_policies rate_limit_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_policies
    ADD CONSTRAINT rate_limit_policies_pkey PRIMARY KEY (form_type);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: service_suggestions service_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_suggestions
    ADD CONSTRAINT service_suggestions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: admin_users_single_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admin_users_single_owner ON public.admin_users USING btree (is_owner) WHERE is_owner;


--
-- Name: analytics_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_events_created_at_idx ON public.analytics_events USING btree (created_at);


--
-- Name: idx_providers_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_providers_area ON public.providers USING btree (area_id);


--
-- Name: idx_providers_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_providers_category ON public.providers USING btree (category_id);


--
-- Name: idx_providers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_providers_status ON public.providers USING btree (status);


--
-- Name: provider_applications_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provider_applications_status_created_idx ON public.provider_applications USING btree (status, created_at DESC);


--
-- Name: rate_limit_events_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rate_limit_events_created_idx ON public.rate_limit_events USING btree (created_at);


--
-- Name: rate_limit_events_ip_form_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rate_limit_events_ip_form_created_idx ON public.rate_limit_events USING btree (ip, form_type, created_at DESC);


--
-- Name: reviews_provider_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_provider_status_idx ON public.reviews USING btree (provider_id, status);


--
-- Name: reviews_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_status_created_idx ON public.reviews USING btree (status, created_at DESC);


--
-- Name: areas audit_areas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_areas AFTER INSERT OR DELETE OR UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();


--
-- Name: categories audit_categories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_categories AFTER INSERT OR DELETE OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();


--
-- Name: providers audit_providers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_providers AFTER INSERT OR DELETE OR UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.log_admin_change();


--
-- Name: analytics_events analytics_events_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: analytics_events analytics_events_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: provider_applications provider_applications_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_applications
    ADD CONSTRAINT provider_applications_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE RESTRICT;


--
-- Name: provider_applications provider_applications_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_applications
    ADD CONSTRAINT provider_applications_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: provider_applications provider_applications_experience_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_applications
    ADD CONSTRAINT provider_applications_experience_id_fkey FOREIGN KEY (experience_id) REFERENCES public.experience_options(id) ON DELETE SET NULL;


--
-- Name: providers providers_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE RESTRICT;


--
-- Name: providers providers_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: providers providers_experience_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_experience_id_fkey FOREIGN KEY (experience_id) REFERENCES public.experience_options(id) ON DELETE SET NULL;


--
-- Name: reports reports_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews admin delete reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin delete reviews" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: service_suggestions admin manage suggestions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin manage suggestions" ON public.service_suggestions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: provider_applications admin read applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin read applications" ON public.provider_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_log admin read audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: analytics_events admin read events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin read events" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reports admin read reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin read reports" ON public.reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: provider_applications admin update applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin update applications" ON public.provider_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reports admin update reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reviews admin update reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin update reviews" ON public.reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: areas admin write areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin write areas" ON public.areas TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories admin write categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin write categories" ON public.categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: experience_options admin write exp; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin write exp" ON public.experience_options TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: providers admin write providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin write providers" ON public.providers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_settings admin write settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin write settings" ON public.app_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

--
-- Name: provider_applications anyone can apply; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone can apply" ON public.provider_applications FOR INSERT TO authenticated, anon WITH CHECK (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM public.categories c
  WHERE ((c.id = provider_applications.category_id) AND (c.status = 'active'::text)))) AND (EXISTS ( SELECT 1
   FROM public.areas a
  WHERE ((a.id = provider_applications.area_id) AND (a.status = 'active'::text))))));


--
-- Name: reports anyone can report; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone can report" ON public.reports FOR INSERT TO authenticated, anon WITH CHECK (((status = 'new'::text) AND ((char_length(btrim(reason)) >= 1) AND (char_length(btrim(reason)) <= 200)) AND (COALESCE(char_length(details), 0) <= 1000) AND (EXISTS ( SELECT 1
   FROM public.providers p
  WHERE ((p.id = reports.provider_id) AND (p.status = 'active'::text))))));


--
-- Name: reviews anyone can review; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone can review" ON public.reviews FOR INSERT TO authenticated, anon WITH CHECK (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM public.providers p
  WHERE ((p.id = reviews.provider_id) AND (p.status = 'active'::text))))));


--
-- Name: analytics_events anyone log event; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone log event" ON public.analytics_events FOR INSERT TO authenticated, anon WITH CHECK ((NOT public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: service_suggestions anyone suggest; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone suggest" ON public.service_suggestions FOR INSERT TO authenticated, anon WITH CHECK ((status = 'new'::text));


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: areas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: experience_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.experience_options ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_users owner reads admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner reads admins" ON public.admin_users FOR SELECT TO authenticated USING (public.is_owner(auth.uid()));


--
-- Name: provider_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews public read approved reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read approved reviews" ON public.reviews FOR SELECT TO authenticated, anon USING (((status = 'approved'::text) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: areas public read areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read areas" ON public.areas FOR SELECT TO authenticated, anon USING (((status = 'active'::text) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: categories public read categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read categories" ON public.categories FOR SELECT TO authenticated, anon USING (((status = 'active'::text) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: experience_options public read exp; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read exp" ON public.experience_options FOR SELECT TO authenticated, anon USING (((status = 'active'::text) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: providers public read providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read providers" ON public.providers FOR SELECT TO authenticated, anon USING (((status = 'active'::text) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: rate_limit_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_limit_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limit_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: service_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles users read own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION admin_add(_email text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_add(_email text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_add(_email text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_add(_email text) TO service_role;


--
-- Name: FUNCTION admin_revoke(_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_revoke(_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_revoke(_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_revoke(_id uuid) TO service_role;


--
-- Name: FUNCTION admin_set_active(_id uuid, _active boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_set_active(_id uuid, _active boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_set_active(_id uuid, _active boolean) TO authenticated;
GRANT ALL ON FUNCTION public.admin_set_active(_id uuid, _active boolean) TO service_role;


--
-- Name: FUNCTION approve_application(_application_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.approve_application(_application_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.approve_application(_application_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.approve_application(_application_id uuid) TO service_role;


--
-- Name: FUNCTION approve_review(_review_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.approve_review(_review_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.approve_review(_review_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.approve_review(_review_id uuid) TO service_role;


--
-- Name: FUNCTION check_rate_limit(_ip text, _form_type text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.check_rate_limit(_ip text, _form_type text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_rate_limit(_ip text, _form_type text) TO service_role;


--
-- Name: FUNCTION claim_first_admin(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT ALL ON FUNCTION public.claim_first_admin() TO service_role;


--
-- Name: FUNCTION cleanup_rate_limit_events(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.cleanup_rate_limit_events() FROM PUBLIC;
GRANT ALL ON FUNCTION public.cleanup_rate_limit_events() TO service_role;


--
-- Name: FUNCTION contact_provider(_provider_id uuid, _kind text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.contact_provider(_provider_id uuid, _kind text) TO anon;
GRANT ALL ON FUNCTION public.contact_provider(_provider_id uuid, _kind text) TO authenticated;
GRANT ALL ON FUNCTION public.contact_provider(_provider_id uuid, _kind text) TO service_role;


--
-- Name: FUNCTION delete_review(_review_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_review(_review_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_review(_review_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_review(_review_id uuid) TO service_role;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;


--
-- Name: FUNCTION is_owner(_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_owner(_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_owner(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_owner(_user_id uuid) TO service_role;


--
-- Name: FUNCTION log_admin_change(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.log_admin_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.log_admin_change() TO service_role;


--
-- Name: FUNCTION my_admin_level(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_admin_level() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_admin_level() TO authenticated;
GRANT ALL ON FUNCTION public.my_admin_level() TO service_role;


--
-- Name: FUNCTION pending_applications_count(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pending_applications_count() TO anon;
GRANT ALL ON FUNCTION public.pending_applications_count() TO authenticated;
GRANT ALL ON FUNCTION public.pending_applications_count() TO service_role;


--
-- Name: FUNCTION pending_reviews_count(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pending_reviews_count() TO anon;
GRANT ALL ON FUNCTION public.pending_reviews_count() TO authenticated;
GRANT ALL ON FUNCTION public.pending_reviews_count() TO service_role;


--
-- Name: FUNCTION provider_rating(_provider_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.provider_rating(_provider_id uuid) TO anon;
GRANT ALL ON FUNCTION public.provider_rating(_provider_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.provider_rating(_provider_id uuid) TO service_role;


--
-- Name: FUNCTION reject_application(_application_id uuid, _reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.reject_application(_application_id uuid, _reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reject_application(_application_id uuid, _reason text) TO authenticated;
GRANT ALL ON FUNCTION public.reject_application(_application_id uuid, _reason text) TO service_role;


--
-- Name: FUNCTION reject_review(_review_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.reject_review(_review_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reject_review(_review_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reject_review(_review_id uuid) TO service_role;


--
-- Name: TABLE admin_users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_users TO anon;
GRANT ALL ON TABLE public.admin_users TO authenticated;
GRANT ALL ON TABLE public.admin_users TO service_role;


--
-- Name: TABLE analytics_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.analytics_events TO anon;
GRANT ALL ON TABLE public.analytics_events TO authenticated;
GRANT ALL ON TABLE public.analytics_events TO service_role;


--
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_settings TO anon;
GRANT ALL ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;


--
-- Name: TABLE areas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.areas TO anon;
GRANT ALL ON TABLE public.areas TO authenticated;
GRANT ALL ON TABLE public.areas TO service_role;


--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log TO anon;
GRANT ALL ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO service_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;


--
-- Name: TABLE experience_options; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.experience_options TO anon;
GRANT ALL ON TABLE public.experience_options TO authenticated;
GRANT ALL ON TABLE public.experience_options TO service_role;


--
-- Name: TABLE provider_applications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.provider_applications TO anon;
GRANT ALL ON TABLE public.provider_applications TO authenticated;
GRANT ALL ON TABLE public.provider_applications TO service_role;


--
-- Name: TABLE providers; Type: ACL; Schema: public; Owner: -
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.providers TO anon;
GRANT ALL ON TABLE public.providers TO authenticated;
GRANT ALL ON TABLE public.providers TO service_role;


--
-- Name: COLUMN providers.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.name; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(name) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.category_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(category_id) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.area_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(area_id) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.description; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(description) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.services; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(services) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.price_description; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(price_description) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.working_hours; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(working_hours) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.photo_url; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(photo_url) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.status; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(status) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.is_premium; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(is_premium) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.premium_expires_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(premium_expires_at) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.created_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(created_at) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.updated_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(updated_at) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.experience_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(experience_id) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.is_verified; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(is_verified) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.has_whatsapp; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(has_whatsapp) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.is_emergency_24h; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(is_emergency_24h) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.has_workshop; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(has_workshop) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.workshop_name; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(workshop_name) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.workshop_address; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(workshop_address) ON TABLE public.providers TO anon;


--
-- Name: COLUMN providers.working_hours_structured; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(working_hours_structured) ON TABLE public.providers TO anon;


--
-- Name: TABLE rate_limit_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.rate_limit_events TO anon;
GRANT ALL ON TABLE public.rate_limit_events TO authenticated;
GRANT ALL ON TABLE public.rate_limit_events TO service_role;


--
-- Name: TABLE rate_limit_policies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.rate_limit_policies TO anon;
GRANT ALL ON TABLE public.rate_limit_policies TO authenticated;
GRANT ALL ON TABLE public.rate_limit_policies TO service_role;


--
-- Name: TABLE reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.reports TO anon;
GRANT ALL ON TABLE public.reports TO authenticated;
GRANT ALL ON TABLE public.reports TO service_role;


--
-- Name: TABLE reviews; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.reviews TO anon;
GRANT ALL ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;


--
-- Name: TABLE service_suggestions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.service_suggestions TO anon;
GRANT ALL ON TABLE public.service_suggestions TO authenticated;
GRANT ALL ON TABLE public.service_suggestions TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--



-- Reference/lookup seed data
INSERT INTO public.app_settings VALUES ('app_name', 'أهل الصنعة', '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings VALUES ('tagline', 'كل صنعة عند أهلها', '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings VALUES ('logo_url', NULL, '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings VALUES ('contact_phone', NULL, '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings VALUES ('contact_whatsapp', NULL, '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings VALUES ('default_provider_status', 'active', '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.areas VALUES ('545b649f-c1c7-4e47-aae0-89acbc98a74e', 'مدينة نصر', 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.areas VALUES ('e2c6fab8-a66f-4dfd-9e8b-96657a291511', 'المعادي', 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.areas VALUES ('23a73edd-0df0-4d37-9d07-99cb34429cbb', 'حلوان', 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.areas VALUES ('9ac68f65-de94-4546-9759-2ed927da1926', 'شبرا', 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.areas VALUES ('dbb730ac-4ba1-4659-b8a0-91b14134f6a8', 'عين شمس', 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.areas VALUES ('2909f021-6620-4e53-b710-c764c8027509', 'الزمالك', 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.areas VALUES ('542a968d-28c4-4060-b536-9e537c5c9230', 'الهرم', 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.areas VALUES ('e433a4f7-3228-4e97-a4fd-ae3a40731fe9', 'فيصل', 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.areas VALUES ('2adf5f52-623d-41ac-b255-fedc3e34c6e2', '6 أكتوبر', 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.areas VALUES ('ffcaf291-c17d-4ad4-9495-f7f7b6a57897', 'القاهرة الجديدة', 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories VALUES ('7cb38f1c-b467-4582-9f44-6e0ed13088fa', 'سباكة', 'Droplets', 1, 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories VALUES ('bffb4de5-5290-49df-962e-7b98a4f574c7', 'كهرباء', 'Zap', 2, 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories VALUES ('7e550beb-7c22-4a18-bf69-3da718eadf10', 'نجارة', 'Hammer', 3, 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories VALUES ('3e0e36c3-f54d-4540-960d-96edc64b192d', 'دهانات وديكور', 'PaintRoller', 4, 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories VALUES ('ba9e04aa-7cf6-476e-bb86-7459bab958a2', 'تكييف وتبريد', 'Fan', 5, 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories VALUES ('05366886-baa2-44ec-8d7d-f3e2f02d640a', 'ألوميتال', 'Frame', 6, 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories VALUES ('9f602e8b-5b63-4628-84db-5dab8145a548', 'بلاط وسيراميك', 'Grid3x3', 7, 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories VALUES ('32fb9c2e-5f41-499d-affa-396d566cc4cc', 'حدادة', 'Ruler', 8, 'active', '2026-09-28 17:04:01.938863+00', '2026-09-28 17:04:01.938863+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories VALUES ('20fdfee4-80eb-4dc3-97ff-179362cbc57e', 'حلاقة', 'Scissors', 9, 'active', '2026-09-28 17:18:37.406828+00', '2026-09-28 17:18:37.406828+00') ON CONFLICT DO NOTHING;
INSERT INTO public.categories VALUES ('b80850bc-6d31-4fd5-9250-fb349eca2717', 'انظمة مراقبة', 'Bug', 10, 'active', '2026-09-28 17:19:29.175356+00', '2026-09-28 17:19:29.175356+00') ON CONFLICT DO NOTHING;
INSERT INTO public.experience_options VALUES ('a4279ed8-b236-414c-bbf5-816b58c8385c', 'أقل من سنة', 1, 'active', '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.experience_options VALUES ('313dd491-9be9-4877-a229-0179a9bb5ae2', '1 - 3 سنوات', 2, 'active', '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.experience_options VALUES ('cac1a87e-5656-4b4a-a031-31744ff86c71', '4 - 7 سنوات', 3, 'active', '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.experience_options VALUES ('0c09c669-9e31-4259-b949-8adb58d3df66', '8 - 10 سنوات', 4, 'active', '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.experience_options VALUES ('4fe99f49-111c-4282-9802-16d192d2e966', 'أكثر من 10 سنوات', 5, 'active', '2026-09-28 17:04:26.763235+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate_limit_policies VALUES ('report', 5, 600, '2026-09-28 17:05:30.421449+00') ON CONFLICT DO NOTHING;
INSERT INTO public.rate_limit_policies VALUES ('service_suggestion', 5, 600, '2026-09-28 17:05:30.421449+00') ON CONFLICT DO NOTHING;

-- Storage policies (bucket "provider-photos" is created via the storage tool, private, 5 MB)
CREATE POLICY "admin read provider photos" ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'provider-photos'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin upload provider photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'provider-photos'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin update provider photos" ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'provider-photos'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK ((bucket_id = 'provider-photos'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin delete provider photos" ON storage.objects FOR DELETE TO authenticated USING ((bucket_id = 'provider-photos'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role));
