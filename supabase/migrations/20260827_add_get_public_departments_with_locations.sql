create or replace function public.get_public_departments_with_locations()
returns table (
  id uuid,
  name text,
  slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.name,
    d.slug
  from public.departments d
  join public.locations l
    on l.department_id = d.id
  where l.published = true
    and nullif(trim(d.name), '') is not null
    and nullif(trim(d.slug), '') is not null
  group by d.id, d.name, d.slug
  order by d.name asc;
$$;

grant execute on function public.get_public_departments_with_locations()
to anon, authenticated;
