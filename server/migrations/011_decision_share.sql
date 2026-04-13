alter table decision_sessions add column if not exists share_token text unique;

create table if not exists decision_session_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references decision_sessions(id) on delete cascade,
  tmdb_id int not null,
  voter_key text not null,
  created_at timestamptz not null default now(),
  unique (session_id, voter_key)
);

create index if not exists decision_session_votes_session_id_idx on decision_session_votes(session_id);
