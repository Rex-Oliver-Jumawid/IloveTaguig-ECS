insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('application-docs', 'application-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('generated-clearances', 'generated-clearances', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "owner_upload_application_docs" on storage.objects for insert to authenticated
with check (bucket_id = 'application-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner_or_admin_read_application_docs" on storage.objects for select to authenticated
using (bucket_id = 'application-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "owner_or_admin_delete_application_docs" on storage.objects for delete to authenticated
using (bucket_id = 'application-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create policy "admin_manage_generated_clearances" on storage.objects for all to authenticated
using (bucket_id = 'generated-clearances' and public.is_admin())
with check (bucket_id = 'generated-clearances' and public.is_admin());
