-- Hotel Cali: migration 006
-- 1. Fixes the spelling "Protim Chowdhary" -> "Protim Chowdhury" everywhere it is stored.
-- 2. member_subjects: each person's 2 specializations, so the midnight digest
--    knows whose classes to send.
-- 3. A nightly job at 12:00 am IST that asks notify-critical to send the digest
--    (tomorrow's classes to each person, the mess menu to everyone).
-- Safe to run on the live database. Run it once in Supabase > SQL Editor > New query.
-- Before running: Database > Extensions, turn on pg_cron and pg_net.

-- 1. Name fix --------------------------------------------------------------
do $$
declare
  r record;
  old_name text := 'Protim Chowdhary';
  new_name text := 'Protim Chowdhury';
begin
  for r in
    select c.table_name, c.column_name, c.data_type, c.udt_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and (c.data_type in ('text', 'character varying', 'jsonb') or c.udt_name = '_text')
  loop
    if r.data_type in ('text', 'character varying') then
      execute format('update %I set %I = $2 where %I = $1', r.table_name, r.column_name, r.column_name)
        using old_name, new_name;
    elsif r.data_type = 'jsonb' then
      execute format('update %I set %I = replace(%I::text, $1, $2)::jsonb where %I::text like ''%%'' || $1 || ''%%''',
        r.table_name, r.column_name, r.column_name, r.column_name)
        using '"' || old_name || '"', '"' || new_name || '"';
    else
      execute format('update %I set %I = array_replace(%I, $1, $2) where $1 = any(%I)',
        r.table_name, r.column_name, r.column_name, r.column_name)
        using old_name, new_name;
    end if;
  end loop;
end $$;

-- 2. Specializations ---------------------------------------------------------
create table if not exists member_subjects (
  name text primary key,
  subjects text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table member_subjects enable row level security;
drop policy if exists "allow all - member_subjects" on member_subjects;
create policy "allow all - member_subjects" on member_subjects for all using (true) with check (true);

-- 3. Nightly digest at 00:00 IST (18:30 UTC) -----------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('hotel-cali-digest') where exists (select 1 from cron.job where jobname = 'hotel-cali-digest');
select cron.schedule(
  'hotel-cali-digest',
  '30 18 * * *',
  $job$
  select net.http_post(
    url := 'https://lnrfzkqrrnxvfhrikdyk.supabase.co/functions/v1/notify-critical',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucmZ6a3Fycm54dmZocmlrZHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0Njk0ODgsImV4cCI6MjEwNDA0NTQ4OH0.4wakVOgj6oSBe3NAw2C2_bZ1wKacv_A4VKDXv5Xdeh8'
    ),
    body := '{"type":"digest"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
