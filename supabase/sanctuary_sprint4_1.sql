-- ================================================================
-- SAINT SANCTUARY — SPRINT 4.1
-- SIGN MESSAGE + BACKEND AUTHENTICATION
-- Run this complete script in Supabase > SQL Editor.
-- ================================================================

create extension if not exists pgcrypto;

create table if not exists public.sanctuary_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  constraint sanctuary_auth_sessions_wallet_length
    check (char_length(wallet) between 32 and 44)
);

create index if not exists sanctuary_auth_sessions_wallet_idx
  on public.sanctuary_auth_sessions (wallet);

create index if not exists sanctuary_auth_sessions_expiry_idx
  on public.sanctuary_auth_sessions (expires_at);

create index if not exists sanctuary_auth_sessions_active_idx
  on public.sanctuary_auth_sessions (wallet, expires_at)
  where revoked_at is null;

alter table public.sanctuary_auth_sessions enable row level security;

-- No public policies are created.
-- Access is restricted to Vercel serverless functions using Service Role.

-- Optional cleanup function for expired/used authentication data.
create or replace function public.cleanup_sanctuary_auth()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.sanctuary_auth_nonces
  where expires_at < now() - interval '1 day'
     or used_at < now() - interval '1 day';

  delete from public.sanctuary_auth_sessions
  where expires_at < now() - interval '1 day'
     or revoked_at < now() - interval '1 day';
end;
$$;
