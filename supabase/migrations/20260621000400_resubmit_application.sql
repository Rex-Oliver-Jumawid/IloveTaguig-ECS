create or replace function public.resubmit_owner_application(
  application_id uuid,
  documents jsonb
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_owner uuid;
  current_status public.application_status;
  document jsonb;
  replaced_paths text[];
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(documents) <> 'array' or jsonb_array_length(documents) < 1 then
    raise exception 'At least one replacement document is required';
  end if;

  select owner_id, status
    into application_owner, current_status
    from public.applications
    where id = resubmit_owner_application.application_id
    for update;

  if application_owner is null or application_owner <> auth.uid() then
    raise exception 'Application not found';
  end if;

  if current_status <> 'Action Required' then
    raise exception 'Application is not awaiting corrections';
  end if;

  select coalesce(array_agg(storage_path), array[]::text[])
    into replaced_paths
    from public.application_documents
    where application_documents.application_id = resubmit_owner_application.application_id;

  delete from public.application_documents
    where application_documents.application_id = resubmit_owner_application.application_id;

  for document in select value from jsonb_array_elements(documents)
  loop
    if document->>'storage_path' not like auth.uid()::text || '/' || application_id::text || '/%' then
      raise exception 'Invalid document path';
    end if;

    insert into public.application_documents (
      application_id, owner_id, storage_path, file_name, mime_type, file_size
    ) values (
      resubmit_owner_application.application_id,
      auth.uid(),
      document->>'storage_path',
      document->>'file_name',
      document->>'mime_type',
      (document->>'file_size')::bigint
    );
  end loop;

  update public.applications
    set status = 'Pending Review'
    where id = resubmit_owner_application.application_id;

  return replaced_paths;
end;
$$;

revoke all on function public.resubmit_owner_application(uuid, jsonb) from public;
grant execute on function public.resubmit_owner_application(uuid, jsonb) to authenticated;
