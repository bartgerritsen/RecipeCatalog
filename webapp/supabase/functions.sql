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
