-- Zestro live app: database
-- Every table is locked (RLS on, no policies). The browser can only call the functions below,
-- and each restaurant function checks a session token, so one restaurant can never read another's data.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.z_restaurants (
  id text primary key,                      -- short code used in links, e.g. spice-garden-4821
  name text not null,
  area text default '',
  city text default '',
  owner_name text default '',
  owner_phone text not null unique,          -- 10 digits
  owner_pin_hash text not null,
  plan text not null default 'basic' check (plan in ('basic', 'pro')),
  status text not null default 'trial' check (status in ('trial', 'active', 'blocked')),
  trial_ends timestamptz not null default now() + interval '15 days',
  paid_until timestamptz,
  tables int not null default 6 check (tables between 1 and 200),
  created_at timestamptz not null default now()
);

create table if not exists public.z_data (
  rid text not null references public.z_restaurants(id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (rid, key)
);

create table if not exists public.z_orders (
  id text primary key,
  rid text not null references public.z_restaurants(id) on delete cascade,
  no int not null,
  data jsonb not null,
  status text,
  pay text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp()
);
create index if not exists z_orders_rid_updated on public.z_orders (rid, updated_at);
create index if not exists z_orders_rid_no on public.z_orders (rid, no);

create table if not exists public.z_alerts (
  id text primary key,
  rid text not null references public.z_restaurants(id) on delete cascade,
  data jsonb not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp()
);
create index if not exists z_alerts_rid_updated on public.z_alerts (rid, updated_at);

create table if not exists public.z_sessions (
  token uuid primary key default gen_random_uuid(),
  rid text references public.z_restaurants(id) on delete cascade,
  role text not null,
  name text not null default '',
  staff_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table if not exists public.z_payments (
  id uuid primary key default gen_random_uuid(),
  rid text not null references public.z_restaurants(id) on delete cascade,
  plan text not null,
  amount int not null,
  method text not null,
  ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.z_admin (
  id int primary key default 1 check (id = 1),
  pass_hash text not null
);

alter table public.z_restaurants enable row level security;
alter table public.z_data enable row level security;
alter table public.z_orders enable row level security;
alter table public.z_alerts enable row level security;
alter table public.z_sessions enable row level security;
alter table public.z_payments enable row level security;
alter table public.z_admin enable row level security;
revoke all on public.z_restaurants, public.z_data, public.z_orders, public.z_alerts, public.z_sessions, public.z_payments, public.z_admin from anon, authenticated;

-- ---------------------------------------------------------------- helpers
create or replace function public.z_price(p text) returns int language sql immutable set search_path = '' as $$
  select case p when 'pro' then 7999 else 4999 end
$$;

create or replace function public.z_state(r public.z_restaurants) returns text language sql stable set search_path = '' as $$
  select case
    when r.status = 'blocked' then 'blocked'
    when r.paid_until is not null and r.paid_until > now() then 'active'
    when r.trial_ends > now() and r.paid_until is null then 'trial'
    else 'expired' end
$$;

create or replace function public.z_info(r public.z_restaurants) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'name', r.name, 'area', r.area, 'city', r.city, 'owner_name', r.owner_name, 'owner_phone', r.owner_phone,
    'plan', r.plan, 'state', public.z_state(r), 'trial_ends', r.trial_ends, 'paid_until', r.paid_until, 'tables', r.tables,
    'created_at', r.created_at, 'price', public.z_price(r.plan),
    'orders_total', (select count(*) from public.z_orders o where o.rid = r.id),
    'trial', jsonb_build_object('days', 15, 'tables', 5, 'orders', 200, 'wa', 50))
$$;

create or replace function public.z_session(p_token uuid) returns public.z_sessions language plpgsql stable set search_path = '' as $$
declare s public.z_sessions;
begin
  select * into s from public.z_sessions where token = p_token and expires_at > now();
  if s.token is null then raise exception 'Please log in again' using errcode = '28000'; end if;
  return s;
end $$;

create or replace function public.z_new_session(p_rid text, p_role text, p_name text, p_staff text) returns jsonb language plpgsql set search_path = '' as $$
declare t uuid; r public.z_restaurants;
begin
  insert into public.z_sessions (rid, role, name, staff_id) values (p_rid, p_role, p_name, p_staff) returning token into t;
  select * into r from public.z_restaurants where id = p_rid;
  return jsonb_build_object('token', t, 'rid', p_rid, 'role', p_role, 'name', p_name, 'staff_id', p_staff, 'restaurant', public.z_info(r));
end $$;

create or replace function public.z_digits(p text) returns text language sql immutable set search_path = '' as $$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10)
$$;

-- ---------------------------------------------------------------- sign-up and log in
create or replace function public.z_signup(p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_phone text := public.z_digits(p->>'phone'); v_name text := trim(coalesce(p->>'name', '')); v_pin text := coalesce(p->>'pin', '');
  v_slug text; v_tables int := least(200, greatest(1, coalesce((p->>'tables')::int, 6))); v_plan text := case when p->>'plan' = 'pro' then 'pro' else 'basic' end;
begin
  if length(v_name) < 2 then raise exception 'Enter the restaurant name'; end if;
  if length(v_phone) <> 10 then raise exception 'Enter a 10-digit mobile number'; end if;
  if v_pin !~ '^\d{4}$' then raise exception 'Choose a 4-digit PIN'; end if;
  if exists (select 1 from public.z_restaurants where owner_phone = v_phone) then raise exception 'This mobile number already has a restaurant. Log in instead.'; end if;
  v_slug := trim(both '-' from left(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), 24));
  if v_slug = '' then v_slug := 'restaurant'; end if;
  loop
    v_slug := regexp_replace(v_slug, '-\d{4}$', '') || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.z_restaurants where id = v_slug);
  end loop;
  insert into public.z_restaurants (id, name, area, city, owner_name, owner_phone, owner_pin_hash, plan, tables)
  values (v_slug, v_name, trim(coalesce(p->>'area', '')), trim(coalesce(p->>'city', '')), trim(coalesce(p->>'owner', '')), v_phone,
          extensions.crypt(v_pin, extensions.gen_salt('bf')), v_plan, v_tables);
  insert into public.z_data (rid, key, value) values
    (v_slug, 'rest', jsonb_build_object('name', v_name, 'area', trim(coalesce(p->>'area', '')), 'city', trim(coalesce(p->>'city', '')), 'plan', v_plan, 'billing', 'y', 'open', true, 'tables', v_tables, 'gst', 5, 'upi', coalesce(p->>'upi', ''), 'logo', p->'logo', 'cover', p->'cover', 'qrOtp', true)),
    (v_slug, 'cats', '["Starters","Main Course","Breads","Rice & Biryani","Beverages","Desserts"]'::jsonb),
    (v_slug, 'menu', '[]'::jsonb),
    (v_slug, 'staff', jsonb_build_array(jsonb_build_object('id', 'st1', 'name', coalesce(nullif(trim(p->>'owner'), ''), 'Owner'), 'role', 'Owner', 'pin', '')));
  return public.z_new_session(v_slug, 'Owner', coalesce(nullif(trim(p->>'owner'), ''), 'Owner'), 'st1');
