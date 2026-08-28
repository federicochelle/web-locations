revoke insert on table public.location_submissions from anon;
revoke insert on table public.location_submission_images from anon;

drop policy if exists "anon can insert location submissions"
on public.location_submissions;

drop policy if exists "anon can insert location submission images with token"
on public.location_submission_images;

create table if not exists public.public_form_rate_limits (
  scope text not null,
  identifier_hash text not null,
  window_start timestamp with time zone not null,
  attempts integer not null default 1,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint public_form_rate_limits_attempts_positive check (attempts > 0),
  constraint public_form_rate_limits_pkey primary key (scope, identifier_hash, window_start)
);

alter table public.public_form_rate_limits enable row level security;

create or replace function public.consume_public_form_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_window_seconds integer,
  p_max_attempts integer,
  p_now timestamp with time zone default timezone('utc', now())
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  current_count integer
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_scope text := nullif(btrim(p_scope), '');
  v_identifier_hash text := nullif(btrim(p_identifier_hash), '');
  v_window_start timestamp with time zone;
  v_window_end timestamp with time zone;
  v_existing_attempts integer;
begin
  if v_scope is null or v_identifier_hash is null then
    raise exception 'invalid rate limit identifier';
  end if;

  if p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'invalid rate limit window';
  end if;

  if p_max_attempts is null or p_max_attempts <= 0 then
    raise exception 'invalid rate limit max attempts';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from p_now) / p_window_seconds) * p_window_seconds
  );
  v_window_end := v_window_start + make_interval(secs => p_window_seconds);

  delete from public.public_form_rate_limits
  where window_start < p_now - interval '2 days';

  insert into public.public_form_rate_limits (
    scope,
    identifier_hash,
    window_start,
    attempts,
    created_at,
    updated_at
  )
  values (
    v_scope,
    v_identifier_hash,
    v_window_start,
    1,
    p_now,
    p_now
  )
  on conflict do nothing
  returning public_form_rate_limits.attempts
  into current_count;

  if found then
    allowed := true;
    retry_after_seconds := 0;
    return next;
    return;
  end if;

  select rl.attempts
  into v_existing_attempts
  from public.public_form_rate_limits as rl
  where rl.scope = v_scope
    and rl.identifier_hash = v_identifier_hash
    and rl.window_start = v_window_start
  for update;

  if v_existing_attempts >= p_max_attempts then
    allowed := false;
    retry_after_seconds := greatest(
      1,
      ceil(extract(epoch from (v_window_end - p_now)))::integer
    );
    current_count := v_existing_attempts;
    return next;
    return;
  end if;

  update public.public_form_rate_limits as rl
  set
    attempts = v_existing_attempts + 1,
    updated_at = p_now
  where rl.scope = v_scope
    and rl.identifier_hash = v_identifier_hash
    and rl.window_start = v_window_start
  returning rl.attempts
  into current_count;

  allowed := true;
  retry_after_seconds := 0;
  return next;
end;
$function$;

revoke all on function public.consume_public_form_rate_limit(
  text,
  text,
  integer,
  integer,
  timestamp with time zone
) from public, anon, authenticated;

grant execute on function public.consume_public_form_rate_limit(
  text,
  text,
  integer,
  integer,
  timestamp with time zone
) to service_role;

drop function if exists public.create_location_submission(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
);

