CREATE POLICY reels_objects_read ON storage.objects FOR SELECT
  USING (bucket_id = 'reels');
CREATE POLICY reels_objects_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reels'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'organiser'));
CREATE POLICY reels_objects_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'reels' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'reels' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY reels_objects_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reels' AND (storage.foldername(name))[1] = auth.uid()::text);