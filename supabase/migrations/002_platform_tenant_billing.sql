create type if not exists subscription_plan_tier as enum ('starter','pro','scale');
create type if not exists subscription_status as enum ('trial','active','paused','cancelled');

alter table businesses
  add column if not exists owner_profile_id uuid references profiles(id) on delete set null,
  add column if not exists plan subscription_plan_tier not null default 'starter',
  add column if not exists subscription_status subscription_status not null default 'trial',
  add column if not exists monthly_revenue numeric(12,2) not null default 0,
  add column if not exists created_by uuid references profiles(id) on delete set null;

create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tier subscription_plan_tier not null unique,
  monthly_price numeric(12,2) not null,
  annual_price numeric(12,2),
  max_users integer not null default 5,
  max_locations integer not null default 1,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references businesses(id) on delete cascade,
  plan_tier subscription_plan_tier not null,
  status subscription_status not null default 'trial',
  monthly_price numeric(12,2) not null default 0,
  annual_price numeric(12,2),
  trial_ends_at timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  last_invoice_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tenant_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  subscription_id uuid references tenant_subscriptions(id) on delete set null,
  invoice_number text not null unique,
  amount numeric(12,2) not null default 0,
  currency text not null default 'TZS',
  status text not null default 'draft' check (status in ('draft','paid','pending','failed','voided')),
  due_date timestamptz not null default (now() + interval '7 days'),
  provider text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tenant_activity (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_businesses_owner_profile on businesses (owner_profile_id);
create index if not exists idx_subscriptions_business_id on tenant_subscriptions (business_id);
create index if not exists idx_invoices_business_id on tenant_invoices (business_id, status);
create index if not exists idx_activity_business_id on tenant_activity (business_id, created_at desc);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_subscription_updated_at
before update on tenant_subscriptions
for each row
execute function public.handle_updated_at();

create trigger set_invoice_updated_at
before update on tenant_invoices
for each row
execute function public.handle_updated_at();

alter table tenant_subscriptions enable row level security;
alter table tenant_invoices enable row level security;
alter table tenant_activity enable row level security;

create policy "tenant subscriptions visible to business members"
on tenant_subscriptions
for select using (
  exists (
    select 1 from profiles p
    where p.business_id = tenant_subscriptions.business_id and p.id = auth.uid()
  )
);

create policy "tenant invoices visible to business members"
on tenant_invoices
for select using (
  exists (
    select 1 from profiles p
    where p.business_id = tenant_invoices.business_id and p.id = auth.uid()
  )
);

create policy "tenant activity visible to business members"
on tenant_activity
for select using (
  exists (
    select 1 from profiles p
    where p.business_id = tenant_activity.business_id and p.id = auth.uid()
  )
);

insert into subscription_plans (name, tier, monthly_price, annual_price, max_users, max_locations, features)
values
  ('Starter', 'starter', 25000, 250000, 5, 1, '{"inventory": true, "sales": true, "reports": true}'),
  ('Pro', 'pro', 70000, 700000, 25, 3, '{"inventory": true, "sales": true, "reports": true, "multi_user": true, "export": true}'),
  ('Scale', 'scale', 150000, 1500000, 100, 10, '{"inventory": true, "sales": true, "reports": true, "multi_user": true, "export": true, "api": true}')
on conflict (tier) do update set
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  max_users = excluded.max_users,
  max_locations = excluded.max_locations,
  features = excluded.features,
  is_active = true;
