create table if not exists watch_state (
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id int not null,
  status text not null check (status in ('want','watching','watched','dropped','hidden')),
  progress jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

create index if not exists watch_state_user_id_updated_at_idx on watch_state(user_id, updated_at desc);

