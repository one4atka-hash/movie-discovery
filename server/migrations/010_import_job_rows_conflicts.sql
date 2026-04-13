create table if not exists import_job_rows (
  job_id uuid not null references import_jobs(id) on delete cascade,
  row_n int not null,
  raw jsonb,
  mapped jsonb,
  status text not null default 'pending' check (status in ('pending','ok','conflict','error')),
  error text,
  primary key (job_id, row_n)
);

create index if not exists import_job_rows_job_id_idx on import_job_rows(job_id);

create table if not exists import_conflicts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references import_jobs(id) on delete cascade,
  entity text not null, -- diary | watch_state | favorites | etc
  key text not null, -- stable identifier (e.g. tmdb_id, diary unique key)
  server jsonb,
  incoming jsonb,
  resolution jsonb,
  created_at timestamptz not null default now()
);

create index if not exists import_conflicts_job_id_idx on import_conflicts(job_id);
create index if not exists import_conflicts_job_entity_key_idx on import_conflicts(job_id, entity, key);

