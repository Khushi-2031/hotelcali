-- Hotel Cali — Supabase schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query),
-- then run supabase/migrations/002_pings_tab_uploads.sql for the newer features.

create extension if not exists "pgcrypto";

create table if not exists app_meta (
  key text primary key,
  value jsonb not null
);

create table if not exists duty_points (
  name text primary key,
  points int not null default 0
);

create table if not exists duty_log (
  id uuid primary key default gen_random_uuid(),
  week_key text not null,
  duty text not null,
  person text not null,
  created_at timestamptz not null default now(),
  unique (week_key, duty)
);

create table if not exists blinkit_orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  item text not null,
  run text not null,
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists wakeup_calls (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  room text,
  wake_at timestamptz not null,
  notes text,
  critical boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  room text not null,
  side text,
  category text not null,
  urgency int not null default 3,
  details text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists floor_fund (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists content_posts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  link text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists washer_log (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration int,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mood text not null,
  note text,
  plus_ones text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists spc_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  to_person text not null,
  details text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists song_queue (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  song text not null,
  created_at timestamptz not null default now()
);

create table if not exists general_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  details text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  type text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create table if not exists water_checkins (
  id uuid primary key default gen_random_uuid(),
  day date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists admin_alerts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: this app is meant for a small trusted group sharing one
-- anon key, so policies below simply allow full read/write to anyone holding
-- that key. Do not reuse this schema for anything beyond a private floor app.
alter table app_meta enable row level security;
alter table duty_points enable row level security;
alter table duty_log enable row level security;
alter table blinkit_orders enable row level security;
alter table wakeup_calls enable row level security;
alter table maintenance_requests enable row level security;
alter table floor_fund enable row level security;
alter table content_posts enable row level security;
alter table washer_log enable row level security;
alter table plans enable row level security;
alter table spc_requests enable row level security;
alter table song_queue enable row level security;
alter table general_requests enable row level security;
alter table feedback enable row level security;
alter table water_checkins enable row level security;
alter table admin_alerts enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'app_meta','duty_points','duty_log','blinkit_orders','wakeup_calls',
    'maintenance_requests','floor_fund','content_posts','washer_log','plans',
    'spc_requests','song_queue','general_requests','feedback','water_checkins','admin_alerts'
  ])
  loop
    execute format('drop policy if exists "allow all - %I" on %I;', t, t);
    execute format('create policy "allow all - %I" on %I for all using (true) with check (true);', t, t);
  end loop;
end $$;
