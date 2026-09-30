-- Public forms must go through the server gateway (validation, honeypot, rate limit).
-- The gateway writes with server credentials, so direct browser inserts are no longer needed.
DROP POLICY IF EXISTS "anyone can review" ON public.reviews;
DROP POLICY IF EXISTS "anyone can report" ON public.reports;
DROP POLICY IF EXISTS "anyone can apply" ON public.provider_applications;
DROP POLICY IF EXISTS "anyone suggest" ON public.service_suggestions;
REVOKE INSERT ON public.reviews, public.reports, public.provider_applications, public.service_suggestions FROM anon, authenticated;