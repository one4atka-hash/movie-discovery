create table if not exists release_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie')),
  reminder_type text not null
    check (reminder_type in ('theatrical', 'digital', 'physical', 'any')),
  reminder_window jsonb not null,
  channels jsonb not null,
  last_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists release_reminders_user_id_idx on release_reminders(user_id);
create index if not exists release_reminders_user_tmdb_idx on release_reminders(user_id, tmdb_id);
