create or replace function public.get_public_locations_by_category(
  p_category_slug text,
  p_department_slug text default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  location_code text,
  category_slug text,
  department_name text,
  cover_image_url text,
  cover_image_alt text,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered_locations as (
    select
      l.id,
      l.location_code,
      c.slug as category_slug,
      d.name as department_name
    from public.locations l
    join public.categories c
      on c.id = l.category_id
    left join public.departments d
      on d.id = l.department_id
    where l.published = true
      and lower(c.slug) = lower(trim(p_category_slug))
      and (
        nullif(trim(coalesce(p_department_slug, '')), '') is null
        or lower(coalesce(d.slug, '')) = lower(trim(p_department_slug))
      )
  ),
  paged_locations as (
    select
      filtered_locations.*,
      count(*) over() as total_count
    from filtered_locations
    order by filtered_locations.location_code asc nulls last, filtered_locations.id asc
    limit least(greatest(coalesce(p_limit, 24), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    paged_locations.id,
    paged_locations.location_code,
    paged_locations.category_slug,
    coalesce(paged_locations.department_name, 'Sin departamento') as department_name,
    cover_image.cover_image_url,
    coalesce(cover_image.cover_image_alt, 'Imagen de locacion') as cover_image_alt,
    paged_locations.total_count
  from paged_locations
  left join lateral (
    select
      li.url as cover_image_url,
      coalesce(li.alt_text, 'Imagen de locacion') as cover_image_alt
    from public.location_images li
    where li.location_id = paged_locations.id
      and li.url is not null
    order by
      case when li.is_cover = true then 0 else 1 end,
      coalesce(li.sort_order, 2147483647),
      li.url
    limit 1
  ) cover_image on true
  order by paged_locations.location_code asc nulls last, paged_locations.id asc;
$$;

grant execute on function public.get_public_locations_by_category(
  text,
  text,
  integer,
  integer
) to anon, authenticated;
