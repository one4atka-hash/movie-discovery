alter table movie_feature_jobs
  add column if not exists processed_count int not null default 0,
  add column if not exists failed_count int not null default 0,
  add column if not exists total_count int not null default 0;

