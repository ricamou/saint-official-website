-- ================================================================
-- SAINT SANCTUARY — SPRINT 4.2
-- HOLDER VERIFICATION ENGINE
-- Run this script in Supabase > SQL Editor.
-- ================================================================

alter table public.sanctuary_holders
  add column if not exists cache_expires_at timestamptz;

alter table public.sanctuary_holders
  add column if not exists balance_source text;

alter table public.sanctuary_holders
  add column if not exists minimum_required numeric(30, 6)
  not null default 1000000;

create index if not exists sanctuary_holders_cache_expiry_idx
  on public.sanctuary_holders (cache_expires_at);

update public.sanctuary_holders
set minimum_required = 1000000
where minimum_required is null;
