CREATE TABLE public.rate_limit_policies (
  form_type text PRIMARY KEY,
  max_requests integer NOT NULL DEFAULT 5 CHECK (max_requests > 0),
  window_seconds integer NOT NULL DEFAULT 600 CHECK (window_seconds > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limit_policies TO service_role;
ALTER TABLE public.rate_limit_policies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  form_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limit_events TO service_role;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX rate_limit_events_ip_form_created_idx ON public.rate_limit_events (ip, form_type, created_at DESC);
CREATE INDEX rate_limit_events_created_idx ON public.rate_limit_events (created_at);

-- Atomic check-and-record. Limits come from rate_limit_policies (default 5 / 10 min); callers cannot override them.
CREATE OR REPLACE FUNCTION public.check_rate_limit(_ip text, _form_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Deletes only records older than the longest configured window (min 10 minutes).
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_keep integer; v_deleted integer;
BEGIN
  SELECT GREATEST(600, COALESCE(max(window_seconds), 600)) INTO v_keep FROM public.rate_limit_policies;
  DELETE FROM public.rate_limit_events WHERE created_at < now() - make_interval(secs => v_keep);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_rate_limit_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_events() TO service_role;

INSERT INTO public.rate_limit_policies (form_type) VALUES ('report'), ('service_suggestion');