create or replace function public.guard_request_project_location_mutation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_request_project public.request_projects%rowtype;
  v_request_project_id uuid;
begin
  v_request_project_id := coalesce(new.request_project_id, old.request_project_id);

  select *
  into v_request_project
  from public.request_projects
  where id = v_request_project_id
  for update;

  if not found then
    if tg_op = 'DELETE' then
      return old;
    end if;

    raise exception 'request project not found'
      using errcode = 'P0002';
  end if;

  if v_request_project.status in ('confirmed', 'closed') then
    raise exception 'request project is immutable in status %', v_request_project.status
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;
