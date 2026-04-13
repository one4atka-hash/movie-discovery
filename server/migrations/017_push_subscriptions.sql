create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_user_endpoint_uidx
  on push_subscriptions(user_id, endpoint);

create index if not exists push_subscriptions_user_id_idx
  on push_subscriptions(user_id);
