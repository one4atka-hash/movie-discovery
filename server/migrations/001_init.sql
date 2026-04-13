create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists favorites (
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

create table if not exists release_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie')),
  release_date date not null,
  channels jsonb not null,
  created_at timestamptz not null default now(),
  last_notified_at timestamptz
);

create unique index if not exists release_subscriptions_unique_target on release_subscriptions(user_id, tmdb_id, media_type);

create index if not exists release_subscriptions_user_id_idx on release_subscriptions(user_id);
create index if not exists release_subscriptions_release_date_idx on release_subscriptions(release_date);

create table if not exists feedback (
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id int not null,
  value text not null check (value in ('like','dislike','hide','neutral')),
  reason text,
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

create index if not exists feedback_user_id_idx on feedback(user_id);

-- Cached movie features + embedding for ANN
create table if not exists movie_features (
  tmdb_id int primary key,
  title text,
  overview text,
  genres jsonb,
  "cast" jsonb,
  crew jsonb,
  keywords jsonb,
  lang text,
  updated_at timestamptz not null default now(),
  embedding vector(1536)
);

create index if not exists movie_features_embedding_idx on movie_features using ivfflat (embedding vector_cosine_ops) with (lists = 100);

