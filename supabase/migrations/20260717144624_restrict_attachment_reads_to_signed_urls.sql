drop policy "attachments_storage_select_own" on storage.objects;

create policy "attachments_storage_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.allow_only_operation('storage.object.sign')
  );
