-- Phase 4: trusted clearance preparation/finalization and physical release.

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
declare reviewed public.applications;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if next_status not in ('Action Required', 'Rejected') then
    raise exception 'Approval must use the clearance generation pipeline';
  end if;
  if nullif(trim(admin_remarks), '') is null then
    raise exception 'Remarks are required for this action';
  end if;
  if jsonb_typeof(checklist) <> 'object' then raise exception 'Checklist must be an object'; end if;

  update public.applications
     set status = next_status, remarks = trim(admin_remarks), verification_checklist = checklist
   where id = review_application.application_id and status = 'Pending Review'
  returning * into reviewed;
  if reviewed.id is null then raise exception 'Application is not pending review'; end if;
  return reviewed;
end;
$$;

create or replace function public.prepare_clearance(
  application_id uuid,
  admin_remarks text default null,
  checklist jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.applications;
  settings public.barangay_settings;
  initials text;
  issued_at timestamptz;
  reference text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if jsonb_typeof(checklist) <> 'object'
     or not coalesce((checklist->>'address_verified')::boolean, false)
     or not coalesce((checklist->>'identity_verified')::boolean, false)
     or not coalesce((checklist->>'documents_complete')::boolean, false)
     or not coalesce((checklist->>'records_clear')::boolean, false) then
    raise exception 'Every verification check is required for approval';
  end if;

  select * into app from public.applications
   where id = prepare_clearance.application_id for update;
  if app.id is null then raise exception 'Application not found'; end if;
  if app.status <> 'Pending Review' then raise exception 'Application is not pending review'; end if;

  select p.initials into initials from public.profiles p where p.id = auth.uid();
  if nullif(trim(initials), '') is null then raise exception 'Admin clerk initials must be configured'; end if;
  select * into settings from public.barangay_settings where id = true;
  if settings.id is null or settings.punong_barangay_name = 'To be configured' then
    raise exception 'Barangay clearance settings must be configured';
  end if;

  issued_at := coalesce(app.approved_at, now());
  reference := coalesce(app.reference_no,
    'NAPINDAN-' || to_char(issued_at at time zone 'Asia/Manila', 'YYYY') || '-' ||
    lpad(nextval('public.clearance_reference_seq')::text, 6, '0'));

  update public.applications
     set reference_no = reference,
         approved_at = issued_at,
         approved_by = auth.uid(),
         clerk_initial = trim(initials),
         remarks = nullif(trim(admin_remarks), ''),
         verification_checklist = checklist
   where id = app.id
  returning * into app;

  return jsonb_build_object(
    'id', app.id, 'owner_full_name', app.owner_full_name, 'business_name', app.business_name,
    'business_address', app.business_address, 'ownership_type', app.ownership_type,
    'application_type', app.application_type, 'reference_no', app.reference_no,
    'approved_at', app.approved_at, 'clerk_initial', app.clerk_initial,
    'validity_date', make_date(settings.validity_year, 12, 31),
    'approved_by_name', settings.punong_barangay_name
  );
end;
$$;

create or replace function public.finalize_clearance(application_id uuid, clearance_path text)
returns public.application_status
language plpgsql security definer set search_path = '' as $$
declare result public.application_status;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if clearance_path !~ ('^' || application_id::text || '/[A-Za-z0-9._-]+[.]pdf$') then
    raise exception 'Invalid generated clearance path';
  end if;
  update public.applications set generated_clearance_path = clearance_path, status = 'Proceed to Barangay Hall'
   where id = finalize_clearance.application_id and status = 'Pending Review'
     and reference_no is not null and approved_at is not null and approved_by is not null
  returning status into result;
  if result is null then raise exception 'Clearance cannot be finalized from the current state'; end if;
  return result;
end;
$$;

create or replace function public.get_generated_clearance(application_id uuid)
returns jsonb language plpgsql security definer set search_path = '' stable as $$
declare app public.applications; approver text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into app from public.applications where id = get_generated_clearance.application_id;
  if app.id is null or app.generated_clearance_path is null then raise exception 'Generated clearance not found'; end if;
  select full_name into approver from public.profiles where id = app.approved_by;
  return jsonb_build_object(
    'id', app.id, 'owner_full_name', app.owner_full_name, 'business_name', app.business_name,
    'business_address', app.business_address, 'ownership_type', app.ownership_type,
    'application_type', app.application_type, 'status', app.status, 'reference_no', app.reference_no,
    'approved_at', app.approved_at, 'approved_by_name', approver,
    'clerk_initial', app.clerk_initial, 'generated_clearance_path', app.generated_clearance_path
  );
end;
$$;

create or replace function public.complete_clearance(application_id uuid)
returns public.application_status language plpgsql security definer set search_path = '' as $$
declare result public.application_status;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  update public.applications set status = 'Complete'
   where id = complete_clearance.application_id and status = 'Proceed to Barangay Hall'
     and generated_clearance_path is not null
  returning status into result;
  if result is null then raise exception 'Only a clearance awaiting physical release can be completed'; end if;
  return result;
end;
$$;

revoke all on function public.prepare_clearance(uuid, text, jsonb) from public;
revoke all on function public.finalize_clearance(uuid, text) from public;
revoke all on function public.get_generated_clearance(uuid) from public;
revoke all on function public.complete_clearance(uuid) from public;
grant execute on function public.prepare_clearance(uuid, text, jsonb) to authenticated;
grant execute on function public.finalize_clearance(uuid, text) to authenticated;
grant execute on function public.get_generated_clearance(uuid) to authenticated;
grant execute on function public.complete_clearance(uuid) to authenticated;

-- Owners retain row access but cannot select the private Storage object path.
revoke select on public.applications from authenticated;
grant select (
  id, owner_id, owner_full_name, business_name, nature_of_business, ownership_type,
  application_type, contact_number, business_address, status, remarks, reference_no,
  approved_at, approved_by, clerk_initial, created_at, updated_at, verification_checklist
) on public.applications to authenticated;

create or replace function public.notify_application_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare notification_title text; notification_message text; notification_type text;
begin
  if tg_op = 'INSERT' then
    notification_title := 'Application Submitted';
    notification_message := format('Clearance application for %s has been submitted successfully.', new.business_name);
    notification_type := 'info';
  elsif tg_op = 'UPDATE' and (old.status <> new.status or old.remarks is distinct from new.remarks) then
    case new.status
      when 'Action Required' then
        notification_title := 'Action Required';
        notification_message := format('Your application for %s needs updates: %s', new.business_name, coalesce(new.remarks, 'Please review remarks.'));
        notification_type := 'warning';
      when 'Proceed to Barangay Hall' then
        notification_title := 'Proceed to Barangay Hall';
        notification_message := format('Your clearance for %s is ready for physical processing and release at Barangay Hall.', new.business_name);
        notification_type := 'success';
      when 'Complete' then
        notification_title := 'Clearance Complete';
        notification_message := format('Your Barangay Business Clearance for %s has been released and marked complete.', new.business_name);
        notification_type := 'success';
      when 'Rejected' then
        notification_title := 'Application Rejected';
        notification_message := format('Your application for %s was rejected: %s', new.business_name, coalesce(new.remarks, 'Please contact the clerk.'));
        notification_type := 'error';
      else
        notification_title := 'Status Updated';
        notification_message := format('Your application for %s status is now: %s', new.business_name, new.status);
        notification_type := 'info';
    end case;
  else return new;
  end if;
  insert into public.notifications (user_id, title, message, type, reference_id)
  values (new.owner_id, notification_title, notification_message, notification_type, new.id);
  return new;
end;
$$;
