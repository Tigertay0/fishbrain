-- Sync milestone schema (Supabase Postgres). Not used by v1, which is local-only.
-- Access rules: row level security, owner-only on every table.

create table catches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caught_at timestamptz not null,
  species text not null,
  length_cm numeric(6,1) check (length_cm is null or length_cm > 0),
  weight_g integer check (weight_g is null or weight_g > 0),
  lure text,
  method text,
  notes text,
  photo_path text,
  privacy text not null default 'exact' check (privacy in ('exact','water','hidden')),
  -- hidden catches carry no coordinates at all
  lat double precision,
  lon double precision,
  water_name text,
  conditions jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hidden_has_no_point check (privacy <> 'hidden' or (lat is null and lon is null))
);
create index on catches (user_id, caught_at desc);
create index on catches (user_id, species);

create table markers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('access','parking','bridge','camp','run','note')),
  name text not null,
  notes text,
  lat double precision not null,
  lon double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on markers (user_id);

create table stream_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  stream_key text not null,
  stream_name text not null,
  class_label text,
  species text[] not null default '{}',
  regs_url text,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, stream_key)
);

alter table catches enable row level security;
alter table markers enable row level security;
alter table stream_notes enable row level security;

create policy own_catches on catches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_markers on markers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_notes on stream_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
