alter table public.locations
  add column approx_radius integer not null default 700,
  add constraint locations_approx_lat_range_check
    check (approx_lat is null or (approx_lat >= -90 and approx_lat <= 90)),
  add constraint locations_approx_lng_range_check
    check (approx_lng is null or (approx_lng >= -180 and approx_lng <= 180)),
  add constraint locations_approx_radius_positive_check
    check (approx_radius > 0),
  add constraint locations_approx_coordinates_pair_check
    check (
      (approx_lat is null and approx_lng is null)
      or (approx_lat is not null and approx_lng is not null)
    );