create or replace function public.create_location_submission(
  p_owner_name text,
  p_owner_email text,
  p_owner_phone text,
  p_address text,
  p_description text
)
returns table (
  id uuid,
  submission_token uuid
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner_name text := nullif(btrim(p_owner_name), '');
  v_owner_email text := lower(nullif(btrim(p_owner_email), ''));
  v_owner_phone text := nullif(btrim(p_owner_phone), '');
  v_address text := nullif(btrim(p_address), '');
  v_description text := nullif(btrim(p_description), '');
  v_title text;
  v_description_words text[];
  v_phone_digits text;
begin
  if v_owner_name is null then
    raise exception 'Ingresa tu nombre.';
  end if;

  if char_length(v_owner_name) < 2 then
    raise exception 'Ingresa un nombre valido.';
  end if;

  if char_length(v_owner_name) > 120 then
    raise exception 'El nombre es demasiado largo.';
  end if;

  if v_owner_email is null then
    raise exception 'Ingresa tu email.';
  end if;

  if char_length(v_owner_email) > 320 then
    raise exception 'El email es demasiado largo.';
  end if;

  if v_owner_email !~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$' then
    raise exception 'Ingresa un email valido.';
  end if;

  if v_owner_phone is null then
    raise exception 'Ingresa tu telefono.';
  end if;

  if char_length(v_owner_phone) > 40 then
    raise exception 'El telefono es demasiado largo.';
  end if;

  if v_owner_phone !~ '^[0-9+()./\-\s]+$' then
    raise exception 'Ingresa un telefono valido.';
  end if;

  v_phone_digits := regexp_replace(v_owner_phone, '[^0-9]', '', 'g');

  if char_length(v_phone_digits) < 6 then
    raise exception 'Ingresa un telefono valido.';
  end if;

  if v_address is null then
    raise exception 'Ingresa la ubicacion de la locacion.';
  end if;

  if char_length(v_address) > 200 then
    raise exception 'La ubicacion es demasiado larga.';
  end if;

  if v_description is null then
    raise exception 'Agrega una descripcion de la locacion.';
  end if;

  if char_length(v_description) > 4000 then
    raise exception 'La descripcion es demasiado larga.';
  end if;

  v_description_words := regexp_split_to_array(v_description, '\s+');

  v_title := nullif(
    array_to_string(v_description_words[1:least(coalesce(array_length(v_description_words, 1), 0), 6)], ' '),
    ''
  );

  if v_title is null then
    v_title := v_address;
  end if;

  if v_title is null then
    v_title := format('Postulacion de %s', v_owner_name);
  end if;

  v_title := left(v_title, 160);

  insert into public.location_submissions (
    owner_name,
    owner_email,
    owner_phone,
    title,
    address,
    description
  )
  values (
    v_owner_name,
    v_owner_email,
    v_owner_phone,
    v_title,
    v_address,
    v_description
  )
  returning
    location_submissions.id,
    location_submissions.submission_token
  into
    id,
    submission_token;

  return next;
end;
$function$;

revoke all on function public.create_location_submission(
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.create_location_submission(
  text,
  text,
  text,
  text,
  text
) to service_role;

create unique index if not exists location_submission_images_submission_id_cloudflare_image_id_key
on public.location_submission_images (submission_id, cloudflare_image_id)
where cloudflare_image_id is not null;

create or replace function public.finalize_location_submission_image(
  p_submission_id uuid,
  p_submission_token uuid,
  p_cloudflare_image_id text,
  p_image_url text,
  p_sort_order integer default 0
)
returns table (
  id uuid,
  cloudflare_image_id text,
  image_url text,
  sort_order integer
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cloudflare_image_id text := nullif(btrim(p_cloudflare_image_id), '');
  v_image_url text := nullif(btrim(p_image_url), '');
  v_sort_order integer := greatest(0, coalesce(p_sort_order, 0));
  v_existing_image public.location_submission_images%rowtype;
  v_current_count integer;
begin
  if p_submission_id is null or p_submission_token is null then
    raise exception 'La postulacion no es valida.';
  end if;

  if v_cloudflare_image_id is null then
    raise exception 'No pudimos validar la imagen subida.';
  end if;

  if v_image_url is null then
    raise exception 'No pudimos guardar la imagen.';
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
    and image.cloudflare_image_id = v_cloudflare_image_id
  for update;

  if found then
    id := v_existing_image.id;
    cloudflare_image_id := v_existing_image.cloudflare_image_id;
    image_url := v_existing_image.image_url;
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
    sort_order
  )
  values (
    p_submission_id,
    p_submission_token,
    v_cloudflare_image_id,
    v_image_url,
    v_sort_order
  )
  returning
    location_submission_images.id,
    location_submission_images.cloudflare_image_id,
    location_submission_images.image_url,
    location_submission_images.sort_order
  into
    id,
    cloudflare_image_id,
    image_url,
    sort_order;

  return next;
end;
$function$;

revoke all on function public.finalize_location_submission_image(
  uuid,
  uuid,
  text,
  text,
  integer
) from public, anon, authenticated;

grant execute on function public.finalize_location_submission_image(
  uuid,
  uuid,
  text,
  text,
  integer
) to service_role;
