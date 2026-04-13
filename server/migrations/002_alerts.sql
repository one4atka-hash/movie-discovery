create table if not exists alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  filters jsonb not null default '{}'::jsonb,
  channels jsonb not null default '{}'::jsonb,
  quiet_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alert_rules_user_id_idx on alert_rules(user_id);
create index if not exists alert_rules_enabled_idx on alert_rules(enabled);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  rule_id uuid references alert_rules(id) on delete set null,
  type text not null check (type in ('info','release','availability','digest')),
  title text not null,
  body text,
  tmdb_id int,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_id_created_at_idx on notifications(user_id, created_at desc);
create index if not exists notifications_user_id_read_at_idx on notifications(user_id, read_at);

