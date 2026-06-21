create type public.user_role as enum ('owner', 'admin');
create type public.application_status as enum (
  'Pending Review', 'Action Required', 'Approved',
  'Proceed to Barangay Hall', 'Complete', 'Rejected'
);
create type public.ownership_type as enum ('Sole Proprietorship', 'Partnership', 'Corporation');
create type public.application_type as enum ('New', 'Renewal');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'owner',
  initials text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  owner_full_name text not null,
  business_name text not null,
  nature_of_business text not null,
  ownership_type public.ownership_type not null,
  application_type public.application_type not null,
  contact_number text not null,
  business_address text not null,
  status public.application_status not null default 'Pending Review',
  remarks text,
  reference_no text unique,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  clerk_initial text,
  generated_clearance_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create table public.barangay_settings (
  id boolean primary key default true check (id),
  punong_barangay_name text not null,
  validity_year integer not null check (validity_year between 2020 and 2200),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create sequence public.clearance_reference_seq;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)), 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger applications_updated_at before update on public.applications for each row execute procedure public.set_updated_at();
create trigger settings_updated_at before update on public.barangay_settings for each row execute procedure public.set_updated_at();

create index applications_owner_id_idx on public.applications(owner_id);
create index applications_status_idx on public.applications(status);
create index application_documents_application_id_idx on public.application_documents(application_id);

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.barangay_settings enable row level security;

create policy "profiles_read_self_or_admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy "profiles_update_self" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "applications_read_owner_or_admin" on public.applications for select to authenticated
using (owner_id = auth.uid() or public.is_admin());
create policy "applications_insert_owner" on public.applications for insert to authenticated
with check (owner_id = auth.uid() and status = 'Pending Review');
create policy "applications_update_admin" on public.applications for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "documents_read_owner_or_admin" on public.application_documents for select to authenticated
using (owner_id = auth.uid() or public.is_admin());
create policy "documents_insert_owner" on public.application_documents for insert to authenticated
with check (owner_id = auth.uid() and exists (select 1 from public.applications a where a.id = application_id and a.owner_id = auth.uid()));
create policy "documents_delete_owner_or_admin" on public.application_documents for delete to authenticated
using (owner_id = auth.uid() or public.is_admin());

create policy "settings_admin_all" on public.barangay_settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

insert into public.barangay_settings (punong_barangay_name, validity_year)
values ('To be configured', extract(year from current_date)::integer);
