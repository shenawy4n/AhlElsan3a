-- Create Supabase Storage bucket for provider photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-photos',
  'provider-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS Policies:
-- 1. Public Read: anyone can view photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read provider photos' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Public read provider photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'provider-photos');
  END IF;

  -- 2. Admin Insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin upload provider photos' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Admin upload provider photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'provider-photos'
      AND public.has_role(auth.uid(), 'admin')
    );
  END IF;

  -- 3. Admin Update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin update provider photos' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Admin update provider photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'provider-photos'
      AND public.has_role(auth.uid(), 'admin')
    );
  END IF;

  -- 4. Admin Delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin delete provider photos' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Admin delete provider photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'provider-photos'
      AND public.has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;
