-- Hotel Cali: migration 002
-- Adds targeted pings, front desk requests, chhota runs, Settle Up (expense splitting),
-- SPC broadcasts and postcard uploads.
-- Safe to run on the live database: it only adds things, nothing is dropped.
-- Run it once in Supabase > SQL Editor > New query.

create table if not exists pings (
  id uuid primary key default gen_random_uuid(),
  from_name text not null,
  recipients text[] not null default '{}',   -- full names, or {'ALL'}
  kind text not null default 'general',
  title text,
  body text,
  created_at timestamptz not null default now()
);

create table if not exists front_desk_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  details text not null,
  claimed_by text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists chhota_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text not null,
  note text,
  recipients text[] not null default '{}',
  asks text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10,2) not null check (amount > 0),
  paid_by text not null,
  split_type text not null default 'equal',  -- equal | exact | percent
  shares jsonb not null,                     -- { "Full Name": owed_amount, ... }
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  from_name text not null,                   -- who paid back
  to_name text not null,                     -- who received it
  amount numeric(10,2) not null check (amount > 0),
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists spc_broadcasts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  recipients text[] not null default '{}',
  message text not null,
  created_at timestamptz not null default now()
);

-- Postcards can now hold an uploaded file instead of a link.
alter table content_posts alter column link drop not null;
alter table content_posts add column if not exists file_path text;
alter table content_posts add column if not exists file_type text;

alter table pings enable row level security;
alter table front_desk_requests enable row level security;
alter table chhota_runs enable row level security;
alter table expenses enable row level security;
alter table settlements enable row level security;
alter table spc_broadcasts enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'pings','front_desk_requests','chhota_runs','expenses','settlements','spc_broadcasts'
  ])
  loop
    execute format('drop policy if exists "allow all - %I" on %I;', t, t);
    execute format('create policy "allow all - %I" on %I for all using (true) with check (true);', t, t);
  end loop;
end $$;

-- Storage bucket for postcard photos and videos (50 MB per file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('postcards', 'postcards', true, 52428800)
on conflict (id) do nothing;

drop policy if exists "postcards upload" on storage.objects;
create policy "postcards upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'postcards');

drop policy if exists "postcards read" on storage.objects;
create policy "postcards read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'postcards');
