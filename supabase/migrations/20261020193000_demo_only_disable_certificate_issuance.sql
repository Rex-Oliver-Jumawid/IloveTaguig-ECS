-- This deployment is a classroom demonstration, not an issuing authority.
-- Keep generated clearance documents private and prevent certificate issuance transitions.
revoke execute on function public.finalize_clearance(uuid, text) from authenticated;
revoke execute on function public.complete_clearance(uuid) from authenticated;

drop policy if exists "admin_manage_generated_clearances" on storage.objects;
drop policy if exists "admin_read_generated_clearances_demo" on storage.objects;
create policy "admin_read_generated_clearances_demo"
on storage.objects for select to authenticated
using (bucket_id = 'generated-clearances' and public.is_admin());
