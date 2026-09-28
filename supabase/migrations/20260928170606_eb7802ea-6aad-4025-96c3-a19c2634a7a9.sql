CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL CHECK (char_length(btrim(reviewer_name)) BETWEEN 2 AND 60),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by_email text
);

CREATE INDEX reviews_provider_status_idx ON public.reviews (provider_id, status);
CREATE INDEX reviews_status_created_idx ON public.reviews (status, created_at DESC);

GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public reads only approved reviews
CREATE POLICY "public read approved reviews" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'));

-- Anyone can submit a review (starts as pending)
CREATE POLICY "anyone can review" ON public.reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending'
              AND EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.status = 'active'));

-- Admins can update (approve/reject) and delete
CREATE POLICY "admin update reviews" ON public.reviews
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete reviews" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== Review moderation RPCs =====
CREATE OR REPLACE FUNCTION public.approve_review(_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.reject_review(_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.delete_review(_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ===== Public helpers =====
-- Average rating + count per provider (approved only)
CREATE OR REPLACE FUNCTION public.provider_rating(_provider_id uuid)
RETURNS TABLE (avg_rating numeric, review_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0), COUNT(*)
  FROM public.reviews
  WHERE provider_id = _provider_id AND status = 'approved'
$$;

-- Pending review count for admin badge
CREATE OR REPLACE FUNCTION public.pending_reviews_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin') THEN
    (SELECT count(*)::integer FROM public.reviews WHERE status = 'pending')
  ELSE NULL END
$$;

REVOKE EXECUTE ON FUNCTION public.approve_review(uuid), public.reject_review(uuid), public.delete_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_review(uuid), public.reject_review(uuid), public.delete_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_rating(uuid), public.pending_reviews_count() TO anon, authenticated;