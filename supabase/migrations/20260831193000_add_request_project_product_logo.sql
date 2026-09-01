alter table public.request_projects
  add column if not exists product_logo_url text;