end $$;

create or replace function public.z_login_owner(p_phone text, p_pin text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.z_restaurants;
begin
  select * into r from public.z_restaurants where owner_phone = public.z_digits(p_phone);
  if r.id is null or r.owner_pin_hash <> extensions.crypt(coalesce(p_pin, ''), r.owner_pin_hash) then
    perform pg_sleep(0.6);
    raise exception 'That mobile number and PIN do not match';
  end if;
  return public.z_new_session(r.id, 'Owner', coalesce(nullif(r.owner_name, ''), 'Owner'), 'st1');
end $$;

-- Names and roles a staff member picks from on the log-in screen (never the PINs)
create or replace function public.z_staff_names(p_rid text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.z_restaurants; st jsonb; pa jsonb;
begin
  select * into r from public.z_restaurants where id = lower(trim(p_rid));
  if r.id is null then raise exception 'No restaurant with that code'; end if;
  select value into st from public.z_data where rid = r.id and key = 'staff';
  select value into pa from public.z_data where rid = r.id and key = 'partners';
  return jsonb_build_object('rid', r.id, 'name', r.name,
    'people', coalesce((select jsonb_agg(jsonb_build_object('id', x->>'id', 'name', x->>'name', 'role', x->>'role', 'tables', x->'tables', 'station', x->'station'))
      from jsonb_array_elements(coalesce(st, '[]'::jsonb)) x where coalesce(x->>'pin', '') <> ''), '[]'::jsonb)
      || coalesce((select jsonb_agg(jsonb_build_object('id', x->>'id', 'name', x->>'name', 'role', 'Investor'))
      from jsonb_array_elements(coalesce(pa, '[]'::jsonb)) x where coalesce(x->>'pin', '') <> ''), '[]'::jsonb));
end $$;

create or replace function public.z_login_staff(p_rid text, p_sid text, p_pin text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_rid text := lower(trim(p_rid)); x jsonb; v_role text;
begin
  select e into x from public.z_data d, jsonb_array_elements(d.value) e where d.rid = v_rid and d.key = 'staff' and e->>'id' = p_sid;
  if x is not null then v_role := x->>'role'; else
    select e into x from public.z_data d, jsonb_array_elements(d.value) e where d.rid = v_rid and d.key = 'partners' and e->>'id' = p_sid;
    v_role := 'Investor';
  end if;
  if x is null or coalesce(x->>'pin', '') = '' or x->>'pin' <> coalesce(p_pin, '') then
    perform pg_sleep(0.6);
    raise exception 'That PIN does not match';
  end if;
  return public.z_new_session(v_rid, v_role, x->>'name', p_sid);
end $$;

create or replace function public.z_logout(p_token uuid) returns void language sql security definer set search_path = '' as $$
  delete from public.z_sessions where token = p_token
$$;

-- ---------------------------------------------------------------- restaurant data
create or replace function public.z_sync(p_token uuid, p_since timestamptz) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.z_sessions := public.z_session(p_token); r public.z_restaurants; v_since timestamptz := coalesce(p_since, now() - interval '62 days');
begin
  select * into r from public.z_restaurants where id = s.rid;
  return jsonb_build_object(
    'now', clock_timestamp(),
    'restaurant', public.z_info(r),
    'data', coalesce((select jsonb_object_agg(key, value) from public.z_data where rid = s.rid and (p_since is null or updated_at > p_since)), '{}'::jsonb),
    'orders', coalesce((select jsonb_agg(data || jsonb_build_object('no', no) order by no) from public.z_orders where rid = s.rid and updated_at > v_since and (p_since is not null or created_at > now() - interval '62 days')), '[]'::jsonb),
    'alerts', coalesce((select jsonb_agg(data || jsonb_build_object('done', done)) from public.z_alerts where rid = s.rid and updated_at > v_since and (p_since is not null or not done)), '[]'::jsonb));
end $$;

create or replace function public.z_save_data(p_token uuid, p_key text, p_value jsonb) returns timestamptz language plpgsql security definer set search_path = '' as $$
declare s public.z_sessions := public.z_session(p_token); t timestamptz := clock_timestamp();
begin
  if s.role = 'Investor' then raise exception 'Investors can only view'; end if;
  if p_key not in ('rest', 'cats', 'menu', 'staff', 'stations', 'online', 'expenses', 'partners', 'payouts', 'customers', 'inv', 'costs', 'printer') then raise exception 'Unknown data'; end if;
  if p_key in ('partners', 'payouts') and s.role <> 'Owner' then raise exception 'Only the owner can change partners'; end if;
  insert into public.z_data (rid, key, value, updated_at) values (s.rid, p_key, p_value, t)
  on conflict (rid, key) do update set value = excluded.value, updated_at = t;
  if p_key = 'rest' then
    update public.z_restaurants set name = coalesce(nullif(trim(p_value->>'name'), ''), name), area = coalesce(p_value->>'area', area),
      tables = least(200, greatest(1, coalesce((p_value->>'tables')::int, tables))) where id = s.rid;
  end if;
  return t;
end $$;

create or replace function public.z_check_open(r public.z_restaurants, p_new boolean) returns void language plpgsql stable set search_path = '' as $$
declare st text := public.z_state(r);
begin
  if st in ('expired', 'blocked') then raise exception 'The free trial has ended. Renew on the Zestro website to keep taking orders.'; end if;
  if p_new and st = 'trial' and (select count(*) from public.z_orders where rid = r.id) >= 200 then
    raise exception 'The free trial allows 200 orders. Pay for the year on the Zestro website to keep going.';
  end if;
end $$;

-- Save an order from the restaurant side (counter bill, waiter order, status change). Returns the order with its final number.
create or replace function public.z_save_order(p_token uuid, p_order jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.z_sessions := public.z_session(p_token); r public.z_restaurants; v_id text := p_order->>'id'; v_no int := coalesce((p_order->>'no')::int, 0); ex public.z_orders;
begin
  if s.role = 'Investor' then raise exception 'Investors can only view'; end if;
  if v_id is null or length(v_id) > 80 then raise exception 'Bad order'; end if;
  select * into r from public.z_restaurants where id = s.rid;
  perform pg_advisory_xact_lock(hashtext('z-order-' || s.rid));
  select * into ex from public.z_orders where id = v_id;
  if ex.id is not null and ex.rid <> s.rid then raise exception 'Bad order'; end if;
  if ex.id is null then
    perform public.z_check_open(r, true);
    if v_no < 1 or exists (select 1 from public.z_orders where rid = s.rid and no = v_no) then
      select coalesce(max(no), 100) + 1 into v_no from public.z_orders where rid = s.rid;
    end if;
    insert into public.z_orders (id, rid, no, data, status, pay) values (v_id, s.rid, v_no, p_order || jsonb_build_object('no', v_no), p_order->>'status', p_order->>'pay');
  else
    v_no := ex.no;
    update public.z_orders set data = p_order || jsonb_build_object('no', v_no), status = p_order->>'status', pay = p_order->>'pay', updated_at = clock_timestamp() where id = v_id;
  end if;
  return p_order || jsonb_build_object('no', v_no);
end $$;

create or replace function public.z_save_alert(p_token uuid, p_alert jsonb, p_done boolean) returns void language plpgsql security definer set search_path = '' as $$
declare s public.z_sessions := public.z_session(p_token);
begin
  insert into public.z_alerts (id, rid, data, done) values (p_alert->>'id', s.rid, p_alert, coalesce(p_done, false))
  on conflict (id) do update set data = excluded.data, done = excluded.done, updated_at = clock_timestamp() where public.z_alerts.rid = s.rid;
end $$;

-- ---------------------------------------------------------------- diners (no log in)
create or replace function public.z_public(p_rid text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.z_restaurants;
begin
  select * into r from public.z_restaurants where id = lower(trim(p_rid));
  if r.id is null then raise exception 'This QR code is not linked to a restaurant'; end if;
  return jsonb_build_object('id', r.id, 'name', r.name, 'area', r.area, 'city', r.city, 'plan', r.plan, 'state', public.z_state(r), 'tables', r.tables,
    'rest', (select value from public.z_data where rid = r.id and key = 'rest'),
    'menu', coalesce((select value from public.z_data where rid = r.id and key = 'menu'), '[]'::jsonb),
    'cats', coalesce((select value from public.z_data where rid = r.id and key = 'cats'), '[]'::jsonb));
end $$;

create or replace function public.z_place_order(p_rid text, p_order jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.z_restaurants; v_no int; v_id text := 'q' || replace(gen_random_uuid()::text, '-', ''); v_table int := coalesce((p_order->>'table')::int, 0); o jsonb;
begin
  select * into r from public.z_restaurants where id = lower(trim(p_rid));
  if r.id is null then raise exception 'Restaurant not found'; end if;
  perform public.z_check_open(r, true);
  if coalesce((select (value->>'open')::boolean from public.z_data where rid = r.id and key = 'rest'), true) = false then raise exception 'The restaurant has paused orders for now. Please ask a waiter.'; end if;
  if v_table < 1 or v_table > r.tables or (public.z_state(r) = 'trial' and v_table > 5) then raise exception 'This table cannot order from the QR. Please ask a waiter.'; end if;
  if jsonb_typeof(p_order->'items') <> 'array' or jsonb_array_length(p_order->'items') = 0 or jsonb_array_length(p_order->'items') > 60 then raise exception 'The cart is empty'; end if;
  perform pg_advisory_xact_lock(hashtext('z-order-' || r.id));
  select coalesce(max(no), 100) + 1 into v_no from public.z_orders where rid = r.id;
  o := jsonb_build_object('id', v_id, 'rid', r.id, 'no', v_no, 'table', v_table, 'name', left(coalesce(p_order->>'name', 'Guest'), 40), 'phone', left(coalesce(p_order->>'phone', ''), 16),
    'items', p_order->'items', 'note', left(coalesce(p_order->>'note', ''), 200), 'status', 'new', 'pay', 'unpaid', 't', (extract(epoch from now()) * 1000)::bigint,
    'qr', true, 'ver', coalesce((p_order->>'ver')::boolean, false));
  insert into public.z_orders (id, rid, no, data, status, pay) values (v_id, r.id, v_no, o, 'new', 'unpaid');
  return o;
end $$;

create or replace function public.z_my_orders(p_rid text, p_ids text[]) returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(data || jsonb_build_object('no', no)), '[]'::jsonb) from public.z_orders where rid = lower(trim(p_rid)) and id = any(p_ids[1:30])
$$;

create or replace function public.z_diner_alert(p_rid text, p_table int, p_kind text, p_amount numeric) returns void language plpgsql security definer set search_path = '' as $$
declare v_id text := 'a' || replace(gen_random_uuid()::text, '-', '');
begin
  if p_kind not in ('waiter', 'bill', 'counter', 'paid') then raise exception 'Bad request'; end if;
  if not exists (select 1 from public.z_restaurants where id = lower(trim(p_rid))) then raise exception 'Restaurant not found'; end if;
  if exists (select 1 from public.z_alerts where rid = lower(trim(p_rid)) and not done and data->>'kind' = p_kind and (data->>'table')::int = p_table) then return; end if;
  insert into public.z_alerts (id, rid, data) values (v_id, lower(trim(p_rid)), jsonb_build_object('id', v_id, 'rid', lower(trim(p_rid)), 'table', p_table, 'kind', p_kind, 'amount', p_amount, 't', (extract(epoch from now()) * 1000)::bigint));
end $$;

create or replace function public.z_diner_pay(p_rid text, p_ids text[], p_method text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_method not in ('upi', 'card', 'counter') then raise exception 'Bad payment'; end if;
  update public.z_orders set
    data = data || case when p_method = 'counter' then jsonb_build_object('method', 'counter') else jsonb_build_object('pay', 'paid', 'method', p_method, 'status', case when status = 'served' then 'served' else 'served' end) end,
    pay = case when p_method = 'counter' then pay else 'paid' end,
    status = case when p_method = 'counter' then status else 'served' end,
    updated_at = clock_timestamp()
  where rid = lower(trim(p_rid)) and id = any(p_ids[1:30]) and pay <> 'paid';
end $$;

-- ---------------------------------------------------------------- the yearly plan (paid on the website)
create or replace function public.z_pay_plan(p_token uuid, p_plan text, p_method text, p_ref text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.z_sessions := public.z_session(p_token); r public.z_restaurants; v_plan text := case when p_plan = 'pro' then 'pro' else 'basic' end; v_from timestamptz;
begin
  if s.role <> 'Owner' then raise exception 'Only the owner can pay for the plan'; end if;
  select * into r from public.z_restaurants where id = s.rid;
  v_from := greatest(now(), coalesce(r.paid_until, now()), case when r.paid_until is null then r.trial_ends else now() end);
  insert into public.z_payments (rid, plan, amount, method, ref) values (s.rid, v_plan, public.z_price(v_plan), left(coalesce(p_method, 'demo'), 20), left(coalesce(p_ref, ''), 60));
  update public.z_restaurants set plan = v_plan, status = 'active', paid_until = v_from + interval '1 year' where id = s.rid returning * into r;
  insert into public.z_data (rid, key, value) values (s.rid, 'rest', jsonb_build_object('plan', v_plan))
  on conflict (rid, key) do update set value = public.z_data.value || jsonb_build_object('plan', v_plan), updated_at = clock_timestamp();
  return public.z_info(r);
end $$;

create or replace function public.z_payments(p_token uuid) returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('plan', plan, 'amount', amount, 'method', method, 'ref', ref, 'at', created_at) order by created_at desc), '[]'::jsonb)
  from public.z_payments where rid = (public.z_session(p_token)).rid
$$;

-- ---------------------------------------------------------------- our team
create or replace function public.z_admin_login(p_pass text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare h text; t uuid;
begin
  select pass_hash into h from public.z_admin where id = 1;
  if h is null or h <> extensions.crypt(coalesce(p_pass, ''), h) then perform pg_sleep(0.8); raise exception 'Wrong password'; end if;
  insert into public.z_sessions (rid, role, name, expires_at) values (null, 'Admin', 'Zestro team', now() + interval '12 hours') returning token into t;
  return jsonb_build_object('token', t);
end $$;

create or replace function public.z_admin_list(p_token uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.z_sessions := public.z_session(p_token);
begin
  if s.role <> 'Admin' then raise exception 'Team only'; end if;
  return jsonb_build_object(
    'restaurants', coalesce((select jsonb_agg(public.z_info(r) || jsonb_build_object(
      'orders_today', (select count(*) from public.z_orders o where o.rid = r.id and o.created_at > date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
      'sales_30', (select coalesce(sum((select sum((i->>'q')::numeric * (i->>'p')::numeric) from jsonb_array_elements(o.data->'items') i)), 0) from public.z_orders o where o.rid = r.id and o.created_at > now() - interval '30 days' and o.status <> 'cancelled'),
      'last_order', (select max(created_at) from public.z_orders o where o.rid = r.id)) order by r.created_at desc) from public.z_restaurants r), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('rid', p.rid, 'plan', p.plan, 'amount', p.amount, 'method', p.method, 'at', p.created_at) order by p.created_at desc) from public.z_payments p), '[]'::jsonb));
end $$;

create or replace function public.z_admin_update(p_token uuid, p_rid text, p jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.z_sessions := public.z_session(p_token); r public.z_restaurants;
begin
  if s.role <> 'Admin' then raise exception 'Team only'; end if;
  update public.z_restaurants set
    trial_ends = case when p ? 'extend_days' then greatest(trial_ends, now()) + make_interval(days => least(60, (p->>'extend_days')::int)) else trial_ends end,
    status = case when p->>'status' in ('trial', 'active', 'blocked') then p->>'status' else status end,
    plan = case when p->>'plan' in ('basic', 'pro') then p->>'plan' else plan end
  where id = p_rid returning * into r;
  return public.z_info(r);
end $$;

-- Only these functions are callable from the browser
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.z_signup(jsonb), public.z_login_owner(text, text), public.z_staff_names(text), public.z_login_staff(text, text, text),
  public.z_logout(uuid), public.z_sync(uuid, timestamptz), public.z_save_data(uuid, text, jsonb), public.z_save_order(uuid, jsonb), public.z_save_alert(uuid, jsonb, boolean),
  public.z_public(text), public.z_place_order(text, jsonb), public.z_my_orders(text, text[]), public.z_diner_alert(text, int, text, numeric), public.z_diner_pay(text, text[], text),
  public.z_pay_plan(uuid, text, text, text), public.z_payments(uuid), public.z_admin_login(text), public.z_admin_list(uuid), public.z_admin_update(uuid, text, jsonb)
  to anon, authenticated;

-- ---------------------------------------------------------------- v1.1: staff never download each other's PINs; only the owner changes staff
create or replace function public.z_mask_pins(v jsonb) returns jsonb language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(v) = 'array' then coalesce((select jsonb_agg(case when jsonb_typeof(e) = 'object' and e ? 'pin' then e || jsonb_build_object('pin', case when coalesce(e->>'pin', '') = '' then '' else '••••' end) else e end) from jsonb_array_elements(v) e), '[]'::jsonb) else v end
$$;
-- z_sync masks 'staff' and 'partners' PINs for every role except Owner; z_save_data allows 'staff', 'partners', 'payouts' for the Owner only.
-- (Full function bodies were applied as migration zestro_hide_pins_from_staff.)

-- ---------------------------------------------------------------- v1.2 (1 Nov 2026): Demo Kitchen, devices, team adds restaurants
-- Columns: z_restaurants.is_demo; z_sessions.demo, client ('app' or 'browser'), app_ver, device, last_seen.
-- z_info adds 'demo' and hides the demo owner's phone.
-- z_create_restaurant(p jsonb): shared by z_signup (website) and z_admin_add (our team; can set trial_days up to 60). Not callable from the browser.
-- z_demo_login(): anyone gets a 2-day session for the restaurant marked is_demo (Demo Kitchen, code demo-kitchen).
--   Demo sessions can take orders, bills and alerts; z_save_data and z_pay_plan refuse them; staff PINs are masked.
-- z_sync2(p_token, p_since, p_client jsonb): z_sync plus device/app/version/last_seen (written at most once a minute). z_sync is kept for old app copies.
-- z_admin_list: per restaurant adds owner_phone, last_active and devices (role, name, mode, ver, device, seen); demo first; hides rows with no data.
-- Saalim Kitchen was moved to id 'demo-kitchen' (name Demo Kitchen, Pro, active 10 years, 12 tables); the empty old row
-- 'saalim-kitchen-9663' is blocked and hidden, and can be deleted from the Supabase table editor.
-- Full bodies: see migration notes in this session; applied with execute_sql.
