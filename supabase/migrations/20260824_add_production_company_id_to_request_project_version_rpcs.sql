create or replace function public.finalize_request_project_submission_versioned(
  p_request_project_id uuid,
  p_title text,
  p_production_company text,
  p_production_company_id uuid,
  p_message text,
  p_tentative_start_date date,
  p_tentative_end_date date,
  p_snapshot_payload jsonb,
  p_official_pdf_bucket text,
  p_official_pdf_path text,
  p_official_pdf_file_name text,
  p_official_pdf_generated_at timestamp with time zone,
  p_official_pdf_uploaded_at timestamp with time zone,
  p_official_pdf_size_bytes bigint
)
returns table(
  id uuid,
  status text,
  latest_version_number integer,
  official_pdf_bucket text,
  official_pdf_path text,
  official_pdf_file_name text,
  official_pdf_generated_at timestamp with time zone,
  official_pdf_uploaded_at timestamp with time zone,
  official_pdf_size_bytes bigint,
  has_unsubmitted_changes boolean
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_project public.request_projects%rowtype;
  v_existing_max_version integer;
  v_next_version integer;
begin
  select rp.*
  into v_project
  from public.request_projects as rp
  where rp.id = p_request_project_id
    and (
      rp.user_id = auth.uid()
      or exists (
        select 1
        from public.profiles as profile
        where profile.user_id = auth.uid()
          and profile.role = 'admin'
          and profile.status = 'active'
      )
    )
  for update;

  if not found then
    raise exception 'not found';
  end if;

  if v_project.status not in ('draft', 'pending') then
    raise exception 'La solicitud no se puede enviar en su estado actual.';
  end if;

  select coalesce(max(rpv.version_number), 0)::integer
  into v_existing_max_version
  from public.request_project_versions as rpv
  where rpv.request_project_id = p_request_project_id;

  v_next_version := v_existing_max_version + 1;

  insert into public.request_project_versions (
    request_project_id,
    version_number,
    status,
    title,
    production_company,
    production_company_id,
    message,
    tentative_start_date,
    tentative_end_date,
    snapshot_payload,
    official_pdf_bucket,
    official_pdf_path,
    official_pdf_file_name,
    official_pdf_generated_at,
    official_pdf_uploaded_at,
    official_pdf_size_bytes,
    created_by
  )
  values (
    p_request_project_id,
    v_next_version,
    'submitted',
    coalesce(nullif(trim(p_title), ''), 'Solicitud sin titulo'),
    nullif(trim(p_production_company), ''),
    p_production_company_id,
    nullif(trim(p_message), ''),
    p_tentative_start_date,
    p_tentative_end_date,
    p_snapshot_payload,
    nullif(trim(p_official_pdf_bucket), ''),
    nullif(trim(p_official_pdf_path), ''),
    nullif(trim(p_official_pdf_file_name), ''),
    p_official_pdf_generated_at,
    p_official_pdf_uploaded_at,
    p_official_pdf_size_bytes,
    auth.uid()
  );

  update public.request_projects as rp
  set
    title = coalesce(nullif(trim(p_title), ''), rp.title),
    production_company = nullif(trim(p_production_company), ''),
    production_company_id = p_production_company_id,
    message = nullif(trim(p_message), ''),
    tentative_start_date = p_tentative_start_date,
    tentative_end_date = p_tentative_end_date,
    status = 'pending',
    official_pdf_bucket = nullif(trim(p_official_pdf_bucket), ''),
    official_pdf_path = nullif(trim(p_official_pdf_path), ''),
    official_pdf_file_name = nullif(trim(p_official_pdf_file_name), ''),
    official_pdf_generated_at = p_official_pdf_generated_at,
    official_pdf_uploaded_at = p_official_pdf_uploaded_at,
    official_pdf_size_bytes = p_official_pdf_size_bytes,
    latest_version_number = v_next_version,
    has_unsubmitted_changes = false,
    updated_at = timezone('utc', now())
  where rp.id = p_request_project_id;

  return query
  select
    rp.id,
    rp.status,
    rp.latest_version_number,
    rp.official_pdf_bucket,
    rp.official_pdf_path,
    rp.official_pdf_file_name,
    rp.official_pdf_generated_at,
    rp.official_pdf_uploaded_at,
    rp.official_pdf_size_bytes::bigint,
    rp.has_unsubmitted_changes
  from public.request_projects as rp
  where rp.id = p_request_project_id;
end;
$function$;

create or replace function public.ensure_request_project_initial_version(
  p_request_project_id uuid,
  p_status text,
  p_title text,
  p_production_company text,
  p_production_company_id uuid,
  p_message text,
  p_tentative_start_date date,
  p_tentative_end_date date,
  p_snapshot_payload jsonb,
  p_official_pdf_bucket text,
  p_official_pdf_path text,
  p_official_pdf_file_name text,
  p_official_pdf_generated_at timestamp with time zone,
  p_official_pdf_uploaded_at timestamp with time zone,
  p_official_pdf_size_bytes bigint
)
returns table(
  created boolean,
  version_id uuid,
  version_number integer
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_project public.request_projects%rowtype;
  v_existing_count integer;
  v_existing_max_version integer;
  v_new_version_id uuid;
  v_version_status text;
begin
  select *
  into v_project
  from public.request_projects
  where id = p_request_project_id
    and (
      user_id = auth.uid()
      or exists (
        select 1
        from public.profiles profile
        where profile.user_id = auth.uid()
          and profile.role = 'admin'
          and profile.status = 'active'
      )
    )
  for update;

  if not found then
    raise exception 'not found';
  end if;

  if p_status not in (
    'draft',
    'pending',
    'confirmed',
    'discarded'
  ) then
    raise exception 'invalid status';
  end if;

  v_version_status :=
    case
      when p_status = 'draft' then 'draft'
      else 'submitted'
    end;

  select
    count(*)::integer,
    coalesce(max(version_number), 0)::integer
  into v_existing_count, v_existing_max_version
  from public.request_project_versions
  where request_project_id = p_request_project_id;

  if v_existing_count > 0 then
    update public.request_projects
    set latest_version_number = greatest(
      coalesce(latest_version_number, 0),
      v_existing_max_version
    )
    where id = p_request_project_id;

    return query
    select false, null::uuid, v_existing_max_version;

    return;
  end if;

  insert into public.request_project_versions (
    request_project_id,
    version_number,
    status,
    title,
    production_company,
    production_company_id,
    message,
    tentative_start_date,
    tentative_end_date,
    snapshot_payload,
    official_pdf_bucket,
    official_pdf_path,
    official_pdf_file_name,
    official_pdf_generated_at,
    official_pdf_uploaded_at,
    official_pdf_size_bytes,
    created_by
  )
  values (
    p_request_project_id,
    1,
    v_version_status,
    coalesce(nullif(trim(p_title), ''), 'Solicitud sin titulo'),
    nullif(trim(p_production_company), ''),
    p_production_company_id,
    nullif(trim(p_message), ''),
    p_tentative_start_date,
    p_tentative_end_date,
    p_snapshot_payload,
    nullif(trim(p_official_pdf_bucket), ''),
    nullif(trim(p_official_pdf_path), ''),
    nullif(trim(p_official_pdf_file_name), ''),
    p_official_pdf_generated_at,
    p_official_pdf_uploaded_at,
    p_official_pdf_size_bytes,
    auth.uid()
  )
  returning id into v_new_version_id;

  update public.request_projects
  set latest_version_number = 1
  where id = p_request_project_id;

  return query
  select true, v_new_version_id, 1;
end;
$function$;

notify pgrst, 'reload schema';
