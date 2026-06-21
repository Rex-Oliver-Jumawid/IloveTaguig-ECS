-- Create public.notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info', -- 'info', 'success', 'warning', 'error'
  is_read boolean not null default false,
  reference_id uuid, -- links to applications.id
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Add RLS Policies
create policy "users_read_own_notifications" on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "users_update_own_notifications" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users_delete_own_notifications" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- Indexes for performance
create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_is_read_idx on public.notifications(is_read);

-- Trigger function to automatically create notifications on application updates
create or replace function public.notify_application_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  notification_title text;
  notification_message text;
  notification_type text;
begin
  -- Only trigger if INSERT, or if UPDATE has changed status/remarks
  if (tg_op = 'INSERT') then
    notification_title := 'Application Submitted';
    notification_message := format('Clearance application for %s has been submitted successfully.', new.business_name);
    notification_type := 'info';
  elsif (tg_op = 'UPDATE' and (old.status != new.status or old.remarks is distinct from new.remarks)) then
    if (new.status = 'Action Required') then
      notification_title := 'Action Required';
      notification_message := format('Your application for %s needs updates: %s', new.business_name, coalesce(new.remarks, 'Please review remarks.'));
      notification_type := 'warning';
    elsif (new.status = 'Proceed to Barangay Hall') then
      notification_title := 'Ready for Claiming';
      notification_message := format('Your application for %s has been processed. Please proceed to the Barangay Hall.', new.business_name);
      notification_type := 'success';
    elsif (new.status = 'Approved') then
      notification_title := 'Application Approved';
      notification_message := format('Your Barangay Business Clearance for %s has been approved!', new.business_name);
      notification_type := 'success';
    elsif (new.status = 'Rejected') then
      notification_title := 'Application Rejected';
      notification_message := format('Your application for %s was rejected: %s', new.business_name, coalesce(new.remarks, 'Please contact the clerk.'));
      notification_type := 'error';
    else
      notification_title := 'Status Updated';
      notification_message := format('Your application for %s status is now: %s', new.business_name, new.status);
      notification_type := 'info';
    end if;
  else
    return new;
  end if;

  -- Insert notification for the owner
  insert into public.notifications (user_id, title, message, type, reference_id)
  values (new.owner_id, notification_title, notification_message, notification_type, new.id);

  return new;
end;
$$;

-- Create the trigger
create trigger on_application_inserted_or_updated
after insert or update on public.applications
for each row execute procedure public.notify_application_update();
