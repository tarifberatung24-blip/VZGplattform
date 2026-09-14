create policy "kintex_documents_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'households'
  and (storage.foldername(name))[2] in (
    select id::text from public.households where owner_id = (select auth.uid())
  )
);
