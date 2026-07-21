alter table public.locations
  add column public_lat double precision,
  add column public_lng double precision,
  add column public_radius integer not null default 700,
  add constraint locations_public_lat_range_check
    check (public_lat is null or (public_lat >= -90 and public_lat <= 90)),
  add constraint locations_public_lng_range_check
    check (public_lng is null or (public_lng >= -180 and public_lng <= 180)),
  add constraint locations_public_radius_positive_check
    check (public_radius > 0),
  add constraint locations_public_coordinates_pair_check
    check (
      (public_lat is null and public_lng is null)
      or (public_lat is not null and public_lng is not null)
    );
