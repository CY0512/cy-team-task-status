create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  child text not null check (child in ('Hong Yi', 'Delson')),
  subject text not null check (subject in ('Pengajian Am (PA)', 'Economics', 'Math', 'Perniagaan')),
  study_date date not null default current_date,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  learned text not null,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.active_sessions (
  id uuid primary key default gen_random_uuid(),
  child text unique not null check (child in ('Hong Yi', 'Delson')),
  subject text not null check (subject in ('Pengajian Am (PA)', 'Economics', 'Math', 'Perniagaan')),
  started_at timestamptz not null default now()
);

alter table public.study_sessions enable row level security;
alter table public.active_sessions enable row level security;
create policy "study sessions public access" on public.study_sessions for all using (true) with check (true);
create policy "active sessions public access" on public.active_sessions for all using (true) with check (true);

insert into storage.buckets (id, name, public) values ('study-photos', 'study-photos', true)
on conflict (id) do update set public = true;
create policy "study photos public access" on storage.objects for all using (bucket_id = 'study-photos') with check (bucket_id = 'study-photos');
