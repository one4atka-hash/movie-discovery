create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collections_user_id_updated_at_idx on collections(user_id, updated_at desc);

create table if not exists collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  tmdb_id int,
  title text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists collection_items_collection_id_created_at_idx
  on collection_items(collection_id, created_at desc);

