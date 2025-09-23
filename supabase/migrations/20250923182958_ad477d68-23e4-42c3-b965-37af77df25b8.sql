create index if not exists idx_analyses_user_created_at
  on public.analyses (user_id, created_at desc);