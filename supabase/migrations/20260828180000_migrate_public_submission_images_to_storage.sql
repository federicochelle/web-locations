insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'location-submission-images',
  'location-submission-images',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.location_submission_images
  add column if not exists storage_bucket text,
  add column if not exists storage_path text;

alter table public.location_submission_images
  alter column image_url drop not null;

create unique index if not exists idx_location_submission_images_unique_storage_path
on public.location_submission_images (submission_id, storage_path)
where storage_path is not null;

drop function if exists public.finalize_location_submission_storage_image(
  uuid,
  uuid,
  text,
  text,
  integer
);

create or replace function public.finalize_location_submission_storage_image(
  p_submission_id uuid,
  p_submission_token uuid,
  p_storage_bucket text,
  p_storage_path text,
  p_sort_order integer default 0
)
returns table (
  id uuid,
  storage_bucket text,
  storage_path text,
  sort_order integer
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_storage_bucket text := nullif(btrim(p_storage_bucket), '');
  v_storage_path text := nullif(btrim(p_storage_path), '');
  v_sort_order integer := greatest(0, coalesce(p_sort_order, 0));
  v_existing_image public.location_submission_images%rowtype;
  v_current_count integer;
begin
  if p_submission_id is null or p_submission_token is null then
    raise exception 'La postulacion no es valida.';
  end if;

  if v_storage_bucket is null or v_storage_path is null then
    raise exception 'No pudimos validar la imagen subida.';
  end if;

  if v_storage_bucket <> 'location-submission-images' then
    raise exception 'No pudimos validar la imagen subida.';
  end if;

  if v_storage_path !~ ('^submissions/' || p_submission_id::text || '/[^/]+$') then
    raise exception 'No pudimos validar la imagen subida.';
  end if;

  perform 1
  from public.location_submissions as s
  where s.id = p_submission_id
    and s.submission_token = p_submission_token
  for update;

  if not found then
    raise exception 'La postulacion no es valida.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text, 0));

  select image.*
  into v_existing_image
  from public.location_submission_images as image
  where image.submission_id = p_submission_id
    and image.storage_path = v_storage_path
  for update;

  if found then
    id := v_existing_image.id;
    storage_bucket := v_existing_image.storage_bucket;
    storage_path := v_existing_image.storage_path;
    sort_order := v_existing_image.sort_order;
    return next;
    return;
  end if;

  select count(*)::integer
  into v_current_count
  from public.location_submission_images as image
  where image.submission_id = p_submission_id;

  if v_current_count >= 8 then
    raise exception 'Esta postulacion ya alcanzo el maximo de 8 imagenes.';
  end if;

  insert into public.location_submission_images (
    submission_id,
    submission_token,
    cloudflare_image_id,
    image_url,
    storage_bucket,
    storage_path,
    sort_order
  )
  values (
    p_submission_id,
    p_submission_token,
    null,
    null,
    v_storage_bucket,
    v_storage_path,
    v_sort_order
  )
  returning
    location_submission_images.id,
    location_submission_images.storage_bucket,
    location_submission_images.storage_path,
    location_submission_images.sort_order
  into
    id,
    storage_bucket,
    storage_path,
    sort_order;

  return next;
end;
$function$;

revoke all on function public.finalize_location_submission_storage_image(
  uuid,
  uuid,
  text,
  text,
  integer
) from public, anon, authenticated;

grant execute on function public.finalize_location_submission_storage_image(
  uuid,
  uuid,
  text,
  text,
  integer
) to service_role;
