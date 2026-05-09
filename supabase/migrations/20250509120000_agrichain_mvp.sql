-- AGRICHAIN MVP — Postgres + Storage + RLS (run via Supabase SQL Editor or CLI)
-- Post-MVP: replace permissive anon policies with signed uploads / Edge Functions.

create extension if not exists "pgcrypto";

-- ─── Core tables ───────────────────────────────────────────────────────────

create table if not exists public.farmers (
  wallet_address text primary key,
  farmer_name text not null default '',
  farm_name text not null default '',
  national_id text default '',
  province text default '',
  district text default '',
  phone_number text default '',
  crop_specialization text default '',
  verification_status text not null default 'unverified',
  profile_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  crop_name text not null,
  quantity_display text default '',
  quantity_available int not null default 0 check (quantity_available >= 0),
  unit_type text not null default 'units',
  price_per_unit numeric not null default 0.01,
  sold_quantity int not null default 0,
  total_transactions int not null default 0,
  inventory_status text not null default 'available',
  harvest_date text default '',
  description text default '',
  crop_image_url text default '',
  farmer_name text default '',
  farmer_wallet text not null,
  province text default '',
  district text default '',
  wallet_address text default '',
  farmer_reference text default '',
  farmer_profile jsonb not null default '{}'::jsonb,
  qr_code text default '',
  crop_hash text default '',
  solana_proof_pda text default '',
  blockchain_signature text default '',
  blockchain_timestamp text default '',
  blockchain_explorer_url text default '',
  verification_status text not null default 'pending',
  purchases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_farmer_wallet_idx on public.products (farmer_wallet);
create index if not exists products_created_at_idx on public.products (created_at desc);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  buyer_wallet text not null,
  farmer_wallet text not null,
  product_id text not null references public.products (id) on delete cascade,
  quantity_purchased int not null check (quantity_purchased > 0),
  total_price_sol numeric,
  lamports bigint,
  solana_signature text,
  explorer_url text,
  unit_type text default 'units',
  purchased_at timestamptz not null default now()
);

create index if not exists transactions_product_idx on public.transactions (product_id);
create index if not exists transactions_buyer_idx on public.transactions (buyer_wallet);

create table if not exists public.buyer_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_wallet text not null,
  product_id text not null references public.products (id) on delete cascade,
  quantity_ordered int not null default 1 check (quantity_ordered > 0),
  status text not null default 'completed',
  solana_signature text,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_records (
  id uuid primary key default gen_random_uuid(),
  wallet_address text,
  product_id text references public.products (id) on delete set null,
  record_type text not null default 'proof',
  payload jsonb not null default '{}'::jsonb,
  blockchain_signature text,
  created_at timestamptz not null default now()
);

-- ─── Atomic purchase (inventory + ledger) ──────────────────────────────────

