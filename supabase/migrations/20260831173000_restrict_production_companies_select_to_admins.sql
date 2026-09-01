grant select on table public.production_companies to authenticated;

revoke select on table public.production_companies from anon;

do $$
begin
  if exists (
    select 1
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'production_companies'
      and c.relrowsecurity is false
  ) then
    execute 'alter table public.production_companies enable row level security';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'production_companies'
      and policyname = 'Admins can read production companies'
  ) then
    execute $policy$
      create policy "Admins can read production companies"
      on public.production_companies
      for select
      to authenticated
      using (public.is_admin())
    $policy$;
  end if;
end;
$$;
