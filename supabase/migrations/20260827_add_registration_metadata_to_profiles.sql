alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (
    user_id,
    full_name,
    email,
    phone,
    role,
    status,
    terms_accepted_at,
    terms_version
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    nullif(btrim(new.raw_user_meta_data->>'phone'), ''),
    'visitor',
    'active',
    nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz,
    nullif(btrim(new.raw_user_meta_data->>'terms_version'), '')
  );

  return new;
end;
$function$;
