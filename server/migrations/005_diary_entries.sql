create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id int,
  title text not null,
  watched_at date not null,
  location text not null check (location in ('cinema','streaming','home')),
  provider_key text,
  rating numeric,
  tags jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diary_entries_user_id_watched_at_idx on diary_entries(user_id, watched_at desc);
create index if not exists diary_entries_user_id_updated_at_idx on diary_entries(user_id, updated_at desc);

