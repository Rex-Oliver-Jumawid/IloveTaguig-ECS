-- Restore the original stored PDF generation -> in-app preview -> download flow.
-- Generated certificates remain private and accessible only to authenticated administrators.
grant execute on function public.finalize_clearance(uuid, text) to authenticated;
grant execute on function public.complete_clearance(uuid) to authenticated;

-- Admins can create read-only signed URLs to view the already-generated PDFs in-app.
drop policy if exists "admin_read_generated_clearances_demo" on storage.objects;
create policy "admin_read_generated_clearances"
on storage.objects for select to authenticated
using (bucket_id = 'generated-clearances' and public.is_admin());
