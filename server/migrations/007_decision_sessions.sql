create table if not exists decision_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  mode text not null check (mode in ('top5','roulette')),
  constraints jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists decision_sessions_user_id_idx on decision_sessions(user_id);
create index if not exists decision_sessions_created_at_idx on decision_sessions(created_at desc);

create table if not exists decision_candidates (
  session_id uuid not null references decision_sessions(id) on delete cascade,
  tmdb_id int not null,
  score real not null default 0,
  explain jsonb,
  primary key (session_id, tmdb_id)
);

create index if not exists decision_candidates_session_id_idx on decision_candidates(session_id);

create table if not exists decision_picks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references decision_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id int not null,
  picked_at timestamptz not null default now()
);

create index if not exists decision_picks_session_id_idx on decision_picks(session_id);
create index if not exists decision_picks_user_id_idx on decision_picks(user_id);

