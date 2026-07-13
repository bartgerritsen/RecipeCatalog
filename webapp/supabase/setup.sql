-- Combined setup: schema + functions. Paste this whole file into the
-- Supabase SQL editor and Run. Safe to re-run.

-- ============================================================================
-- Recepten-webapp — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ============================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Recipes: local (groei-maatje seed) + cached AH recipes
-- ---------------------------------------------------------------------------
do $$ begin
  create type recipe_source as enum ('local', 'ah');
exception when duplicate_object then null; end $$;

create table if not exists recipes (
  id             uuid primary key default gen_random_uuid(),
  source         recipe_source not null,
  external_id    text not null,               -- groei-maatje id | AH recipe id
  title          text not null,
  slug           text,
  description    text,
  servings       int,
  serving_type   text,
  prep_min       int,
  cook_min       int,
  oven_min       int,
  wait_min       int,
  kcal           numeric,
  protein        numeric,
  carbs          numeric,
  fat            numeric,
  courses        text[],
  diet           text[],
  nutri_score    text,
  rating_avg     numeric,
  rating_count   int,
  image_url      text,
  images         jsonb,
  ingredients    jsonb,   -- [{name,brand,amount,gServ,unit,kcal,protein,carbs,fat,optional,seasoning}]
  steps          jsonb,   -- ["step text", ...]
  detail_fetched boolean not null default false,
  search_text    text,
  fts            tsvector generated always as
                    (to_tsvector('dutch',
                      coalesce(title,'') || ' ' || coalesce(description,''))) stored,
  fetched_at     timestamptz,
  expires_at     timestamptz,     -- null = local (never expires); AH = fetched_at + 7d
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists recipes_fts_idx         on recipes using gin (fts);
create index if not exists recipes_title_trgm_idx  on recipes using gin (title gin_trgm_ops);
create index if not exists recipes_search_trgm_idx on recipes using gin (search_text gin_trgm_ops);
create index if not exists recipes_expires_idx     on recipes (expires_at);
create index if not exists recipes_source_idx      on recipes (source);
-- normalized-title lookup used for prefer-local dedupe
create index if not exists recipes_title_lower_idx on recipes (lower(title));

-- ---------------------------------------------------------------------------
-- Per-user profile + macro goals
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  goal_kcal    int,
  goal_protein int,
  goal_carbs   int,
  goal_fat     int,
  diet         text[],
  avoid_ingredients text[],
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Likes (drives timeline "liked this week")
-- ---------------------------------------------------------------------------
create table if not exists recipe_likes (
  user_id    uuid references auth.users(id) on delete cascade,
  recipe_id  uuid references recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
create index if not exists recipe_likes_recent_idx on recipe_likes (created_at);
create index if not exists recipe_likes_recipe_idx on recipe_likes (recipe_id);

-- ---------------------------------------------------------------------------
-- AH member tokens (encrypted, server-only)
-- ---------------------------------------------------------------------------
create table if not exists ah_connections (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  access_token_enc  text,   -- base64(iv|tag|ciphertext), AES-256-GCM
  refresh_token_enc text,
  expires_at        timestamptz,
  status            text not null default 'active',   -- active | revoked
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Shared anonymous AH token (single row)
create table if not exists ah_service_token (
  id           int primary key default 1 check (id = 1),
  access_token text,
  expires_at   timestamptz,
  refreshed_at timestamptz
);
insert into ah_service_token (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- ingredient -> AH product cache + per-user favorite override
-- ---------------------------------------------------------------------------
create table if not exists ah_product_map (
  ingredient_norm    text primary key,
  webshop_id         bigint,
  product_title      text,
  price_before_bonus numeric,
  sales_unit_size    text,
  mapped_at          timestamptz not null default now(),
  expires_at         timestamptz
);

create table if not exists user_favorite_products (
  user_id         uuid references auth.users(id) on delete cascade,
  ingredient_norm text,
  webshop_id      bigint,
  product_title   text,
  created_at      timestamptz not null default now(),
  primary key (user_id, ingredient_norm)
);

-- Query-result cache: remembers the AH result set (ordered external ids) for a
-- search term so multi-word queries cache correctly and we don't re-hit AH.
-- An empty array = a genuine "AH returned nothing" miss.
drop table if exists ah_search_miss;   -- superseded by ah_query_cache
create table if not exists ah_query_cache (
  query_norm     text primary key,
  recipe_ext_ids text[] not null default '{}',
  expires_at     timestamptz not null
);

-- Per-recipe shoppable products: AH's own ingredient->product mapping
-- (chosen product + alternatives), or a product-search fallback for local
-- recipes. Cached for a week. suggestions jsonb shape:
--   [{ index, ingredient, optional, chosen: Product|null, alternatives: Product[] }]
-- where Product = { productId, title, brand, salesUnitSize, priceFormatted,
--                    priceAmount, quantity, imageUrl }
create table if not exists ah_recipe_products (
  recipe_id   uuid primary key references recipes(id) on delete cascade,
  suggestions jsonb not null default '[]',
  fetched_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

-- Cache of ad-hoc product searches (for the "browse alternative" popover), 1 week.
create table if not exists ah_product_search_cache (
  query_norm text primary key,
  products   jsonb not null default '[]',
  expires_at timestamptz not null
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles                enable row level security;
alter table recipe_likes            enable row level security;
alter table user_favorite_products  enable row level security;
alter table recipes                 enable row level security;
alter table ah_product_map          enable row level security;
alter table ah_connections          enable row level security;
alter table ah_service_token        enable row level security;
alter table ah_query_cache          enable row level security;
alter table ah_recipe_products      enable row level security;
alter table ah_product_search_cache enable row level security;

-- profiles: owner only
drop policy if exists profiles_owner on profiles;
create policy profiles_owner on profiles
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recipe_likes: owner only
drop policy if exists likes_owner on recipe_likes;
create policy likes_owner on recipe_likes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- favorite products: owner only
drop policy if exists fav_owner on user_favorite_products;
create policy fav_owner on user_favorite_products
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recipes: public read, writes via service role only (service role bypasses RLS)
drop policy if exists recipes_public_read on recipes;
create policy recipes_public_read on recipes for select using (true);

-- product map: public read
drop policy if exists product_map_read on ah_product_map;
create policy product_map_read on ah_product_map for select using (true);

-- ah_connections / ah_service_token / ah_query_cache / ah_recipe_products /
-- ah_product_search_cache: no policies => only the service role can touch them
-- (all accessed via server-side API routes using the service-role client).


-- ============================================================================
-- RPCs used by the app. Run after schema.sql.
-- ============================================================================

-- Recipe search: local recipes + non-expired AH recipes, FTS + trigram fuzzy,
-- ranked, prefer-local dedupe by normalized title. SECURITY INVOKER is fine
-- because `recipes` has a public-read policy.
create or replace function search_recipes(q text, max_results int default 20)
returns setof recipes
language sql stable
as $$
  with matched as (
    select r as rec,
           (ts_rank(r.fts, websearch_to_tsquery('dutch', q))
              + similarity(coalesce(r.search_text, r.title), q)
              + coalesce(r.rating_avg, 0) / 20.0
              + case when r.source = 'local' then 0.05 else 0 end) as score
    from recipes r
    where (r.source = 'local' or (r.source = 'ah' and r.expires_at > now()))
      and (
        r.fts @@ websearch_to_tsquery('dutch', q)
        or r.title % q
        or coalesce(r.search_text, '') % q
        or r.title ilike '%' || q || '%'
      )
  ),
  -- prefer-local dedupe: rank rows per normalized title, local first
  ranked as (
    select m.rec, m.score,
           row_number() over (
             partition by lower((m.rec).title)
             order by ((m.rec).source = 'local') desc, m.score desc
           ) as rn
    from matched m
  )
  select (rec).*
  from ranked
  where rn = 1
  order by score desc
  limit max_results;
$$;

-- Count of currently-visible matches (used to decide the AH fallback).
create or replace function count_visible_recipes(q text)
returns int
language sql stable
as $$
  with ranked as (
    select row_number() over (partition by lower(r.title)
              order by (r.source = 'local') desc) as rn
    from recipes r
    where (r.source = 'local' or (r.source = 'ah' and r.expires_at > now()))
      and (
        r.fts @@ websearch_to_tsquery('dutch', q)
        or r.title % q
        or coalesce(r.search_text, '') % q
        or r.title ilike '%' || q || '%'
      )
  )
  select coalesce(count(*) filter (where rn = 1), 0)::int from ranked;
$$;

-- Timeline: recipes liked in the last `days` days, most-liked first.
create or replace function liked_recipes(days int default 7, max_results int default 12)
returns table (recipe recipes, like_count bigint)
language sql stable
as $$
  select r, count(*) as like_count
  from recipe_likes l
  join recipes r on r.id = l.recipe_id
  where l.created_at > now() - make_interval(days => days)
  group by r.id, r
  order by like_count desc, r.rating_avg desc nulls last
  limit max_results;
$$;

-- Timeline: all-time most-favorited recipes.
create or replace function most_liked_recipes(max_results int default 12)
returns table (recipe recipes, like_count bigint)
language sql stable
as $$
  select r, count(*) as like_count
  from recipe_likes l
  join recipes r on r.id = l.recipe_id
  group by r.id, r
  order by like_count desc, r.rating_avg desc nulls last
  limit max_results;
$$;

-- Timeline: best-rated recipes (AH ratings), requiring a minimum number of
-- ratings so a single 5-star doesn't dominate.
create or replace function top_rated_recipes(min_count int default 20, max_results int default 12)
returns setof recipes
language sql stable
as $$
  select *
  from recipes
  where rating_avg is not null
    and coalesce(rating_count, 0) >= min_count
    and (source = 'local' or (source = 'ah' and expires_at > now()))
  order by rating_avg desc, rating_count desc
  limit max_results;
$$;

-- (Stampede protection is handled in application code via a short-lived claim
--  row in ah_query_cache; no advisory locks — they don't survive the Supabase
--  transaction pooler.)
