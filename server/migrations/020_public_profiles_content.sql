-- Add share-friendly text sections to public profiles.
alter table public_profiles
  add column if not exists about text,
  add column if not exists notes text,
  add column if not exists plans text;

