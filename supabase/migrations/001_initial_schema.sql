create extension if not exists pgcrypto;

create type membership_role as enum ('owner','seller');

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_id text not null unique,
  industry text not null default 'retail',
  address text,
  phone text,
  email text,
  currency text not null default 'KES',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  role membership_role not null default 'seller',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, email)
);

create table if not exists business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role membership_role not null default 'seller',
  invited_by uuid references profiles(id),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (business_id, profile_id)
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  code text not null,
  unit_cost numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  opening_stock integer not null default 0,
  current_stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code)
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  purchase_date timestamptz not null default now(),
  total_amount numeric(14,2) not null default 0,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  purchase_id uuid not null references purchases(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null,
  total_amount numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  seller_profile_id uuid not null references profiles(id),
  sale_date timestamptz not null default now(),
  total_amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_code text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  total_amount numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  expense_date timestamptz not null default now(),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  reference_type text not null,
  reference_id uuid not null,
  movement_type text not null check (movement_type in ('sale','purchase','adjustment','opening')),
  quantity integer not null,
  unit_cost numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_businesses_business_id on businesses (business_id);
create index if not exists idx_profiles_business_id on profiles (business_id);
create index if not exists idx_products_business_id on products (business_id);
create index if not exists idx_sales_business_id on sales (business_id, sale_date);
create index if not exists idx_purchases_business_id on purchases (business_id, purchase_date);
create index if not exists idx_expenses_business_id on expenses (business_id, expense_date);
create index if not exists idx_stock_movements_product on stock_movements (business_id, product_id);

alter table businesses enable row level security;
alter table profiles enable row level security;
alter table business_members enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table expenses enable row level security;
alter table stock_movements enable row level security;

create policy "business visible to members" on businesses
for select using (
  exists (
    select 1 from profiles p
    where p.business_id = businesses.id and p.id = auth.uid()
  )
);

create policy "profiles visible to members" on profiles
for select using (
  auth.uid() = profiles.id or exists (
    select 1 from business_members bm
    where bm.business_id = profiles.business_id and bm.profile_id = auth.uid()
  )
);

create policy "products visible to business members" on products
for select using (
  exists (
    select 1 from profiles p
    where p.business_id = products.business_id and p.id = auth.uid()
  )
);

create policy "sales visible to business members" on sales
for select using (
  exists (
    select 1 from profiles p
    where p.business_id = sales.business_id and p.id = auth.uid()
  )
);

create policy "purchases visible to business members" on purchases
for select using (
  exists (
    select 1 from profiles p
    where p.business_id = purchases.business_id and p.id = auth.uid()
  )
);

create policy "expenses visible to business members" on expenses
for select using (
  exists (
    select 1 from profiles p
    where p.business_id = expenses.business_id and p.id = auth.uid()
  )
);

create function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_business_updated_at
before update on businesses
for each row
execute function public.handle_updated_at();

create trigger set_profile_updated_at
before update on profiles
for each row
execute function public.handle_updated_at();

create trigger set_product_updated_at
before update on products
for each row
execute function public.handle_updated_at();
