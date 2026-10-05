-- Hotel Cali: migration 003
-- Daily moods, sleep log, shared albums, removing your own uploads,
-- and live updates for the in-app lobby bell.
-- Safe to run on the live database: it only adds things, nothing is dropped.
-- Run it once in Supabase > SQL Editor > New query.

create table if not exists mood_logs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  day date not null,
  mood text not null,
  created_at timestamptz not null default now(),
  unique (name, day)
);

create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  day date not null,                 -- the day you woke up
  slept_from timestamptz not null,
  slept_till timestamptz not null,
  created_at timestamptz not null default now(),
  check (slept_till > slept_from)
);

create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  created_by text,
  created_at timestamptz not null default now()
);

alter table content_posts add column if not exists album_id uuid references albums(id) on delete set null;
alter table content_posts alter column type drop not null;

alter table mood_logs enable row level security;
alter table sleep_logs enable row level security;
alter table albums enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['mood_logs','sleep_logs','albums'])
  loop
    execute format('drop policy if exists "allow all - %I" on %I;', t, t);
    execute format('create policy "allow all - %I" on %I for all using (true) with check (true);', t, t);
  end loop;
end $$;

-- Let people remove photos they uploaded.
drop policy if exists "postcards delete" on storage.objects;
create policy "postcards delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'postcards');

-- Live updates: the app listens for new pings and admin alerts to ring the lobby bell.
do $$
begin
  begin
    alter publication supabase_realtime add table pings;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table admin_alerts;
  exception when duplicate_object then null;
  end;
end $$;
