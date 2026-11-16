create or replace function public.create_business_for_owner(
  p_business_name text,
  p_industry text,
  p_owner_full_name text,
  p_owner_email text,
  p_plan subscription_plan_tier
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_existing_business_id uuid;
  v_plan_price numeric(12,2);
  v_subscription_id uuid;
  v_invoice_number text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required to create a business.';
  end if;

  if trim(coalesce(p_business_name, '')) = '' then
    raise exception 'Business name is required.';
  end if;

  if trim(coalesce(p_owner_email, '')) = '' then
    raise exception 'Owner email is required.';
  end if;

  select business_id
    into v_existing_business_id
  from public.profiles
  where id = auth.uid()
  limit 1;

  if v_existing_business_id is not null then
    return v_existing_business_id;
  end if;

  select monthly_price
    into v_plan_price
  from public.subscription_plans
  where tier = p_plan
  limit 1;

  if v_plan_price is null then
    v_plan_price := 25000;
  end if;

  insert into public.businesses (
    name,
    business_id,
    industry,
    email,
    address,
    phone,
    currency,
    settings,
    owner_profile_id,
    plan,
    subscription_status,
    monthly_revenue,
    created_by
  )
  values (
    trim(p_business_name),
    lower(regexp_replace(trim(p_business_name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 8),
    coalesce(p_industry, 'retail'),
    trim(p_owner_email),
    '',
    '',
    'TZS',
    '{}'::jsonb,
    auth.uid(),
    p_plan,
    'trial',
    v_plan_price,
    auth.uid()
  )
  returning id into v_business_id;

  insert into public.profiles (
    id,
    business_id,
    full_name,
    email,
    phone,
    avatar_url,
    role,
    created_at,
    updated_at
  )
  values (
    auth.uid(),
    v_business_id,
    coalesce(p_owner_full_name, 'Business owner'),
    lower(trim(p_owner_email)),
    null,
    null,
    'owner',
    now(),
    now()
  )
  on conflict (business_id, email) do update
    set full_name = excluded.full_name,
        role = 'owner',
        updated_at = now();

  insert into public.business_members (
    business_id,
    profile_id,
    role,
    invited_by,
    status
  )
  values (
    v_business_id,
    auth.uid(),
    'owner',
    null,
    'active'
  )
  on conflict (business_id, profile_id) do nothing;

  insert into public.tenant_subscriptions (
    business_id,
    plan_tier,
    status,
    monthly_price,
    annual_price,
    trial_ends_at,
    current_period_start,
    current_period_end,
    last_invoice_id
  )
  values (
    v_business_id,
    p_plan,
    'trial',
    v_plan_price,
    null,
    now() + interval '30 days',
    now(),
    now() + interval '30 days',
    null
  )
  returning id into v_subscription_id;

  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);

  insert into public.tenant_invoices (
    business_id,
    subscription_id,
    invoice_number,
    amount,
    currency,
    status,
    due_date,
    provider,
    metadata
  )
  values (
    v_business_id,
    v_subscription_id,
    v_invoice_number,
    v_plan_price,
    'TZS',
    'draft',
    now() + interval '7 days',
    'manual',
    jsonb_build_object(
      'plan', p_plan,
      'trial', true,
      'billing_cycle', 'monthly'
    )
  );

  update public.businesses
     set plan = p_plan,
         subscription_status = 'trial',
         monthly_revenue = v_plan_price,
         owner_profile_id = auth.uid(),
         created_by = auth.uid(),
         updated_at = now()
   where id = v_business_id;

  insert into public.tenant_activity (
    business_id,
    actor_profile_id,
    action,
    metadata
  )
  values (
    v_business_id,
    auth.uid(),
    'business_created',
    jsonb_build_object(
      'business_name', trim(p_business_name),
      'industry', coalesce(p_industry, 'retail'),
      'plan', p_plan,
      'status', 'trial'
    )
  );

  return v_business_id;
end;
$$;

create or replace function public.ensure_business_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.profiles where id = new.id
  ) then
    return new;
  end if;

  insert into public.profiles (
    id,
    business_id,
    full_name,
    email,
    phone,
    avatar_url,
    role,
    created_at,
    updated_at
  )
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    lower(new.email),
    null,
    null,
    'owner',
    now(),
    now()
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.ensure_business_profile_for_user();
