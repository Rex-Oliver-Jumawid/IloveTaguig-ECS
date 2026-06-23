create or replace function public.notify_application_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  notification_title text;
  notification_message text;
  notification_type text;
begin
  if (tg_op = 'INSERT') then
    notification_title := 'Application Submitted';
    notification_message := format('Clearance application for %s has been submitted successfully.', new.business_name);
    notification_type := 'info';

    insert into public.notifications (user_id, title, message, type, reference_id)
    values (new.owner_id, notification_title, notification_message, notification_type, new.id);

    insert into public.notifications (user_id, title, message, type, reference_id)
    select
      p.id,
      'New Application Received',
      format('%s submitted a %s business clearance application for %s.', new.owner_full_name, new.application_type, new.business_name),
      'info',
      new.id
    from public.profiles p
    where p.role = 'admin';

    return new;
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

  insert into public.notifications (user_id, title, message, type, reference_id)
  values (new.owner_id, notification_title, notification_message, notification_type, new.id);

  return new;
end;
$$;
