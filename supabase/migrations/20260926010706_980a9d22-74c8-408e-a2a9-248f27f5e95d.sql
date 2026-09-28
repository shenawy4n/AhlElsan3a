DROP POLICY IF EXISTS "anyone can report" ON public.reports;
DROP POLICY IF EXISTS "anyone suggest" ON public.service_suggestions;
REVOKE INSERT ON public.reports FROM anon;
REVOKE INSERT ON public.service_suggestions FROM anon;