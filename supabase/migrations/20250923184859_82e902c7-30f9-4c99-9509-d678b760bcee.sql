alter table public.flags
  add column if not exists span_start int,
  add column if not exists span_end   int,
  add column if not exists context    text,
  add column if not exists keywords   text[];