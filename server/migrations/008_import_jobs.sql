create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('diary','watch_state','favorites')),
  format text not null check (format in ('json','csv')),
  status text not null check (status in ('created','uploaded','parsed','preview','applied','failed')),
  error text,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_jobs_user_id_idx on import_jobs(user_id);
create index if not exists import_jobs_created_at_idx on import_jobs(created_at desc);

