-- Approval queues the application. PDF generation is an explicit Print Queue action.

create or replace function public.review_application(
  application_id uuid,
  next_status public.application_status,
  admin_remarks text default null,
  checklist jsonb default '{}'::jsonb
)
returns public.applications
language plpgsql security definer set search_path = '' as $$
declare reviewed public.applications; initials text; issued_at timestamptz; reference text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if next_status not in ('Action Required', 'Rejected', 'Approved') then raise exception 'Invalid review status'; end if;
  if next_status in ('Action Required', 'Rejected') and nullif(trim(admin_remarks), '') is null then
    raise exception 'Remarks are required for this action';
  end if;
  if jsonb_typeof(checklist) <> 'object' then raise exception 'Checklist must be an object'; end if;

  if next_status = 'Approved' then
    if not coalesce((checklist->>'address_verified')::boolean, false)
       or not coalesce((checklist->>'identity_verified')::boolean, false)
       or not coalesce((checklist->>'documents_complete')::boolean, false)
       or not coalesce((checklist->>'records_clear')::boolean, false) then
      raise exception 'Every verification check is required for approval';
    end if;
    select p.initials into initials from public.profiles p where p.id = auth.uid();
    if nullif(trim(initials), '') is null then raise exception 'Admin clerk initials must be configured'; end if;
    issued_at := now();
    reference := 'NAPINDAN-' || to_char(issued_at at time zone 'Asia/Manila', 'YYYY') || '-' ||
      lpad(nextval('public.clearance_reference_seq')::text, 6, '0');
  end if;

  update public.applications
     set status = next_status,
         remarks = nullif(trim(admin_remarks), ''),
         verification_checklist = checklist,
         reference_no = case when next_status = 'Approved' then reference else reference_no end,
         approved_at = case when next_status = 'Approved' then issued_at else approved_at end,
         approved_by = case when next_status = 'Approved' then auth.uid() else approved_by end,
         clerk_initial = case when next_status = 'Approved' then trim(initials) else clerk_initial end
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
returns jsonb language plpgsql security definer set search_path = '' as $$
declare app public.applications; settings public.barangay_settings;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into app from public.applications where id = prepare_clearance.application_id for update;
  if app.id is null then raise exception 'Application not found'; end if;
  if app.status <> 'Approved' then raise exception 'Application is not in the print queue'; end if;
  if app.reference_no is null or app.approved_at is null or app.approved_by is null or nullif(trim(app.clerk_initial), '') is null then
    raise exception 'Approval metadata is incomplete';
  end if;
  select * into settings from public.barangay_settings where id = true;
  if settings.id is null or settings.punong_barangay_name = 'To be configured' then
    raise exception 'Barangay clearance settings must be configured';
  end if;
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
returns public.application_status language plpgsql security definer set search_path = '' as $$
declare result public.application_status;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if clearance_path !~ ('^' || application_id::text || '/[A-Za-z0-9._-]+[.]pdf$') then raise exception 'Invalid generated clearance path'; end if;
  update public.applications set generated_clearance_path = clearance_path, status = 'Proceed to Barangay Hall'
   where id = finalize_clearance.application_id and status = 'Approved'
     and reference_no is not null and approved_at is not null and approved_by is not null
  returning status into result;
  if result is null then raise exception 'Clearance cannot be finalized from the current state'; end if;
  return result;
end;
$$;
