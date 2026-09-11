create or replace function public.assert_request_project_mutable(p_request_project_id uuid)
returns public.request_projects
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_project public.request_projects%rowtype;
begin
  select *
  into v_project
  from public.request_projects
  where id = p_request_project_id
  for update;

  if not found then
    raise exception 'request project not found'
      using errcode = 'P0002';
  end if;

  if v_project.status in ('confirmed', 'closed') then
    raise exception 'request project is immutable in status %', v_project.status
      using errcode = 'P0001';
  end if;

  return v_project;
end;
$function$;

revoke all on function public.assert_request_project_mutable(uuid)
  from public;

create or replace function public.guard_request_project_immutable_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if old.status in ('confirmed', 'closed') then
    raise exception 'request project is immutable in status %', old.status
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

drop trigger if exists guard_request_project_immutable_update
  on public.request_projects;

create trigger guard_request_project_immutable_update
before update on public.request_projects
for each row
execute function public.guard_request_project_immutable_update();

create or replace function public.guard_request_project_location_mutation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_request_project_id uuid;
begin
  v_request_project_id := coalesce(new.request_project_id, old.request_project_id);

  perform public.assert_request_project_mutable(v_request_project_id);

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

drop trigger if exists guard_request_project_location_mutation
  on public.request_project_locations;

create trigger guard_request_project_location_mutation
before insert or update or delete on public.request_project_locations
for each row
execute function public.guard_request_project_location_mutation();

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

drop trigger if exists guard_request_project_location_image_mutation
  on public.request_project_location_images;

create trigger guard_request_project_location_image_mutation
before insert or update or delete on public.request_project_location_images
for each row
execute function public.guard_request_project_location_image_mutation();

create or replace function public.sync_request_project_selection(
  p_request_project_id uuid,
  p_selection jsonb,
  p_allow_empty_selection boolean default false
)
returns table(
  request_project_id uuid,
  status text,
  location_count integer,
  image_count integer,
  has_unsubmitted_changes boolean
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_project public.request_projects%rowtype;
  v_location jsonb;
  v_image jsonb;
  v_location_id uuid;
  v_request_project_location_id uuid;
  v_location_index integer := 0;
  v_image_index integer;
  v_location_count integer := 0;
  v_image_count integer := 0;
begin
  select *
  into v_project
  from public.request_projects
  where id = p_request_project_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'request project not found'
      using errcode = 'P0002';
  end if;

  if v_project.status in ('confirmed', 'closed') then
    raise exception 'request project is immutable in status %', v_project.status
      using errcode = 'P0001';
  end if;

  if p_selection is null or jsonb_typeof(p_selection) <> 'array' then
    raise exception 'selection must be a json array'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_selection) = 0 and not p_allow_empty_selection then
    return query
    select
      v_project.id,
      v_project.status,
      (
        select count(*)::integer
        from public.request_project_locations rpl
        where rpl.request_project_id = v_project.id
      ),
      (
        select count(*)::integer
        from public.request_project_location_images rpli
        join public.request_project_locations rpl
          on rpl.id = rpli.request_project_location_id
        where rpl.request_project_id = v_project.id
      ),
      v_project.has_unsubmitted_changes;
    return;
  end if;

  delete from public.request_project_locations
  where request_project_locations.request_project_id = p_request_project_id;

  for v_location in
    select value
    from jsonb_array_elements(p_selection)
  loop
    v_location_id := nullif(v_location->>'locationId', '')::uuid;

    if v_location_id is null then
      raise exception 'selection locationId is required'
        using errcode = '22023';
    end if;

    insert into public.request_project_locations (
      request_project_id,
      location_id,
      sort_order,
      location_code_snapshot,
      location_title_snapshot,
      category_slug_snapshot,
      cover_image_url_snapshot
    )
    values (
      p_request_project_id,
      v_location_id,
      v_location_index,
      nullif(v_location->>'locationCode', ''),
      nullif(v_location->>'locationTitle', ''),
      nullif(v_location->>'categorySlug', ''),
      nullif(v_location->>'coverImageUrl', '')
    )
    returning id into v_request_project_location_id;

    v_location_count := v_location_count + 1;
    v_image_index := 0;

    if coalesce(jsonb_typeof(v_location->'images'), 'array') <> 'array' then
      raise exception 'selection images must be a json array'
        using errcode = '22023';
    end if;

    for v_image in
      select value
      from jsonb_array_elements(coalesce(v_location->'images', '[]'::jsonb))
    loop
      insert into public.request_project_location_images (
        request_project_location_id,
        location_image_id,
        sort_order,
        image_url_snapshot
      )
      values (
        v_request_project_location_id,
        nullif(v_image->>'locationImageId', '')::uuid,
        v_image_index,
        nullif(v_image->>'imageUrl', '')
      );

      v_image_count := v_image_count + 1;
      v_image_index := v_image_index + 1;
    end loop;

    v_location_index := v_location_index + 1;
  end loop;

  if v_project.status <> 'draft' then
    update public.request_projects
    set
      has_unsubmitted_changes = true,
      updated_at = timezone('utc', now())
    where id = p_request_project_id
    returning * into v_project;
  end if;

  return query
  select
    v_project.id,
    v_project.status,
    v_location_count,
    v_image_count,
    v_project.has_unsubmitted_changes;
end;
$function$;

revoke all on function public.sync_request_project_selection(uuid, jsonb, boolean)
  from public;

grant execute on function public.sync_request_project_selection(uuid, jsonb, boolean)
  to authenticated;
