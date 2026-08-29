drop function if exists public.search_public_locations_v4(
  text,
  text[],
  text[],
  text[],
  text[],
  text,
  integer
);

create or replace function public.search_public_locations_v4(
  p_core_query text default null,
  p_category_slugs text[] default '{}',
  p_feature_slugs text[] default '{}',
  p_tag_slugs text[] default '{}',
  p_free_text_terms text[] default '{}',
  p_department_slug text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  slug text,
  location_code text,
  category_name text,
  department_name text,
  zone_name text,
  cover_image_url text,
  cover_image_alt text,
  features text[],
  matched_feature_count integer,
  selected_feature_count integer,
  matched_tag_count integer,
  selected_tag_count integer,
  total_count integer,
  search_score numeric,
  match_reason text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with params as (
    select
      nullif(trim(p_core_query), '') as raw_core_query,
      public.normalize_search_text(nullif(trim(p_core_query), '')) as normalized_core_query,
      public.normalize_location_code(nullif(trim(p_core_query), '')) as normalized_core_code,
      coalesce(
        array(
          select distinct normalized_term
          from (
            select public.normalize_search_text(term) as normalized_term
            from regexp_split_to_table(
              coalesce(public.normalize_search_text(nullif(trim(p_core_query), '')), ''),
              '[[:space:]]+'
            ) as core_terms(term)
          ) normalized_core_terms
          where normalized_term is not null
          order by normalized_term
        ),
        '{}'::text[]
      ) as normalized_core_terms,
      coalesce(
        array(
          select distinct public.normalize_search_text(category_slug)
          from unnest(coalesce(p_category_slugs, '{}'::text[])) as category_slugs(category_slug)
          where public.normalize_search_text(category_slug) is not null
          order by public.normalize_search_text(category_slug)
        ),
        '{}'::text[]
      ) as normalized_category_slugs,
      coalesce(
        array(
          select distinct public.normalize_search_text(feature_slug)
          from unnest(coalesce(p_feature_slugs, '{}'::text[])) as feature_slugs(feature_slug)
          where public.normalize_search_text(feature_slug) is not null
          order by public.normalize_search_text(feature_slug)
        ),
        '{}'::text[]
      ) as normalized_feature_slugs,
      coalesce(
        array(
          select distinct public.normalize_search_text(tag_slug)
          from unnest(coalesce(p_tag_slugs, '{}'::text[])) as tag_slugs(tag_slug)
          where public.normalize_search_text(tag_slug) is not null
          order by public.normalize_search_text(tag_slug)
        ),
        '{}'::text[]
      ) as normalized_tag_slugs,
      coalesce(
        array(
          select distinct public.normalize_search_text(term)
          from unnest(coalesce(p_free_text_terms, '{}'::text[])) as free_text_terms(term)
          where public.normalize_search_text(term) is not null
          order by public.normalize_search_text(term)
        ),
        '{}'::text[]
      ) as normalized_free_text_terms,
      public.normalize_search_text(nullif(trim(p_department_slug), '')) as normalized_department_slug,
      greatest(coalesce(p_limit, 100), 1) as limit_rows
  ),
  param_counts as (
    select
      params.*,
      coalesce(array_length(params.normalized_category_slugs, 1), 0) as selected_category_count,
      coalesce(array_length(params.normalized_feature_slugs, 1), 0) as selected_feature_count,
      coalesce(array_length(params.normalized_tag_slugs, 1), 0) as selected_tag_count,
      coalesce(array_length(params.normalized_free_text_terms, 1), 0) as selected_free_text_count
    from params
  ),
  base_locations as (
    select
      l.id,
      l.slug as internal_slug,
      l.location_code,
      l.title,
      l.short_description,
      l.description,
      c.name as category_name,
      c.slug as category_slug,
      c.aliases as category_aliases,
      c.location_code_prefix,
      d.name as department_name,
      d.slug as department_slug,
      z.name as zone_name
    from public.locations l
    left join public.categories c
      on c.id = l.category_id
    left join public.departments d
      on d.id = l.department_id
    left join public.zones z
      on z.id = l.zone_id
    cross join param_counts
    where l.published = true
      and (
        param_counts.normalized_department_slug is null
        or public.normalize_search_text(coalesce(d.slug, '')) = param_counts.normalized_department_slug
      )
  ),
  feature_agg as (
    select
      lf.location_id,
      coalesce(
        array_agg(distinct f.name order by f.name)
          filter (where f.name is not null),
        '{}'::text[]
      ) as features,
      coalesce(
        array_agg(distinct f.slug order by f.slug)
          filter (where f.slug is not null),
        '{}'::text[]
      ) as feature_slugs,
      coalesce(
        array_agg(distinct feature_alias.alias order by feature_alias.alias)
          filter (where feature_alias.alias is not null),
        '{}'::text[]
      ) as feature_aliases,
      trim(
        concat_ws(
          ' ',
          coalesce(
            string_agg(distinct f.name, ' ' order by f.name)
              filter (where f.name is not null),
            ''
          ),
          coalesce(
            string_agg(distinct f.slug, ' ' order by f.slug)
              filter (where f.slug is not null),
            ''
          ),
          coalesce(
            string_agg(distinct feature_alias.alias, ' ' order by feature_alias.alias)
              filter (where feature_alias.alias is not null),
            ''
          )
        )
      ) as feature_search_text
    from public.location_features lf
    join public.features f
      on f.id = lf.feature_id
    left join lateral unnest(coalesce(f.aliases, '{}'::text[])) as feature_alias(alias)
      on true
    where coalesce(f.active, true)
    group by lf.location_id
  ),
  tag_agg as (
    select
      lt.location_id,
      coalesce(
        array_agg(distinct t.name order by t.name)
          filter (where t.name is not null),
        '{}'::text[]
      ) as tag_names,
      coalesce(
        array_agg(distinct t.slug order by t.slug)
          filter (where t.slug is not null),
        '{}'::text[]
      ) as tag_slugs,
      trim(
        concat_ws(
          ' ',
          coalesce(
            string_agg(distinct t.name, ' ' order by t.name)
              filter (where t.name is not null),
            ''
          ),
          coalesce(
            string_agg(distinct t.slug, ' ' order by t.slug)
              filter (where t.slug is not null),
            ''
          )
        )
      ) as tag_search_text
    from public.location_tags lt
    join public.tags t
      on t.id = lt.tag_id
    where coalesce(t.active, true)
    group by lt.location_id
  ),
  image_agg as (
    select distinct on (li.location_id)
      li.location_id,
      li.url as cover_image_url,
      coalesce(li.alt_text, 'Imagen de locacion') as cover_image_alt
    from public.location_images li
    where li.url is not null
    order by
      li.location_id,
      case when li.is_cover = true then 0 else 1 end,
      coalesce(li.sort_order, 2147483647),
      li.url
  ),
  search_source as (
    select
      bl.id,
      coalesce(nullif(trim(bl.internal_slug), ''), lower(trim(bl.location_code)), bl.id::text) as slug,
      bl.location_code,
      bl.title,
      bl.short_description,
      bl.description,
      coalesce(bl.category_name, 'Sin categoria') as category_name,
      bl.category_slug,
      coalesce(bl.category_aliases, '{}'::text[]) as category_aliases,
      bl.location_code_prefix,
      coalesce(bl.department_name, 'Sin departamento') as department_name,
      bl.department_slug,
      coalesce(bl.zone_name, 'Sin zona') as zone_name,
      ia.cover_image_url,
      coalesce(ia.cover_image_alt, 'Imagen de locacion') as cover_image_alt,
      coalesce(fa.features, '{}'::text[]) as features,
      coalesce(fa.feature_slugs, '{}'::text[]) as feature_slugs,
      coalesce(fa.feature_aliases, '{}'::text[]) as feature_aliases,
      coalesce(ta.tag_names, '{}'::text[]) as tag_names,
      coalesce(ta.tag_slugs, '{}'::text[]) as tag_slugs,
      coalesce(fa.feature_search_text, '') as feature_search_text,
      coalesce(ta.tag_search_text, '') as tag_search_text
    from base_locations bl
    left join feature_agg fa
      on fa.location_id = bl.id
    left join tag_agg ta
      on ta.location_id = bl.id
    left join image_agg ia
      on ia.location_id = bl.id
  ),
  normalized_source as (
    select
      ss.*,
      public.normalize_search_text(ss.location_code) as normalized_location_code_words,
      public.normalize_location_code(ss.location_code) as normalized_location_code,
      public.normalize_search_text(ss.category_name) as normalized_category_name,
      public.normalize_search_text(ss.category_slug) as normalized_category_slug,
      public.normalize_search_text(ss.location_code_prefix) as normalized_location_code_prefix,
      coalesce(
        array(
          select distinct normalized_alias
          from (
            select public.normalize_search_text(category_alias) as normalized_alias
            from unnest(ss.category_aliases) as category_aliases(category_alias)
          ) normalized_category_aliases
          where normalized_alias is not null
          order by normalized_alias
        ),
        '{}'::text[]
      ) as normalized_category_aliases,
      coalesce(
        array(
          select distinct normalized_feature_term
          from (
            select public.normalize_search_text(feature_name) as normalized_feature_term
            from unnest(ss.features) as feature_names(feature_name)
            union all
            select public.normalize_search_text(feature_slug) as normalized_feature_term
            from unnest(ss.feature_slugs) as feature_slugs(feature_slug)
            union all
            select public.normalize_search_text(feature_alias) as normalized_feature_term
            from unnest(ss.feature_aliases) as feature_aliases(feature_alias)
          ) normalized_feature_terms
          where normalized_feature_term is not null
          order by normalized_feature_term
        ),
        '{}'::text[]
      ) as normalized_feature_terms,
      coalesce(
        array(
          select distinct normalized_tag_term
          from (
            select public.normalize_search_text(tag_name) as normalized_tag_term
            from unnest(ss.tag_names) as tag_names(tag_name)
            union all
            select public.normalize_search_text(tag_slug) as normalized_tag_term
            from unnest(ss.tag_slugs) as tag_slugs(tag_slug)
          ) normalized_tag_terms
          where normalized_tag_term is not null
          order by normalized_tag_term
        ),
        '{}'::text[]
      ) as normalized_tag_terms,
      public.normalize_search_text(ss.feature_search_text) as normalized_feature_text,
      public.normalize_search_text(ss.tag_search_text) as normalized_tag_text,
      public.normalize_search_text(
        concat_ws(' ', ss.title, ss.short_description, ss.description)
      ) as normalized_semantic_text,
      setweight(
        to_tsvector(
          'simple',
          coalesce(
            public.normalize_search_text(
              concat_ws(
                ' ',
                ss.category_name,
                ss.category_slug,
                array_to_string(ss.category_aliases, ' ')
              )
            ),
            ''
          )
        ),
        'A'
      ) as category_document,
      setweight(
        to_tsvector(
          'simple',
          coalesce(public.normalize_search_text(ss.feature_search_text), '')
        ),
        'A'
      ) as feature_document,
      setweight(
        to_tsvector(
          'simple',
          coalesce(public.normalize_search_text(concat_ws(' ', ss.title, ss.short_description, ss.description)), '')
        ),
        'A'
      ) as semantic_document,
      setweight(
        to_tsvector(
          'simple',
          coalesce(public.normalize_search_text(ss.tag_search_text), '')
        ),
        'A'
      ) as tag_document
    from search_source ss
  ),
  signal_source as (
    select
      ns.id,
      ns.slug,
      ns.location_code,
      ns.category_name,
      ns.department_name,
      ns.zone_name,
      ns.cover_image_url,
      ns.cover_image_alt,
      ns.features,
      coalesce((
        select count(*)::integer
        from unnest(param_counts.normalized_category_slugs) as selected_category(category_slug)
        where selected_category.category_slug = ns.normalized_category_slug
      ), 0) as matched_category_count,
      case
        when param_counts.selected_category_count > 0
        then ts_rank(
          ns.category_document,
          websearch_to_tsquery('simple', array_to_string(param_counts.normalized_category_slugs, ' '))
        )
        else 0::real
      end as selected_category_rank,
      coalesce((
        select sum(
          case
            when selected_category_term is null then 0
            when exists (
              select 1
              from unnest(public.expand_search_term_variants(selected_category_term)) as variants(variant)
              where variants.variant is not null
                and (
                  ns.normalized_category_name like '%' || variants.variant || '%'
                  or coalesce(ns.normalized_category_slug, '') like '%' || variants.variant || '%'
                  or coalesce(ns.normalized_location_code_prefix, '') like '%' || variants.variant || '%'
                  or variants.variant = any (ns.normalized_category_aliases)
                )
            ) then 1
            else 0
          end
        )::integer
        from unnest(param_counts.normalized_category_slugs) as selected_categories(selected_category_term)
      ), 0) as selected_category_support_count,
      coalesce((
        select max(
          greatest(
            extensions.similarity(coalesce(ns.normalized_category_name, ''), selected_category_term),
            extensions.similarity(coalesce(ns.normalized_category_slug, ''), selected_category_term),
            extensions.similarity(coalesce(ns.normalized_location_code_prefix, ''), selected_category_term),
            coalesce((
              select max(extensions.similarity(category_alias, selected_category_term))
              from unnest(ns.normalized_category_aliases) as category_aliases(category_alias)
            ), 0::real)
          )
        )
        from unnest(param_counts.normalized_category_slugs) as selected_categories(selected_category_term)
      ), 0::real) as selected_category_similarity,
      coalesce((
        select count(*)::integer
        from unnest(param_counts.normalized_feature_slugs) as selected_feature(feature_slug)
        where selected_feature.feature_slug = any (ns.feature_slugs)
      ), 0) as matched_feature_count,
      param_counts.selected_feature_count as selected_feature_count,
      coalesce((
        select count(*)::integer
        from unnest(param_counts.normalized_tag_slugs) as selected_tag(tag_slug)
        where selected_tag.tag_slug = any (ns.tag_slugs)
      ), 0) as matched_tag_count,
      param_counts.selected_tag_count as selected_tag_count,
      param_counts.selected_category_count,
      param_counts.selected_free_text_count,
      param_counts.normalized_core_query is not null
        and ns.normalized_location_code_words = param_counts.normalized_core_query
        as exact_code_match,
      param_counts.normalized_core_code is not null
        and ns.normalized_location_code = param_counts.normalized_core_code
        as normalized_code_match,
      param_counts.normalized_core_code is not null
        and ns.normalized_location_code like param_counts.normalized_core_code || '%'
        as code_prefix_match,
      case
        when param_counts.normalized_core_code is not null
        then extensions.similarity(ns.normalized_location_code, param_counts.normalized_core_code)
        else 0::real
      end as code_similarity,
      case
        when param_counts.normalized_core_query is not null
        then ts_rank(
          ns.semantic_document,
          websearch_to_tsquery('simple', param_counts.normalized_core_query)
        )
        else 0::real
      end as core_semantic_rank,
      case
        when param_counts.normalized_core_query is not null
        then ts_rank(
          ns.feature_document,
          websearch_to_tsquery('simple', param_counts.normalized_core_query)
        )
        else 0::real
      end as core_feature_rank,
      case
        when param_counts.normalized_core_query is not null
        then ts_rank(
          ns.category_document,
          websearch_to_tsquery('simple', param_counts.normalized_core_query)
        )
        else 0::real
      end as core_category_rank,
      case
        when param_counts.selected_feature_count > 0
        then ts_rank(
          ns.category_document,
          websearch_to_tsquery('simple', array_to_string(param_counts.normalized_feature_slugs, ' '))
        )
        else 0::real
      end as feature_category_rank,
      case
        when param_counts.selected_feature_count > 0
        then ts_rank(
          ns.semantic_document,
          websearch_to_tsquery('simple', array_to_string(param_counts.normalized_feature_slugs, ' '))
        )
        else 0::real
      end as feature_semantic_rank,
      case
        when param_counts.selected_free_text_count > 0
        then ts_rank(
          ns.semantic_document,
          websearch_to_tsquery('simple', array_to_string(param_counts.normalized_free_text_terms, ' '))
        )
        else 0::real
      end as free_text_rank,
      coalesce((
        select sum(
          case
            when free_text_term is null then 0
            when exists (
              select 1
              from unnest(public.expand_search_term_variants(free_text_term)) as variants(variant)
              where variants.variant is not null
                and ns.normalized_semantic_text like '%' || variants.variant || '%'
            ) then 1
            else 0
          end
        )::integer
        from unnest(param_counts.normalized_free_text_terms) as free_text_terms(free_text_term)
      ), 0) as free_text_term_match_count,
      coalesce((
        select sum(
          case
            when selected_feature_term is null then 0
            when exists (
              select 1
              from unnest(public.expand_search_term_variants(selected_feature_term)) as variants(variant)
              where variants.variant is not null
                and (
                  ns.normalized_category_name like '%' || variants.variant || '%'
                  or coalesce(ns.normalized_category_slug, '') like '%' || variants.variant || '%'
                  or coalesce(ns.normalized_location_code_prefix, '') like '%' || variants.variant || '%'
                  or variants.variant = any (ns.normalized_category_aliases)
                )
            ) then 1
            else 0
          end
        )::integer
        from unnest(param_counts.normalized_feature_slugs) as selected_features(selected_feature_term)
      ), 0) as feature_category_support_count,
      coalesce((
        select sum(
          case
            when selected_feature_term is null then 0
            when exists (
              select 1
              from unnest(public.expand_search_term_variants(selected_feature_term)) as variants(variant)
              where variants.variant is not null
                and ns.normalized_semantic_text like '%' || variants.variant || '%'
            ) then 1
            else 0
          end
        )::integer
        from unnest(param_counts.normalized_feature_slugs) as selected_features(selected_feature_term)
      ), 0) as feature_semantic_support_count,
      coalesce((
        select sum(
          case
            when core_term is null then 0
            when char_length(core_term) < 4 then 0
            when ns.normalized_semantic_text like '%' || core_term || '%'
              or ns.normalized_feature_text like '%' || core_term || '%'
              or ns.normalized_category_name like '%' || core_term || '%'
              or coalesce(ns.normalized_category_slug, '') like '%' || core_term || '%'
              or core_term = any (ns.normalized_category_aliases)
            then 1
            else 0
          end
        )::integer
        from unnest(param_counts.normalized_core_terms) as core_terms(core_term)
      ), 0) as core_term_match_count,
      case
        when param_counts.normalized_core_query is not null
        then greatest(
          extensions.similarity(coalesce(ns.normalized_semantic_text, ''), param_counts.normalized_core_query),
          extensions.similarity(coalesce(ns.normalized_feature_text, ''), param_counts.normalized_core_query),
          extensions.similarity(coalesce(ns.normalized_category_name, ''), param_counts.normalized_core_query)
        )
        else 0::real
      end as semantic_trigram,
      (
        param_counts.normalized_core_code is not null
        and (
          param_counts.raw_core_query ~* '[[:alpha:]]'
          and param_counts.raw_core_query ~* '[[:digit:]]'
        )
      ) as is_code_like_query
    from normalized_source ns
    cross join param_counts
  ),
  scored as (
    select
      signal_source.id,
      signal_source.slug,
      signal_source.location_code,
      signal_source.category_name,
      signal_source.department_name,
      signal_source.zone_name,
      signal_source.cover_image_url,
      signal_source.cover_image_alt,
      signal_source.features,
      signal_source.matched_feature_count,
      signal_source.selected_feature_count,
      signal_source.matched_tag_count,
      signal_source.selected_tag_count,
      case
        when signal_source.exact_code_match then 2200::numeric
        when signal_source.normalized_code_match then 2100::numeric
        when signal_source.is_code_like_query and signal_source.code_prefix_match then 1800::numeric
        else
          (
            case
              when signal_source.selected_category_count > 0
                and signal_source.matched_category_count > 0
              then 1600
              else 0
            end
            + (signal_source.matched_feature_count::numeric * 280)
            + (signal_source.free_text_term_match_count::numeric * 255)
            + round(signal_source.free_text_rank::numeric * 320, 3)
            + round(signal_source.core_semantic_rank::numeric * 110, 3)
            + round(signal_source.core_feature_rank::numeric * 70, 3)
            + round(signal_source.core_category_rank::numeric * 120, 3)
            + (signal_source.feature_category_support_count::numeric * 150)
            + (signal_source.feature_semantic_support_count::numeric * 40)
            + round(signal_source.feature_category_rank::numeric * 220, 3)
            + round(signal_source.feature_semantic_rank::numeric * 55, 3)
            + (signal_source.matched_tag_count::numeric * 28)
            + (signal_source.core_term_match_count::numeric * 56)
            + round(signal_source.semantic_trigram::numeric * 65, 3)
            - (
              case
                when signal_source.selected_feature_count > 0
                  and signal_source.selected_category_count = 0
                  and signal_source.matched_feature_count > 0
                  and signal_source.feature_category_support_count = 0
                then 140
                when signal_source.selected_feature_count > 0
                  and signal_source.matched_feature_count > 0
                  and signal_source.feature_category_support_count = 0
                  and signal_source.feature_semantic_support_count = 0
                then 80
                else 0
              end
            )
          )
      end as search_score,
      case
        when signal_source.exact_code_match then 'exact_code'
        when signal_source.normalized_code_match then 'normalized_code'
        when signal_source.selected_category_count > 0
          and signal_source.matched_category_count > 0
          and signal_source.matched_feature_count > 0
        then 'category_feature_anchor'
        when signal_source.selected_category_count > 0
          and signal_source.matched_category_count > 0
        then 'category_anchor'
        when signal_source.matched_feature_count > 0
        then 'feature_anchor'
        when signal_source.free_text_term_match_count > 0
          or signal_source.free_text_rank > 0
        then 'semantic_text'
        when signal_source.matched_tag_count > 0
        then 'tag_support'
        else 'mixed'
      end as match_reason,
      signal_source.selected_category_count,
      signal_source.matched_category_count,
      signal_source.selected_category_rank,
      signal_source.selected_category_support_count,
      signal_source.selected_category_similarity,
      signal_source.selected_free_text_count,
      signal_source.free_text_term_match_count,
      signal_source.free_text_rank,
      signal_source.core_semantic_rank,
      signal_source.core_feature_rank,
      signal_source.core_category_rank,
      signal_source.feature_category_rank,
      signal_source.feature_semantic_rank,
      signal_source.feature_category_support_count,
      signal_source.feature_semantic_support_count,
      signal_source.core_term_match_count,
      signal_source.semantic_trigram,
      signal_source.exact_code_match,
      signal_source.normalized_code_match,
      signal_source.code_prefix_match,
      signal_source.code_similarity,
      signal_source.is_code_like_query
    from signal_source
  ),
  filtered as (
    select scored.*
    from scored
    where
      (
        scored.is_code_like_query
        and (
          scored.exact_code_match
          or scored.normalized_code_match
          or scored.code_prefix_match
          or scored.code_similarity >= 0.72
        )
      )
      or (
        not scored.is_code_like_query
        and (
          (
            scored.selected_category_count > 0
            and scored.matched_category_count > 0
            and (
              scored.selected_feature_count = 0
              or scored.matched_feature_count > 0
              or scored.feature_semantic_support_count > 0
              or scored.feature_semantic_rank > 0.08
              or scored.free_text_term_match_count > 0
              or scored.free_text_rank > 0.05
              or scored.core_semantic_rank > 0.08
            )
          )
          or (
            scored.selected_category_count = 0
            and scored.selected_feature_count > 0
            and scored.matched_feature_count > 0
            and (
              scored.selected_free_text_count = 0
              or scored.free_text_term_match_count > 0
              or scored.free_text_rank > 0.05
              or scored.core_semantic_rank > 0.08
              or scored.semantic_trigram >= 0.28
            )
          )
          or (
            scored.selected_category_count = 0
            and scored.selected_feature_count = 0
            and (
              scored.free_text_term_match_count > 0
              or scored.free_text_rank > 0.06
              or scored.core_semantic_rank > 0.08
              or scored.core_feature_rank > 0.08
              or scored.core_term_match_count > 0
              or (
                scored.matched_tag_count > 0
                and (
                  scored.free_text_term_match_count > 0
                  or scored.free_text_rank > 0.03
                  or scored.core_semantic_rank > 0.03
                )
              )
            )
          )
          or (
            scored.selected_category_count > 0
            and scored.matched_category_count > 0
            and scored.selected_feature_count = 0
            and scored.selected_free_text_count = 0
          )
        )
      )
  ),
  ranked as (
    select
      filtered.*,
      count(*) over()::integer as total_count
    from filtered
  )
  select
    ranked.id,
    ranked.slug,
    ranked.location_code,
    ranked.category_name,
    ranked.department_name,
    ranked.zone_name,
    ranked.cover_image_url,
    ranked.cover_image_alt,
    ranked.features,
    ranked.matched_feature_count,
    ranked.selected_feature_count,
    ranked.matched_tag_count,
    ranked.selected_tag_count,
    ranked.total_count,
    ranked.search_score,
    ranked.match_reason
  from ranked
  order by
    ranked.search_score desc,
    ranked.location_code asc nulls last,
    ranked.id asc
  limit (select limit_rows from param_counts);
$$;

create or replace function public.search_public_locations_v4_related(
  p_core_query text default null,
  p_category_slugs text[] default '{}',
  p_feature_slugs text[] default '{}',
  p_tag_slugs text[] default '{}',
  p_free_text_terms text[] default '{}',
  p_department_slug text default null,
  p_limit integer default 12
)
returns table (
  id uuid,
  slug text,
  location_code text,
  category_name text,
  department_name text,
  zone_name text,
  cover_image_url text,
  cover_image_alt text,
  features text[],
  matched_feature_count integer,
  selected_feature_count integer,
  matched_tag_count integer,
  selected_tag_count integer,
  total_count integer,
  search_score numeric,
  match_reason text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with params as (
    select
      nullif(trim(p_core_query), '') as raw_core_query,
      public.normalize_search_text(nullif(trim(p_core_query), '')) as normalized_core_query,
      public.normalize_location_code(nullif(trim(p_core_query), '')) as normalized_core_code,
      coalesce(
        array(
          select distinct normalized_term
          from (
            select public.normalize_search_text(term) as normalized_term
            from regexp_split_to_table(
              coalesce(public.normalize_search_text(nullif(trim(p_core_query), '')), ''),
              '[[:space:]]+'
            ) as core_terms(term)
          ) normalized_core_terms
          where normalized_term is not null
          order by normalized_term
        ),
        '{}'::text[]
      ) as normalized_core_terms,
      coalesce(
        array(
          select distinct public.normalize_search_text(category_slug)
          from unnest(coalesce(p_category_slugs, '{}'::text[])) as category_slugs(category_slug)
          where public.normalize_search_text(category_slug) is not null
          order by public.normalize_search_text(category_slug)
        ),
        '{}'::text[]
      ) as normalized_category_slugs,
      coalesce(
        array(
          select distinct public.normalize_search_text(feature_slug)
          from unnest(coalesce(p_feature_slugs, '{}'::text[])) as feature_slugs(feature_slug)
          where public.normalize_search_text(feature_slug) is not null
          order by public.normalize_search_text(feature_slug)
        ),
        '{}'::text[]
      ) as normalized_feature_slugs,
      coalesce(
        array(
          select distinct public.normalize_search_text(tag_slug)
          from unnest(coalesce(p_tag_slugs, '{}'::text[])) as tag_slugs(tag_slug)
          where public.normalize_search_text(tag_slug) is not null
          order by public.normalize_search_text(tag_slug)
        ),
        '{}'::text[]
      ) as normalized_tag_slugs,
      coalesce(
        array(
          select distinct public.normalize_search_text(term)
          from unnest(coalesce(p_free_text_terms, '{}'::text[])) as free_text_terms(term)
          where public.normalize_search_text(term) is not null
          order by public.normalize_search_text(term)
        ),
        '{}'::text[]
      ) as normalized_free_text_terms,
      public.normalize_search_text(nullif(trim(p_department_slug), '')) as normalized_department_slug,
      greatest(coalesce(p_limit, 12), 1) as limit_rows
  ),
  param_counts as (
    select
      params.*,
      coalesce(array_length(params.normalized_category_slugs, 1), 0) as selected_category_count,
      coalesce(array_length(params.normalized_feature_slugs, 1), 0) as selected_feature_count,
      coalesce(array_length(params.normalized_tag_slugs, 1), 0) as selected_tag_count,
      coalesce(array_length(params.normalized_free_text_terms, 1), 0) as selected_free_text_count
    from params
  ),
  base_locations as (
    select
      l.id,
      l.slug as internal_slug,
      l.location_code,
      l.title,
      l.short_description,
      l.description,
      c.name as category_name,
      c.slug as category_slug,
      c.aliases as category_aliases,
      c.location_code_prefix,
      d.name as department_name,
      d.slug as department_slug,
      z.name as zone_name
    from public.locations l
    left join public.categories c
      on c.id = l.category_id
    left join public.departments d
      on d.id = l.department_id
    left join public.zones z
      on z.id = l.zone_id
    cross join param_counts
    where l.published = true
      and (
        param_counts.normalized_department_slug is null
        or public.normalize_search_text(coalesce(d.slug, '')) = param_counts.normalized_department_slug
      )
  ),
  feature_agg as (
    select
      lf.location_id,
      coalesce(
        array_agg(distinct f.name order by f.name)
          filter (where f.name is not null),
        '{}'::text[]
      ) as features,
      coalesce(
        array_agg(distinct f.slug order by f.slug)
          filter (where f.slug is not null),
        '{}'::text[]
      ) as feature_slugs,
      coalesce(
        array_agg(distinct feature_alias.alias order by feature_alias.alias)
          filter (where feature_alias.alias is not null),
        '{}'::text[]
      ) as feature_aliases,
      trim(
        concat_ws(
          ' ',
          coalesce(
            string_agg(distinct f.name, ' ' order by f.name)
              filter (where f.name is not null),
            ''
          ),
          coalesce(
            string_agg(distinct f.slug, ' ' order by f.slug)
              filter (where f.slug is not null),
            ''
          ),
          coalesce(
            string_agg(distinct feature_alias.alias, ' ' order by feature_alias.alias)
              filter (where feature_alias.alias is not null),
            ''
          )
        )
      ) as feature_search_text
    from public.location_features lf
    join public.features f
      on f.id = lf.feature_id
    left join lateral unnest(coalesce(f.aliases, '{}'::text[])) as feature_alias(alias)
      on true
    where coalesce(f.active, true)
    group by lf.location_id
  ),
  tag_agg as (
    select
      lt.location_id,
      coalesce(
        array_agg(distinct t.name order by t.name)
          filter (where t.name is not null),
        '{}'::text[]
      ) as tag_names,
      coalesce(
        array_agg(distinct t.slug order by t.slug)
          filter (where t.slug is not null),
        '{}'::text[]
      ) as tag_slugs,
      trim(
        concat_ws(
          ' ',
          coalesce(
            string_agg(distinct t.name, ' ' order by t.name)
              filter (where t.name is not null),
            ''
          ),
          coalesce(
            string_agg(distinct t.slug, ' ' order by t.slug)
              filter (where t.slug is not null),
            ''
          )
        )
      ) as tag_search_text
    from public.location_tags lt
    join public.tags t
      on t.id = lt.tag_id
    where coalesce(t.active, true)
    group by lt.location_id
  ),
  image_agg as (
    select distinct on (li.location_id)
      li.location_id,
      li.url as cover_image_url,
      coalesce(li.alt_text, 'Imagen de locacion') as cover_image_alt
    from public.location_images li
    where li.url is not null
    order by
      li.location_id,
      case when li.is_cover = true then 0 else 1 end,
      coalesce(li.sort_order, 2147483647),
      li.url
  ),
  search_source as (
    select
      bl.id,
      coalesce(nullif(trim(bl.internal_slug), ''), lower(trim(bl.location_code)), bl.id::text) as slug,
      bl.location_code,
      bl.title,
      bl.short_description,
      bl.description,
      coalesce(bl.category_name, 'Sin categoria') as category_name,
      bl.category_slug,
      coalesce(bl.category_aliases, '{}'::text[]) as category_aliases,
      bl.location_code_prefix,
      coalesce(bl.department_name, 'Sin departamento') as department_name,
      bl.department_slug,
      coalesce(bl.zone_name, 'Sin zona') as zone_name,
      ia.cover_image_url,
      coalesce(ia.cover_image_alt, 'Imagen de locacion') as cover_image_alt,
      coalesce(fa.features, '{}'::text[]) as features,
      coalesce(fa.feature_slugs, '{}'::text[]) as feature_slugs,
      coalesce(fa.feature_aliases, '{}'::text[]) as feature_aliases,
      coalesce(ta.tag_names, '{}'::text[]) as tag_names,
      coalesce(ta.tag_slugs, '{}'::text[]) as tag_slugs,
      coalesce(fa.feature_search_text, '') as feature_search_text,
      coalesce(ta.tag_search_text, '') as tag_search_text
    from base_locations bl
    left join feature_agg fa
      on fa.location_id = bl.id
    left join tag_agg ta
      on ta.location_id = bl.id
    left join image_agg ia
      on ia.location_id = bl.id
  ),
  normalized_source as (
    select
      ss.*,
      public.normalize_search_text(ss.location_code) as normalized_location_code_words,
      public.normalize_location_code(ss.location_code) as normalized_location_code,
      public.normalize_search_text(ss.category_name) as normalized_category_name,
      public.normalize_search_text(ss.category_slug) as normalized_category_slug,
      public.normalize_search_text(ss.location_code_prefix) as normalized_location_code_prefix,
      coalesce(
        array(
          select distinct normalized_alias
          from (
            select public.normalize_search_text(category_alias) as normalized_alias
            from unnest(ss.category_aliases) as category_aliases(category_alias)
          ) normalized_category_aliases
          where normalized_alias is not null
          order by normalized_alias
        ),
        '{}'::text[]
      ) as normalized_category_aliases,
      public.normalize_search_text(ss.feature_search_text) as normalized_feature_text,
      public.normalize_search_text(ss.tag_search_text) as normalized_tag_text,
      public.normalize_search_text(
        concat_ws(' ', ss.title, ss.short_description, ss.description)
      ) as normalized_semantic_text,
      setweight(
        to_tsvector(
          'simple',
          coalesce(
            public.normalize_search_text(
              concat_ws(
                ' ',
                ss.category_name,
                ss.category_slug,
                array_to_string(ss.category_aliases, ' ')
              )
            ),
            ''
          )
        ),
        'A'
      ) as category_document,
      setweight(
        to_tsvector(
          'simple',
          coalesce(public.normalize_search_text(ss.feature_search_text), '')
        ),
        'A'
      ) as feature_document,
      setweight(
        to_tsvector(
          'simple',
          coalesce(public.normalize_search_text(concat_ws(' ', ss.title, ss.short_description, ss.description)), '')
        ),
        'A'
      ) as semantic_document,
      setweight(
        to_tsvector(
          'simple',
          coalesce(public.normalize_search_text(ss.tag_search_text), '')
        ),
        'A'
      ) as tag_document
    from search_source ss
  ),
  signal_source as (
    select
      ns.id,
      ns.slug,
      ns.location_code,
      ns.category_name,
      ns.department_name,
      ns.zone_name,
      ns.cover_image_url,
      ns.cover_image_alt,
      ns.features,
      coalesce((
        select count(*)::integer
        from unnest(param_counts.normalized_category_slugs) as selected_category(category_slug)
        where selected_category.category_slug = ns.normalized_category_slug
      ), 0) as matched_category_count,
      case
        when param_counts.selected_category_count > 0
        then ts_rank(
          ns.category_document,
          websearch_to_tsquery('simple', array_to_string(param_counts.normalized_category_slugs, ' '))
        )
        else 0::real
      end as selected_category_rank,
      coalesce((
        select sum(
          case
            when selected_category_term is null then 0
            when exists (
              select 1
              from unnest(public.expand_search_term_variants(selected_category_term)) as variants(variant)
              where variants.variant is not null
                and (
                  ns.normalized_category_name like '%' || variants.variant || '%'
                  or coalesce(ns.normalized_category_slug, '') like '%' || variants.variant || '%'
                  or coalesce(ns.normalized_location_code_prefix, '') like '%' || variants.variant || '%'
                  or variants.variant = any (ns.normalized_category_aliases)
                )
            ) then 1
            else 0
          end
        )::integer
        from unnest(param_counts.normalized_category_slugs) as selected_categories(selected_category_term)
      ), 0) as selected_category_support_count,
      coalesce((
        select max(
          greatest(
            extensions.similarity(coalesce(ns.normalized_category_name, ''), selected_category_term),
            extensions.similarity(coalesce(ns.normalized_category_slug, ''), selected_category_term),
            extensions.similarity(coalesce(ns.normalized_location_code_prefix, ''), selected_category_term),
            coalesce((
              select max(extensions.similarity(category_alias, selected_category_term))
              from unnest(ns.normalized_category_aliases) as category_aliases(category_alias)
            ), 0::real)
          )
        )
        from unnest(param_counts.normalized_category_slugs) as selected_categories(selected_category_term)
      ), 0::real) as selected_category_similarity,
      coalesce((
        select count(*)::integer
        from unnest(param_counts.normalized_feature_slugs) as selected_feature(feature_slug)
        where selected_feature.feature_slug = any (ns.feature_slugs)
      ), 0) as matched_feature_count,
      param_counts.selected_feature_count as selected_feature_count,
      coalesce((
        select count(*)::integer
        from unnest(param_counts.normalized_tag_slugs) as selected_tag(tag_slug)
        where selected_tag.tag_slug = any (ns.tag_slugs)
      ), 0) as matched_tag_count,
      param_counts.selected_tag_count as selected_tag_count,
      param_counts.selected_category_count,
      param_counts.selected_free_text_count,
      case
        when param_counts.normalized_core_query is not null
        then ts_rank(
          ns.semantic_document,
          websearch_to_tsquery('simple', param_counts.normalized_core_query)
        )
        else 0::real
      end as core_semantic_rank,
      case
        when param_counts.normalized_core_query is not null
        then ts_rank(
          ns.feature_document,
          websearch_to_tsquery('simple', param_counts.normalized_core_query)
        )
        else 0::real
      end as core_feature_rank,
      case
        when param_counts.normalized_core_query is not null
        then ts_rank(
          ns.category_document,
          websearch_to_tsquery('simple', param_counts.normalized_core_query)
        )
        else 0::real
      end as core_category_rank,
      case
        when param_counts.selected_feature_count > 0
        then ts_rank(
          ns.category_document,
          websearch_to_tsquery('simple', array_to_string(param_counts.normalized_feature_slugs, ' '))
        )
        else 0::real
      end as feature_category_rank,
      case
        when param_counts.selected_feature_count > 0
        then ts_rank(
          ns.semantic_document,
          websearch_to_tsquery('simple', array_to_string(param_counts.normalized_feature_slugs, ' '))
        )
        else 0::real
      end as feature_semantic_rank,
      case
        when param_counts.selected_free_text_count > 0
        then ts_rank(
          ns.semantic_document,
          websearch_to_tsquery('simple', array_to_string(param_counts.normalized_free_text_terms, ' '))
        )
        else 0::real
      end as free_text_rank,
      coalesce((
        select sum(
          case
            when free_text_term is null then 0
            when exists (
              select 1
              from unnest(public.expand_search_term_variants(free_text_term)) as variants(variant)
              where variants.variant is not null
                and ns.normalized_semantic_text like '%' || variants.variant || '%'
            ) then 1
            else 0
          end
        )::integer
        from unnest(param_counts.normalized_free_text_terms) as free_text_terms(free_text_term)
      ), 0) as free_text_term_match_count,
      coalesce((
        select sum(
          case
            when selected_feature_term is null then 0
            when exists (
              select 1
              from unnest(public.expand_search_term_variants(selected_feature_term)) as variants(variant)
              where variants.variant is not null
                and (
                  ns.normalized_category_name like '%' || variants.variant || '%'
                  or coalesce(ns.normalized_category_slug, '') like '%' || variants.variant || '%'
                  or coalesce(ns.normalized_location_code_prefix, '') like '%' || variants.variant || '%'
                  or variants.variant = any (ns.normalized_category_aliases)
                )
            ) then 1
            else 0
          end
        )::integer
        from unnest(param_counts.normalized_feature_slugs) as selected_features(selected_feature_term)
      ), 0) as feature_category_support_count,
      coalesce((
        select sum(
          case
            when selected_feature_term is null then 0
            when exists (
              select 1
              from unnest(public.expand_search_term_variants(selected_feature_term)) as variants(variant)
              where variants.variant is not null
                and ns.normalized_semantic_text like '%' || variants.variant || '%'
            ) then 1
            else 0
          end
        )::integer
        from unnest(param_counts.normalized_feature_slugs) as selected_features(selected_feature_term)
      ), 0) as feature_semantic_support_count,
      coalesce((
        select sum(
          case
            when core_term is null then 0
            when char_length(core_term) < 4 then 0
            when ns.normalized_semantic_text like '%' || core_term || '%'
              or ns.normalized_feature_text like '%' || core_term || '%'
              or ns.normalized_category_name like '%' || core_term || '%'
              or coalesce(ns.normalized_category_slug, '') like '%' || core_term || '%'
              or core_term = any (ns.normalized_category_aliases)
            then 1
            else 0
          end
        )::integer
        from unnest(param_counts.normalized_core_terms) as core_terms(core_term)
      ), 0) as core_term_match_count,
      case
        when param_counts.normalized_core_query is not null
        then greatest(
          extensions.similarity(coalesce(ns.normalized_semantic_text, ''), param_counts.normalized_core_query),
          extensions.similarity(coalesce(ns.normalized_feature_text, ''), param_counts.normalized_core_query),
          extensions.similarity(coalesce(ns.normalized_category_name, ''), param_counts.normalized_core_query),
          extensions.similarity(coalesce(ns.normalized_category_slug, ''), param_counts.normalized_core_query)
        )
        else 0::real
      end as semantic_trigram,
      (
        param_counts.normalized_core_code is not null
        and (
          param_counts.raw_core_query ~* '[[:alpha:]]'
          and param_counts.raw_core_query ~* '[[:digit:]]'
        )
      ) as is_code_like_query
    from normalized_source ns
    cross join param_counts
  ),
  scored as (
    select
      signal_source.id,
      signal_source.slug,
      signal_source.location_code,
      signal_source.category_name,
      signal_source.department_name,
      signal_source.zone_name,
      signal_source.cover_image_url,
      signal_source.cover_image_alt,
      signal_source.features,
      signal_source.matched_feature_count,
      signal_source.selected_feature_count,
      signal_source.matched_tag_count,
      signal_source.selected_tag_count,
      (
        (signal_source.matched_category_count::numeric * 240)
        + (signal_source.selected_category_support_count::numeric * 120)
        + (signal_source.matched_feature_count::numeric * 180)
        + (signal_source.free_text_term_match_count::numeric * 270)
        + round(signal_source.free_text_rank::numeric * 340, 3)
        + round(signal_source.core_semantic_rank::numeric * 180, 3)
        + round(signal_source.core_feature_rank::numeric * 95, 3)
        + round(signal_source.core_category_rank::numeric * 150, 3)
        + round(signal_source.selected_category_rank::numeric * 180, 3)
        + round(signal_source.selected_category_similarity::numeric * 140, 3)
        + (signal_source.feature_category_support_count::numeric * 125)
        + (signal_source.feature_semantic_support_count::numeric * 35)
        + round(signal_source.feature_category_rank::numeric * 190, 3)
        + round(signal_source.feature_semantic_rank::numeric * 50, 3)
        + (signal_source.matched_tag_count::numeric * 36)
        + (signal_source.core_term_match_count::numeric * 70)
        + round(signal_source.semantic_trigram::numeric * 80, 3)
        - (
          case
            when signal_source.selected_category_count > 0
              and signal_source.matched_category_count = 0
              and signal_source.selected_category_support_count = 0
              and signal_source.selected_category_rank < 0.08
              and signal_source.selected_category_similarity < 0.24
            then 220
            when signal_source.selected_category_count > 0
              and signal_source.matched_category_count = 0
              and signal_source.selected_category_support_count = 0
              and signal_source.selected_category_similarity < 0.38
            then 90
            when signal_source.selected_feature_count > 0
              and signal_source.selected_category_count = 0
              and signal_source.matched_feature_count > 0
              and signal_source.feature_category_support_count = 0
            then 100
            when signal_source.selected_feature_count > 0
              and signal_source.matched_feature_count > 0
              and signal_source.feature_category_support_count = 0
              and signal_source.feature_semantic_support_count = 0
            then 70
            else 0
          end
        )
      ) as search_score,
      case
        when signal_source.matched_feature_count > 0
          and signal_source.free_text_term_match_count > 0
        then 'feature_semantic_related'
        when signal_source.free_text_term_match_count > 0
          or signal_source.free_text_rank > 0
        then 'semantic_related'
        when signal_source.matched_feature_count > 0
        then 'feature_related'
        when signal_source.matched_category_count > 0
          or signal_source.selected_category_support_count > 0
          or signal_source.selected_category_rank > 0.08
          or signal_source.selected_category_similarity >= 0.32
          or signal_source.core_category_rank > 0
        then 'category_related'
        when signal_source.matched_tag_count > 0
        then 'tag_related'
        else 'mixed_related'
      end as match_reason,
      signal_source.selected_category_count,
      signal_source.matched_category_count,
      signal_source.selected_category_rank,
      signal_source.selected_category_support_count,
      signal_source.selected_category_similarity,
      signal_source.free_text_term_match_count,
      signal_source.free_text_rank,
      signal_source.core_semantic_rank,
      signal_source.core_feature_rank,
      signal_source.core_category_rank,
      signal_source.feature_category_rank,
      signal_source.feature_semantic_rank,
      signal_source.feature_category_support_count,
      signal_source.feature_semantic_support_count,
      signal_source.core_term_match_count,
      signal_source.semantic_trigram,
      signal_source.is_code_like_query
    from signal_source
  ),
  filtered as (
    select scored.*
    from scored
    where
      not scored.is_code_like_query
      and (
        (
          scored.selected_category_count = 0
          and (
            scored.matched_feature_count > 0
            or scored.free_text_term_match_count > 0
            or scored.free_text_rank > 0.05
            or scored.core_semantic_rank > 0.07
            or scored.core_feature_rank > 0.06
            or scored.core_category_rank > 0.05
            or scored.core_term_match_count > 0
            or (
              scored.matched_tag_count > 0
              and (
                scored.free_text_term_match_count > 0
                or scored.free_text_rank > 0.03
                or scored.core_semantic_rank > 0.03
                or scored.core_feature_rank > 0.03
              )
            )
          )
        )
        or (
          scored.selected_category_count > 0
          and (
            scored.matched_category_count > 0
            or scored.selected_category_support_count > 0
            or scored.selected_category_rank > 0.08
            or scored.selected_category_similarity >= 0.32
            or (
              (
                scored.matched_feature_count > 0
                or scored.free_text_term_match_count > 0
                or scored.free_text_rank > 0.08
                or scored.core_semantic_rank > 0.1
                or scored.core_feature_rank > 0.08
                or scored.core_term_match_count > 0
              )
              and scored.search_score >= 220
            )
          )
        )
      )
      and scored.search_score >= 140
  ),
  ranked as (
    select
      filtered.*,
      count(*) over()::integer as total_count
    from filtered
  )
  select
    ranked.id,
    ranked.slug,
    ranked.location_code,
    ranked.category_name,
    ranked.department_name,
    ranked.zone_name,
    ranked.cover_image_url,
    ranked.cover_image_alt,
    ranked.features,
    ranked.matched_feature_count,
    ranked.selected_feature_count,
    ranked.matched_tag_count,
    ranked.selected_tag_count,
    ranked.total_count,
    ranked.search_score,
    ranked.match_reason
  from ranked
  order by
    ranked.search_score desc,
    ranked.location_code asc nulls last,
    ranked.id asc
  limit (select limit_rows from param_counts);
$$;

grant execute on function public.search_public_locations_v4(
  text,
  text[],
  text[],
  text[],
  text[],
  text,
  integer
) to anon, authenticated;

grant execute on function public.search_public_locations_v4_related(
  text,
  text[],
  text[],
  text[],
  text[],
  text,
  integer
) to anon, authenticated;
