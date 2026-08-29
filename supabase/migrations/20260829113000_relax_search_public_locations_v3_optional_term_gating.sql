create or replace function public.expand_search_term_variants(input text)
returns text[]
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  with normalized as (
    select public.normalize_search_text(input) as term
  ),
  variants as (
    select term as variant
    from normalized

    union

    select
      case
        when term ~ '^[a-z0-9]+[^aeiou]es$' then left(term, char_length(term) - 2)
        when term ~ '^[a-z0-9]+[aeiou]s$' then left(term, char_length(term) - 1)
        else null
      end as variant
    from normalized

    union

    select
      case
        when term ~ '^[a-z0-9]+[^aeious]$' then term || 'es'
        when term ~ '^[a-z0-9]+[aeiou]$' then term || 's'
        else null
      end as variant
    from normalized
  )
  select
    coalesce(
      array(
        select distinct variant
        from variants
        where variant is not null
          and char_length(variant) > 0
        order by variant
      ),
      '{}'::text[]
    )
$$;

create or replace function public.search_public_locations_v3(
  p_core_query text default null,
  p_optional_terms text[] default '{}',
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
      coalesce((
        select count(*)::integer
        from unnest(
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
                and char_length(normalized_term) >= 4
              order by normalized_term
            ),
            '{}'::text[]
          )
        ) as significant_terms(significant_term)
      ), 0) as significant_core_term_count,
      coalesce(
        array(
          select distinct normalized_term
          from (
            select public.normalize_search_text(term) as normalized_term
            from unnest(coalesce(p_optional_terms, '{}'::text[])) as optional_term(term)
          ) normalized_terms
          where normalized_term is not null
          order by normalized_term
        ),
        '{}'::text[]
      ) as normalized_optional_terms,
      public.normalize_search_text(nullif(trim(p_department_slug), '')) as normalized_department_slug,
      greatest(coalesce(p_limit, 100), 1) as limit_rows
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
    cross join params
    where l.published = true
      and (
        params.normalized_department_slug is null
        or public.normalize_search_text(coalesce(d.slug, '')) = params.normalized_department_slug
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
      public.normalize_search_text(ss.feature_search_text) as normalized_feature_text,
      public.normalize_search_text(ss.tag_search_text) as normalized_tag_text,
      public.normalize_search_text(
        concat_ws(
          ' ',
          ss.title,
          ss.short_description,
          ss.description,
          ss.category_name,
          ss.category_slug,
          array_to_string(ss.category_aliases, ' '),
          ss.feature_search_text,
          ss.tag_search_text
        )
      ) as combined_search_text,
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
      ) ||
      setweight(
        to_tsvector(
          'simple',
          coalesce(
            public.normalize_search_text(
              concat_ws(' ', ss.title, ss.short_description, ss.description)
            ),
            ''
          )
        ),
        'B'
      ) ||
      setweight(
        to_tsvector(
          'simple',
          coalesce(public.normalize_search_text(ss.feature_search_text), '')
        ),
        'C'
      ) ||
      setweight(
        to_tsvector(
          'simple',
          coalesce(public.normalize_search_text(ss.tag_search_text), '')
        ),
        'D'
      ) as fts_document
    from search_source ss
  ),
  core_terms_with_position as (
    select distinct on (normalized_term)
      normalized_term,
      position
    from params
    cross join lateral (
      select
        public.normalize_search_text(term) as normalized_term,
        ordinality::integer as position
      from regexp_split_to_table(
        coalesce(params.normalized_core_query, ''),
        '[[:space:]]+'
      ) with ordinality as core_terms(term, ordinality)
    ) positioned_terms
    where normalized_term is not null
    order by normalized_term, position
  ),
  feature_terms_with_position as (
    select distinct on (normalized_term)
      normalized_term,
      position
    from (
      select
        ctwp.normalized_term,
        ctwp.position
      from core_terms_with_position ctwp

      union all

      select
        optional_terms.normalized_term,
        1000 + optional_terms.position as position
      from params
      cross join lateral (
        select
          public.normalize_search_text(optional_term) as normalized_term,
          ordinality::integer as position
        from unnest(params.normalized_optional_terms)
          with ordinality as optional_terms(optional_term, ordinality)
      ) optional_terms
      where optional_terms.normalized_term is not null
    ) candidate_feature_terms
    order by normalized_term, position
  ),
  detected_strict_typology as (
    select
      matched_category.normalized_term as detected_typology_term
    from (
      select
        ctwp.normalized_term,
        ctwp.position
      from core_terms_with_position ctwp
      join public.categories c
        on (
          public.normalize_search_text(c.name) = ctwp.normalized_term
          or public.normalize_search_text(c.slug) = ctwp.normalized_term
          or public.normalize_search_text(c.location_code_prefix) = ctwp.normalized_term
          or exists (
            select 1
            from unnest(coalesce(c.aliases, '{}'::text[])) as category_aliases(category_alias)
            where public.normalize_search_text(category_alias) = ctwp.normalized_term
          )
        )
      order by ctwp.position
      limit 1
    ) matched_category
  ),
  detected_strict_feature as (
    select
      matched_feature.feature_id,
      matched_feature.feature_name,
      matched_feature.feature_slug,
      matched_feature.normalized_term as detected_feature_term
    from (
      select
        f.id as feature_id,
        f.name as feature_name,
        f.slug as feature_slug,
        ftwp.normalized_term,
        ftwp.position
      from feature_terms_with_position ftwp
      left join detected_strict_typology dst
        on true
      join public.features f
        on (
          public.normalize_search_text(f.name) = ftwp.normalized_term
          or public.normalize_search_text(f.slug) = ftwp.normalized_term
          or exists (
            select 1
            from unnest(coalesce(f.aliases, '{}'::text[])) as feature_aliases(feature_alias)
            where public.normalize_search_text(feature_alias) = ftwp.normalized_term
          )
        )
      where coalesce(f.active, true)
        and ftwp.normalized_term <> coalesce(dst.detected_typology_term, '')
      order by ftwp.position
      limit 1
    ) matched_feature
  ),
  strict_feature_matches as (
    select
      ns.id
    from normalized_source ns
    cross join detected_strict_typology dst
    cross join detected_strict_feature dsf
    where
      (
        ns.normalized_category_name = dst.detected_typology_term
        or coalesce(ns.normalized_category_slug, '') = dst.detected_typology_term
        or dst.detected_typology_term = any (ns.normalized_category_aliases)
        or (
          ns.normalized_location_code_prefix is not null
          and ns.normalized_location_code_prefix = dst.detected_typology_term
        )
      )
      and dsf.detected_feature_term = any (ns.normalized_feature_terms)
  ),
  strict_feature_mode as (
    select
      exists (select 1 from detected_strict_typology)
      and exists (select 1 from detected_strict_feature)
      and exists (select 1 from strict_feature_matches) as use_strict_feature_pass
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
      0::integer as matched_feature_count,
      0::integer as selected_feature_count,
      0::integer as matched_tag_count,
      0::integer as selected_tag_count,
      params.normalized_core_query is not null
        and ns.normalized_location_code_words = params.normalized_core_query
        as exact_code_match,
      params.normalized_core_code is not null
        and ns.normalized_location_code = params.normalized_core_code
        as normalized_code_match,
      params.normalized_core_code is not null
        and ns.normalized_location_code like params.normalized_core_code || '%'
        as code_prefix_match,
      case
        when params.normalized_core_code is not null
        then extensions.similarity(ns.normalized_location_code, params.normalized_core_code)
        else 0::real
      end as code_similarity,
      (
        params.normalized_core_query is not null
        and (
          params.normalized_core_query = any (ns.normalized_category_aliases)
          or ns.normalized_category_name = params.normalized_core_query
          or ns.normalized_category_slug = params.normalized_core_query
        )
      ) as category_exact_match,
      (
        params.normalized_core_query is not null
        and ns.normalized_category_name like '%' || params.normalized_core_query || '%'
      ) as category_partial_match,
      (
        params.normalized_core_query is not null
        and ns.normalized_feature_text like '%' || params.normalized_core_query || '%'
      ) as feature_partial_match,
      (
        params.normalized_core_query is not null
        and ns.normalized_tag_text like '%' || params.normalized_core_query || '%'
      ) as tag_partial_match,
      case
        when params.normalized_core_query is not null
        then ts_rank(
          ns.fts_document,
          websearch_to_tsquery('simple', params.normalized_core_query)
        )
        else 0::real
      end as core_fts_rank,
      case
        when params.normalized_core_query is not null
        then greatest(
          extensions.similarity(ns.normalized_category_name, params.normalized_core_query),
          extensions.similarity(coalesce(ns.normalized_category_slug, ''), params.normalized_core_query),
          extensions.similarity(coalesce(ns.normalized_feature_text, ''), params.normalized_core_query)
        )
        else 0::real
      end as semantic_trigram,
      coalesce((
        select count(*)::integer
        from unnest(params.normalized_core_terms) as core_terms(core_term)
        where core_term is not null
          and char_length(core_term) >= 4
          and (
            ns.normalized_category_name like '%' || core_term || '%'
            or coalesce(ns.normalized_category_slug, '') like '%' || core_term || '%'
            or core_term = any (ns.normalized_category_aliases)
            or coalesce(ns.normalized_feature_text, '') like '%' || core_term || '%'
            or coalesce(ns.normalized_tag_text, '') like '%' || core_term || '%'
            or coalesce(ns.combined_search_text, '') like '%' || core_term || '%'
          )
      ), 0) as core_term_match_count,
      coalesce((
        select sum(
          case
            when optional_term is null then 0::integer
            when exists (
              select 1
              from unnest(public.expand_search_term_variants(optional_term)) as optional_variants(optional_variant)
              where optional_variant is not null
                and ns.combined_search_text like '%' || optional_variant || '%'
            ) then 1
            else 0
          end
        )::integer
        from unnest(params.normalized_optional_terms) as optional_terms(optional_term)
      ), 0) as optional_term_match_count,
      (
        params.normalized_core_code is not null
        and (
          params.raw_core_query ~* '[[:alpha:]]'
          and params.raw_core_query ~* '[[:digit:]]'
        )
      ) as is_code_like_query,
      (
        params.normalized_core_query is not null
        and (
          params.normalized_core_query = any (ns.normalized_category_aliases)
          or ns.normalized_category_name = params.normalized_core_query
          or ns.normalized_category_slug = params.normalized_core_query
          or ns.normalized_category_name like '%' || params.normalized_core_query || '%'
        )
      ) as strong_category_match,
      (
        params.normalized_core_query is not null
        and (
          ns.normalized_feature_text like '%' || params.normalized_core_query || '%'
          or greatest(
            extensions.similarity(coalesce(ns.normalized_feature_text, ''), params.normalized_core_query),
            extensions.similarity(coalesce(ns.normalized_category_name, ''), params.normalized_core_query),
            extensions.similarity(coalesce(ns.normalized_category_slug, ''), params.normalized_core_query)
          ) >= 0.45
        )
      ) as strong_feature_match,
      coalesce((
        select core_term
        from unnest(params.normalized_core_terms) with ordinality as core_terms(core_term, position)
        where core_term is not null
          and char_length(core_term) >= 4
          and core_term not in ('algo', 'ambiente', 'antiguo', 'con', 'de', 'del', 'el', 'en', 'espacio', 'grande', 'la', 'lindo', 'locacion', 'lugar', 'madera', 'sitio')
        order by position
        limit 1
      ), null) as primary_anchor_term,
      (
        params.significant_core_term_count >= 2
        and exists (
          select 1
          from unnest(params.normalized_core_terms) as core_terms(core_term)
          where core_term is not null
            and char_length(core_term) >= 4
            and (
              ns.normalized_category_name = core_term
              or coalesce(ns.normalized_category_slug, '') = core_term
              or core_term = any (ns.normalized_category_aliases)
              or (
                ns.normalized_location_code_prefix is not null
                and ns.normalized_location_code_prefix = core_term
              )
              or ns.normalized_location_code like core_term || '%'
            )
        )
      ) as has_strong_typology_anchor,
      (
        params.normalized_core_code is not null
        and extensions.similarity(ns.normalized_location_code, params.normalized_core_code) >= 0.72
      ) as strong_code_similarity_match
    from normalized_source ns
    cross join params
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
        when params.normalized_core_query is null then 0::numeric
        else
          (
            case
              when signal_source.exact_code_match then 1200
              else 0
            end
            + case
              when signal_source.normalized_code_match then 1150
              else 0
            end
            + case
              when signal_source.is_code_like_query
                and signal_source.code_prefix_match
              then 900
              else 0
            end
            + case
              when signal_source.is_code_like_query
              then round((greatest(signal_source.code_similarity, 0)::numeric) * 280, 3)
              else 0
            end
            + case
              when signal_source.category_exact_match
              then 420
              else 0
            end
            + case
              when signal_source.category_exact_match
              then 360
              else 0
            end
            + case
              when signal_source.category_partial_match
              then 260
              else 0
            end
            + round(signal_source.core_fts_rank::numeric * 180, 3)
            + case
              when signal_source.feature_partial_match
              then 220
              else 0
            end
            + case
              when signal_source.tag_partial_match
              then 120
              else 0
            end
            + round(signal_source.semantic_trigram::numeric * 140, 3)
            + (signal_source.core_term_match_count::numeric * 90)
            + (signal_source.optional_term_match_count::numeric * 18)
          )
      end as search_score,
      case
        when params.normalized_core_query is null then 'empty_query'
        when signal_source.exact_code_match then 'exact_code'
        when signal_source.normalized_code_match then 'normalized_code'
        when signal_source.is_code_like_query
          and signal_source.code_prefix_match
        then 'normalized_code'
        when signal_source.category_exact_match
          or signal_source.category_partial_match
        then 'category'
        when signal_source.core_fts_rank > 0
          and signal_source.semantic_trigram >= 0.35
        then 'mixed'
        when signal_source.core_fts_rank > 0
        then 'full_text'
        when signal_source.semantic_trigram >= 0.35
          or signal_source.code_similarity >= 0.45
        then 'trigram'
        else 'mixed'
      end as match_reason,
      signal_source.exact_code_match,
      signal_source.normalized_code_match,
      signal_source.strong_code_similarity_match,
      signal_source.is_code_like_query
    from signal_source
    cross join params
    where
      params.normalized_core_query is null
      or signal_source.exact_code_match
      or signal_source.normalized_code_match
      or (
        signal_source.is_code_like_query
        and signal_source.code_prefix_match
      )
      or (
        signal_source.is_code_like_query
        and signal_source.code_similarity >= 0.45
      )
      or (
        signal_source.is_code_like_query
        and signal_source.strong_code_similarity_match
      )
      or (
        not signal_source.is_code_like_query
        and params.significant_core_term_count >= 2
        and (
          signal_source.strong_category_match
          or signal_source.strong_feature_match
          or signal_source.core_term_match_count >= 2
          or signal_source.core_fts_rank > 0.12
        )
      )
      or (
        not signal_source.is_code_like_query
        and params.significant_core_term_count < 2
        and coalesce(array_length(params.normalized_optional_terms, 1), 0) > 0
        and (
          signal_source.has_strong_typology_anchor
          or signal_source.strong_category_match
          or signal_source.category_exact_match
          or signal_source.category_partial_match
          or signal_source.strong_feature_match
        )
        and signal_source.optional_term_match_count > 0
      )
      or (
        not signal_source.is_code_like_query
        and params.significant_core_term_count < 2
        and coalesce(array_length(params.normalized_optional_terms, 1), 0) = 0
        and (
          signal_source.tag_partial_match
          or signal_source.core_fts_rank > 0.05
          or signal_source.semantic_trigram >= 0.35
          or signal_source.core_term_match_count > 0
        )
      )
  ),
  code_mode as (
    select
      params.normalized_core_query is not null
        and exists (
          select 1
          from scored
          where exact_code_match
             or normalized_code_match
        ) as has_exactish_code_match,
      params.normalized_core_query is not null
        and exists (
          select 1
          from scored
          where strong_code_similarity_match
        ) as has_strong_code_similarity_match
    from params
  ),
  filtered as (
    select scored.*
    from scored
    cross join code_mode
    cross join strict_feature_mode
    where
      (
        not scored.is_code_like_query
        or (
          code_mode.has_exactish_code_match
          and (
            scored.exact_code_match
            or scored.normalized_code_match
          )
        )
        or (
          not code_mode.has_exactish_code_match
          and code_mode.has_strong_code_similarity_match
          and scored.strong_code_similarity_match
        )
        or (
          not code_mode.has_exactish_code_match
          and not code_mode.has_strong_code_similarity_match
        )
      )
      and (
        not strict_feature_mode.use_strict_feature_pass
        or scored.id in (select id from strict_feature_matches)
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
  cross join params
  order by
    case when params.normalized_core_query is null then 0 else 1 end desc,
    ranked.search_score desc,
    ranked.location_code asc nulls last,
    ranked.id asc
  limit (select limit_rows from params);
$$;

grant execute on function public.search_public_locations_v3(
  text,
  text[],
  text,
  integer
) to anon, authenticated;
