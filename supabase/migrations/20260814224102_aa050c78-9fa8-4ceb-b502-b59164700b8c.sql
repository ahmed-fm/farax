CREATE POLICY "read documents when permitted" ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.storage_path = storage.objects.name
      AND public.can_read_document(d.id, auth.uid())
  )
);

CREATE POLICY "upload to own folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "update own files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid())));

CREATE POLICY "delete own files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid())));