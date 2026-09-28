REVOKE EXECUTE ON FUNCTION public.is_owner(uuid), public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid), public.claim_first_admin() TO authenticated;