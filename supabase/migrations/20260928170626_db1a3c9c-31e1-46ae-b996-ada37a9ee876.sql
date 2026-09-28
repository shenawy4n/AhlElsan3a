CREATE POLICY "public read provider photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'provider-photos');

CREATE POLICY "admin upload provider photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provider-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update provider photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'provider-photos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'provider-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete provider photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'provider-photos' AND public.has_role(auth.uid(), 'admin'));

DELETE FROM public.user_roles WHERE role = 'admin';