create or replace function public.record_product_purchase (
  p_product_id text,
  p_buyer_wallet text,
  p_farmer_wallet text,
  p_quantity int,
  p_total_sol numeric,
  p_lamports bigint,
  p_signature text,
  p_explorer_url text,
  p_unit_type text,
  p_purchased_at_iso text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cur public.products%rowtype;
  purchase jsonb;
  ts_iso text;
begin
  select * into cur from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;
  if p_quantity < 1 or p_quantity > cur.quantity_available then
    raise exception 'Requested quantity exceeds available stock.';
  end if;

  ts_iso := coalesce(nullif(trim(p_purchased_at_iso), ''), to_char (now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));

  purchase :=
    jsonb_build_object (
      'buyerWallet',
      p_buyer_wallet,
      'farmerWallet',
      coalesce(nullif(trim(p_farmer_wallet), ''), cur.farmer_wallet),
      'quantityPurchased',
      p_quantity,
      'unitType',
      coalesce(nullif(trim(p_unit_type), ''), cur.unit_type, 'units'),
      'totalPaymentSol',
      p_total_sol,
      'lamports',
      p_lamports,
      'signature',
      p_signature,
      'explorerUrl',
      p_explorer_url,
      'purchasedAtIso',
      ts_iso
    );

  update public.products
  set
    quantity_available = cur.quantity_available - p_quantity,
    sold_quantity = cur.sold_quantity + p_quantity,
    total_transactions = cur.total_transactions + 1,
    inventory_status = case
      when cur.quantity_available - p_quantity > 0 then 'available'
      else 'sold_out'
    end,
    purchases = coalesce(purchases, '[]'::jsonb) || jsonb_build_array(purchase),
    updated_at = now()
  where
    id = p_product_id;

  insert into public.transactions (
    buyer_wallet,
    farmer_wallet,
    product_id,
    quantity_purchased,
    total_price_sol,
    lamports,
    solana_signature,
    explorer_url,
    unit_type,
    purchased_at
  )
  values (
    p_buyer_wallet,
    coalesce(nullif(trim(p_farmer_wallet), ''), cur.farmer_wallet),
    p_product_id,
    p_quantity,
    p_total_sol,
    p_lamports,
    p_signature,
    p_explorer_url,
    coalesce(nullif(trim(p_unit_type), ''), cur.unit_type, 'units'),
    now()
  );

  insert into public.buyer_orders (
    buyer_wallet,
    product_id,
    quantity_ordered,
    status,
    solana_signature
  )
  values (
    p_buyer_wallet,
    p_product_id,
    p_quantity,
    'completed',
    p_signature
  );

  return (
    select
      to_jsonb (p)
    from
      public.products p
    where
      p.id = p_product_id
  );
end;
$$;

grant execute on function public.record_product_purchase (
  text,
  text,
  text,
  int,
  numeric,
  bigint,
  text,
  text,
  text,
  text
) to anon,
  authenticated;

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table public.farmers enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.buyer_orders enable row level security;
alter table public.verification_records enable row level security;

drop policy if exists "farmers_read_all" on public.farmers;
create policy "farmers_read_all" on public.farmers for select using (true);

drop policy if exists "farmers_write_all" on public.farmers;
create policy "farmers_write_all" on public.farmers for insert
with
  check (true);

drop policy if exists "farmers_update_all" on public.farmers;
create policy "farmers_update_all" on public.farmers for update using (true)
with
  check (true);

drop policy if exists "products_read_all" on public.products;
create policy "products_read_all" on public.products for select using (true);

drop policy if exists "products_insert_all" on public.products;
create policy "products_insert_all" on public.products for insert
with
  check (true);

drop policy if exists "products_update_all" on public.products;
create policy "products_update_all" on public.products for update using (true)
with
  check (true);

drop policy if exists "transactions_read_all" on public.transactions;
create policy "transactions_read_all" on public.transactions for select using (true);

drop policy if exists "transactions_insert_all" on public.transactions;
create policy "transactions_insert_all" on public.transactions for insert
with
  check (true);

drop policy if exists "buyer_orders_read_all" on public.buyer_orders;
create policy "buyer_orders_read_all" on public.buyer_orders for select using (true);

drop policy if exists "buyer_orders_insert_all" on public.buyer_orders;
create policy "buyer_orders_insert_all" on public.buyer_orders for insert
with
  check (true);

drop policy if exists "verification_read_all" on public.verification_records;
create policy "verification_read_all" on public.verification_records for select using (true);

drop policy if exists "verification_insert_all" on public.verification_records;
create policy "verification_insert_all" on public.verification_records for insert
with
  check (true);

-- Realtime: in Supabase Dashboard → Database → Replication, enable `products` (and optionally `transactions`).

-- ─── Storage buckets (public MVP) ────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values
  ('crop-images', 'crop-images', true),
  ('farmer-profiles', 'farmer-profiles', true),
  ('qr-images', 'qr-images', true)
on conflict (id) do nothing;

drop policy if exists "crop_images_public_read" on storage.objects;

create policy "crop_images_public_read" on storage.objects for select using (bucket_id = 'crop-images');

drop policy if exists "crop_images_upload" on storage.objects;

create policy "crop_images_upload" on storage.objects for insert with check (bucket_id = 'crop-images');

drop policy if exists "crop_images_update" on storage.objects;

create policy "crop_images_update" on storage.objects for update using (bucket_id = 'crop-images');

drop policy if exists "farmer_profiles_public_read" on storage.objects;

create policy "farmer_profiles_public_read" on storage.objects for select using (bucket_id = 'farmer-profiles');

drop policy if exists "farmer_profiles_upload" on storage.objects;

create policy "farmer_profiles_upload" on storage.objects for insert with check (bucket_id = 'farmer-profiles');

drop policy if exists "farmer_profiles_update" on storage.objects;

create policy "farmer_profiles_update" on storage.objects for update using (bucket_id = 'farmer-profiles');

drop policy if exists "qr_images_public_read" on storage.objects;

create policy "qr_images_public_read" on storage.objects for select using (bucket_id = 'qr-images');

drop policy if exists "qr_images_upload" on storage.objects;

create policy "qr_images_upload" on storage.objects for insert with check (bucket_id = 'qr-images');

drop policy if exists "qr_images_update" on storage.objects;

create policy "qr_images_update" on storage.objects for update using (bucket_id = 'qr-images');
