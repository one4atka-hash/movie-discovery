create table if not exists movie_release_snapshots (
  tmdb_id int primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
