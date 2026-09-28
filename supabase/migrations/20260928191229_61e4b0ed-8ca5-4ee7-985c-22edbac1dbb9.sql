DROP POLICY IF EXISTS "public read settings" ON public.app_settings;
DROP POLICY IF EXISTS "public read provider photos" ON storage.objects;
CREATE POLICY "admin read provider photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'provider-photos' AND public.has_role(auth.uid(), 'admin'));