create table if not exists availability_snapshots (
  tmdb_id int not null,
  region text not null,
  providers jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (tmdb_id, region)
);

create table if not exists availability_track (
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id int not null,
  region text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, region)
);

create index if not exists availability_track_user_idx on availability_track(user_id);

create table if not exists availability_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id int not null,
  region text not null,
  type text not null check (type in ('added', 'leaving', 'changed')),
  added_providers jsonb not null default '[]'::jsonb,
  removed_providers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists availability_events_user_created_idx on availability_events(user_id, created_at desc);
