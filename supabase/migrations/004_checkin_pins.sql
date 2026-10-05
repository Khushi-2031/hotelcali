-- Hotel Cali: migration 004
-- Check-in PINs. PINs are stored hashed (bcrypt) in a locked table that the app
-- cannot read directly. The app can only call the three functions below.
-- Safe to run on the live database: it only adds things.
-- Run it once in Supabase > SQL Editor > New query.

create extension if not exists pgcrypto with schema extensions;

create table if not exists guest_pins (
  name text primary key,
  pin_hash text not null,
  created_at timestamptz not null default now()
);

-- Locked: row level security on with no policies, and no direct grants.
alter table guest_pins enable row level security;
revoke all on guest_pins from anon, authenticated;

create or replace function public.has_pin(p_name text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (select 1 from guest_pins where name = p_name);
$$;

-- Only works the first time for a name. Returns false if a PIN already exists.
create or replace function public.set_pin(p_name text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be 4 digits';
  end if;
  insert into guest_pins (name, pin_hash)
  values (p_name, crypt(p_pin, gen_salt('bf')))
  on conflict (name) do nothing;
  return found;
end;
$$;

create or replace function public.check_pin(p_name text, p_pin text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from guest_pins
    where name = p_name and pin_hash = crypt(p_pin, pin_hash)
  );
$$;

revoke all on function public.has_pin(text) from public;
revoke all on function public.set_pin(text, text) from public;
revoke all on function public.check_pin(text, text) from public;
grant execute on function public.has_pin(text) to anon, authenticated;
grant execute on function public.set_pin(text, text) to anon, authenticated;
grant execute on function public.check_pin(text, text) to anon, authenticated;

-- To reset someone's forgotten PIN (run by hand in the SQL Editor):
--   delete from guest_pins where name = 'Full Name';
-- They then set a new one next time they check in.
