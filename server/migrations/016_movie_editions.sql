-- Per-movie edition labels (manual overrides) + heuristic from TMDB release_dates via API.
create table if not exists movie_editions (
  tmdb_id int not null,
  edition_key text not null,
  label text not null,
  sort_order int not null default 0,
  meta jsonb,
  created_at timestamptz not null default now(),
  primary key (tmdb_id, edition_key)
);

create index if not exists movie_editions_tmdb_idx on movie_editions (tmdb_id);
