-- Reels: allow any authenticated user to post their own reel
DROP POLICY IF EXISTS reels_insert_organiser ON public.reels;
DROP POLICY IF EXISTS reels_insert_own ON public.reels;
CREATE POLICY reels_insert_own ON public.reels
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = organiser_id);

-- Storage: rebuild the reels bucket policies so any signed-in user can manage files in their own folder
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'reels%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

CREATE POLICY reels_storage_read ON storage.objects
  FOR SELECT USING (bucket_id = 'reels');
CREATE POLICY reels_storage_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reels' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY reels_storage_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'reels' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY reels_storage_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reels' AND (storage.foldername(name))[1] = auth.uid()::text);