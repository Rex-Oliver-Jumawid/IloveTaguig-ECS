create or replace function public.submit_owner_application(
  application_id uuid,
  owner_full_name text,
  business_name text,
  nature_of_business text,
  ownership_type public.ownership_type,
  application_type public.application_type,
  contact_number text,
  business_address text,
  documents jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  document jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(documents) <> 'array' or jsonb_array_length(documents) < 1 then
    raise exception 'At least one supporting document is required';
  end if;

  insert into public.applications (
    id, owner_id, owner_full_name, business_name, nature_of_business,
    ownership_type, application_type, contact_number, business_address
  ) values (
    application_id, auth.uid(), trim(owner_full_name), trim(business_name), trim(nature_of_business),
    ownership_type, application_type, trim(contact_number), trim(business_address)
  );

  for document in select value from jsonb_array_elements(documents)
  loop
    if document->>'storage_path' not like auth.uid()::text || '/' || application_id::text || '/%' then
      raise exception 'Invalid document path';
    end if;

    insert into public.application_documents (
      application_id, owner_id, storage_path, file_name, mime_type, file_size
    ) values (
      application_id,
      auth.uid(),
      document->>'storage_path',
      document->>'file_name',
      document->>'mime_type',
      (document->>'file_size')::bigint
    );
  end loop;

  return application_id;
end;
$$;

revoke all on function public.submit_owner_application(uuid, text, text, text, public.ownership_type, public.application_type, text, text, jsonb) from public;
grant execute on function public.submit_owner_application(uuid, text, text, text, public.ownership_type, public.application_type, text, text, jsonb) to authenticated;
