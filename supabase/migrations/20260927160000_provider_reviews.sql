-- Provider Reviews & Ratings System
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL CHECK (char_length(btrim(comment)) >= 3 AND char_length(comment) <= 500),
  reviewer_name text CHECK (reviewer_name IS NULL OR char_length(reviewer_name) <= 50),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

CREATE INDEX IF NOT EXISTS idx_reviews_provider_status ON public.reviews (provider_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);

-- Grants
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS: Public can only view approved reviews; admins can view all
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'public read approved reviews') THEN
    CREATE POLICY "public read approved reviews" ON public.reviews
      FOR SELECT TO anon, authenticated
      USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'admin manage reviews') THEN
    CREATE POLICY "admin manage reviews" ON public.reviews
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Rate limit policy: 3 reviews per 10 minutes per IP
INSERT INTO public.rate_limit_policies (form_type, max_requests, window_seconds)
VALUES ('review', 3, 600)
ON CONFLICT (form_type) DO NOTHING;

-- Admin moderation functions
CREATE OR REPLACE FUNCTION public.approve_review(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.reviews
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.reject_review(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.reviews
  SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_review(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.reviews WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.approve_review(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_review(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_review(uuid) TO authenticated;
