alter table public.applications
  add column verification_checklist jsonb not null default '{}'::jsonb;

drop policy if exists "applications_update_admin" on public.applications;

create or replace function public.review_application(
  application_id uuid,
  next_status public.application_status,
  admin_remarks text default null,
  checklist jsonb default '{}'::jsonb
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewed public.applications;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if next_status not in ('Action Required', 'Rejected', 'Approved') then
    raise exception 'Invalid review status';
  end if;

  if next_status in ('Action Required', 'Rejected') and nullif(trim(admin_remarks), '') is null then
    raise exception 'Remarks are required for this action';
  end if;

  if jsonb_typeof(checklist) <> 'object' then
    raise exception 'Checklist must be an object';
  end if;

  update public.applications
     set status = next_status,
         remarks = nullif(trim(admin_remarks), ''),
         verification_checklist = checklist,
         approved_at = case when next_status = 'Approved' then now() else null end,
         approved_by = case when next_status = 'Approved' then auth.uid() else null end,
         clerk_initial = case when next_status = 'Approved'
           then (select initials from public.profiles where id = auth.uid())
           else null end
   where id = review_application.application_id
     and status = 'Pending Review'
  returning * into reviewed;

  if reviewed.id is null then
    raise exception 'Application is not pending review';
  end if;

  return reviewed;
end;
$$;

revoke all on function public.review_application(uuid, public.application_status, text, jsonb) from public;
grant execute on function public.review_application(uuid, public.application_status, text, jsonb) to authenticated;
