create table if not exists user_streaming_prefs (
  user_id uuid primary key references users(id) on delete cascade,
  region text not null default 'US',
  providers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

