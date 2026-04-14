create table if not exists movie_feature_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('embeddings')),
  status text not null check (status in ('queued','running','completed','failed')) default 'queued',
  tmdb_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  error text
);

create index if not exists movie_feature_jobs_user_id_created_at_idx
  on movie_feature_jobs(user_id, created_at desc);

