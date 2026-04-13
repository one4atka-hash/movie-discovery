create table if not exists public_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  slug text unique,
  enabled boolean not null default false,
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  sections jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists public_profiles_slug_lower_idx on public_profiles (lower(slug));
