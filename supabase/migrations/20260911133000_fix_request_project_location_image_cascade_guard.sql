create or replace function public.guard_request_project_location_image_mutation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_request_project_id uuid;
begin
  select request_project_id
  into v_request_project_id
  from public.request_project_locations
  where id = coalesce(new.request_project_location_id, old.request_project_location_id);

  if v_request_project_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;

    raise exception 'request project location not found'
      using errcode = 'P0002';
  end if;

  perform public.assert_request_project_mutable(v_request_project_id);

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;
