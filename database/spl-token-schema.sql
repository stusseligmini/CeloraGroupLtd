-- SPL Token support for Phantom-level token compatibility
-- Caches token balances and metadata for instant loading

create table if not exists token_balances (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  tokens jsonb default '[]',
  last_sync timestamptz default now(),
  created_at timestamptz default now()
);

-- Token metadata cache
create table if not exists token_metadata (
  mint text primary key,
  symbol text not null,
  name text not null,
  decimals integer not null default 9,
  logo_uri text,
  verified boolean default false,
  created_at timestamptz default now()
);

-- NFT metadata cache (for future v2.0)
create table if not exists nft_metadata (
  mint text primary key,
  name text,
  symbol text,
  image text,
  collection text,
  verified boolean default false,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_token_balances_wallet on token_balances(wallet_address);
create index if not exists idx_token_balances_sync on token_balances(last_sync desc);
create index if not exists idx_token_metadata_symbol on token_metadata(symbol);
create index if not exists idx_nft_metadata_collection on nft_metadata(collection);

-- RLS
alter table token_balances enable row level security;
alter table token_metadata enable row level security;
alter table nft_metadata enable row level security;

-- Policies
create policy "Users can view own token balances"
on token_balances for select
using (
  wallet_address in (
    select address from wallets where user_id = auth.uid()
  )
);

create policy "System can manage token balances"
on token_balances for all
using (true); -- Allow Edge Functions to manage

create policy "Everyone can read token metadata"
on token_metadata for select
using (true);

create policy "System can manage token metadata"
on token_metadata for all
using (true);

create policy "Everyone can read NFT metadata"
on nft_metadata for select
using (true);

create policy "System can manage NFT metadata"
on nft_metadata for all
using (true);

-- Seed known SPL tokens
insert into token_metadata (mint, symbol, name, decimals, logo_uri, verified) values
('So11111111111111111111111111111111111111112', 'SOL', 'Wrapped SOL', 9, '/assets/tokens/sol.png', true),
('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 'BONK', 'Bonk', 5, '/assets/tokens/bonk.png', true)
on conflict (mint) do nothing;