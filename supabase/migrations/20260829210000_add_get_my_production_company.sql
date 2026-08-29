create or replace function public.get_my_production_company()
returns table (
  id uuid,
  name text,
  logo_url text,
  active boolean
)
language sql
security definer
set search_path = public
as $function$
  select
    company.id,
    company.name,
    company.logo_url,
    company.active
  from public.profiles as profile
  join public.production_companies as company
    on company.id = profile.production_company_id
  where profile.user_id = auth.uid();
$function$;

revoke all on function public.get_my_production_company() from public;
grant execute on function public.get_my_production_company() to authenticated;

comment on function public.get_my_production_company() is
  'Returns the authenticated user''s associated production company, if any.';
