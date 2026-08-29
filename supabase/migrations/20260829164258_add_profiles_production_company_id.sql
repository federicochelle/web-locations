alter table public.profiles
  add column if not exists production_company_id uuid;

alter table public.profiles
  drop constraint if exists profiles_production_company_id_fkey;

alter table public.profiles
  add constraint profiles_production_company_id_fkey
  foreign key (production_company_id)
  references public.production_companies(id)
  on delete set null;

create index if not exists profiles_production_company_id_idx
  on public.profiles (production_company_id)
  where production_company_id is not null;

create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.email is distinct from old.email
    or new.created_at is distinct from old.created_at
    or new.production_company_id is distinct from old.production_company_id then
    raise exception 'No tienes permisos para modificar campos protegidos del perfil.';
  end if;

  return new;
end;
$function$;

notify pgrst, 'reload schema';
