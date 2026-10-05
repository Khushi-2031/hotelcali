-- Hotel Cali: migration 005
-- Activity log: app opens, tab visits and button taps.
-- The app can only ADD rows. Reading them goes through activity_feed(), which
-- needs Khushi's check-in PIN, so nobody else on the floor can pull the log.
-- Safe to run on the live database: it only adds things.
-- Run it once in Supabase > SQL Editor > New query.

create table if not exists activity_log (
  id bigserial primary key,
  name text not null,
  room text,
  kind text not null,          -- open | tab | tap
  tab text,                    -- which tab they were on
  target text,                 -- tab opened, or the button label
  device text,                 -- phone | desktop, plus "app" if installed to Home Screen
  session text,                -- one id per app visit, groups a person's taps together
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_idx on activity_log (created_at desc);
create index if not exists activity_log_name_idx on activity_log (name, created_at desc);

alter table activity_log enable row level security;
revoke all on activity_log from anon, authenticated;
grant insert on activity_log to anon, authenticated;
grant usage, select on sequence activity_log_id_seq to anon, authenticated;

drop policy if exists "anyone can add activity" on activity_log;
create policy "anyone can add activity" on activity_log
  for insert to anon, authenticated with check (true);

-- Read the log. Refuses unless the PIN matches Khushi's check-in PIN.
create or replace function public.activity_feed(p_pin text, p_since timestamptz)
returns setof activity_log
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from guest_pins
    where name = 'Khushi Vaswani' and pin_hash = crypt(p_pin, pin_hash)
  ) then
    raise exception 'wrong pin';
  end if;
  return query
    select a.* from activity_log a
    where a.created_at >= p_since
    order by a.created_at desc
    limit 5000;
end;
$$;

revoke all on function public.activity_feed(text, timestamptz) from public;
grant execute on function public.activity_feed(text, timestamptz) to anon, authenticated;

-- Optional clean-up, keep the last 60 days only (run by hand whenever):
-- delete from activity_log where created_at < now() - interval '60 days';
