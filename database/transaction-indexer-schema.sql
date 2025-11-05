-- Create transactions table for caching Solana transactions
-- This gives us "instant" balance/history like Phantom

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  signature text unique not null,
  amount numeric not null default 0,
  status text check (status in ('pending', 'confirmed', 'failed')) not null default 'pending',
  type text check (type in ('send', 'receive', 'swap', 'stake', 'unknown')) not null default 'unknown',
  block_time timestamptz,
  slot bigint,
  fee numeric default 0,
  network text default 'devnet',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Add wallet balance caching
alter table wallets add column if not exists balance numeric default 0;
alter table wallets add column if not exists last_sync timestamptz default now();

-- Indexes for performance
create index if not exists idx_transactions_wallet_address on transactions(wallet_address);
create index if not exists idx_transactions_signature on transactions(signature);
create index if not exists idx_transactions_block_time on transactions(block_time desc);
create index if not exists idx_wallets_address on wallets(address);

-- Row Level Security
alter table transactions enable row level security;

create policy "Users can view own transactions"
on transactions for select
using (
  wallet_address in (
    select address from wallets where user_id = auth.uid()
  )
);

create policy "System can insert transactions"
on transactions for insert
with check (true); -- Allow Edge Function to insert

-- Add trigger to update wallet balance on transaction insert
create or replace function update_wallet_balance()
returns trigger as $$
begin
  update wallets 
  set balance = (
    select coalesce(sum(amount), 0) 
    from transactions 
    where wallet_address = NEW.wallet_address 
    and status = 'confirmed'
  ),
  last_sync = now()
  where address = NEW.wallet_address;
  
  return NEW;
end;
$$ language plpgsql security definer;

create trigger update_balance_on_transaction
  after insert or update on transactions
  for each row execute function update_wallet_balance();