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
      when 'Approved' then return new; -- Internal Print Queue state; owners remain Under Review.
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
