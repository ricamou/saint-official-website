-- ================================================================
-- SAINT SANCTUARY — SPRINT 2 DATABASE
-- Run this complete script in Supabase > SQL Editor.
-- ================================================================

create extension if not exists pgcrypto;

create table if not exists public.sanctuary_holders (
  id uuid primary key default gen_random_uuid(),
  wallet text not null unique,
  saint_balance numeric(30, 6) not null default 0,
  holder_level text not null default 'pending',
  ownership_verified boolean not null default false,
  sanctuary_access boolean not null default false,
  first_verified_at timestamptz,
  last_verified_at timestamptz,
  last_balance_check_at timestamptz,
  telegram_joined boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sanctuary_holders_wallet_length
    check (char_length(wallet) between 32 and 44),

  constraint sanctuary_holders_balance_nonnegative
    check (saint_balance >= 0)
);

create index if not exists sanctuary_holders_access_idx
  on public.sanctuary_holders (sanctuary_access);

create index if not exists sanctuary_holders_verified_idx
  on public.sanctuary_holders (ownership_verified);

create table if not exists public.sanctuary_auth_nonces (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  nonce text not null unique,
  message text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),

  constraint sanctuary_auth_nonces_wallet_length
    check (char_length(wallet) between 32 and 44)
);

create index if not exists sanctuary_auth_nonces_wallet_idx
  on public.sanctuary_auth_nonces (wallet);

create index if not exists sanctuary_auth_nonces_expiry_idx
  on public.sanctuary_auth_nonces (expires_at);

create or replace function public.set_sanctuary_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sanctuary_holders_updated_at
  on public.sanctuary_holders;

create trigger trg_sanctuary_holders_updated_at
before update on public.sanctuary_holders
for each row
execute function public.set_sanctuary_updated_at();

alter table public.sanctuary_holders enable row level security;
alter table public.sanctuary_auth_nonces enable row level security;

-- No public read/write policies are intentionally created.
-- All access must happen through Vercel serverless functions
-- using the Supabase Service Role key.
