-- Restrict privileged RPCs to signed-in users. RPC bodies perform per-user or admin authorization.
revoke execute on function public.complete_clearance(uuid) from public, anon;
revoke execute on function public.finalize_clearance(uuid, text) from public, anon;
revoke execute on function public.get_generated_clearance(uuid) from public, anon;
revoke execute on function public.prepare_clearance(uuid, text, jsonb) from public, anon;
revoke execute on function public.resubmit_owner_application(uuid, jsonb) from public, anon;
revoke execute on function public.review_application(uuid, public.application_status, text, jsonb) from public, anon;
revoke execute on function public.is_admin() from public, anon;

-- Trigger-only functions should not be exposed as callable RPCs.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_application_update() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

grant execute on function public.complete_clearance(uuid) to authenticated;
grant execute on function public.finalize_clearance(uuid, text) to authenticated;
grant execute on function public.get_generated_clearance(uuid) to authenticated;
grant execute on function public.prepare_clearance(uuid, text, jsonb) to authenticated;
grant execute on function public.resubmit_owner_application(uuid, jsonb) to authenticated;
grant execute on function public.review_application(uuid, public.application_status, text, jsonb) to authenticated;
grant execute on function public.is_admin() to authenticated;
