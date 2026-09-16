create policy "kintex_documents_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'households'
  and (storage.foldername(name))[2] in (
    select id::text from public.households where owner_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'households'
  and (storage.foldername(name))[2] in (
    select id::text from public.households where owner_id = (select auth.uid())
  )
);
