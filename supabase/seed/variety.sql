-- Agronomic parameters driving L1. gdd_requirement in degree-days, base_temp_c
-- the crop's base temperature.
--
-- VERIFICATION STATUS is marked per line. Lines marked PROVISIONAL are
-- plausible field values that are NOT yet traced to a citable document.
-- Find them all with:  grep -n PROVISIONAL supabase/seed/variety.sql
--
-- Verified base temperatures come from the FAO56rev base/upper threshold
-- review (Pereira et al., Agricultural Water Management 2025):
--   maize 10 C, rice 12 C, potato 2 C, carrot 6 C.
--
-- gdd_requirement is DERIVED, not cited. It and days_to_harvest_* describe the
-- same quantity — how long the variety takes — and when they were sourced
-- independently they disagreed: rice carried the FAO generic-rice figure of
-- ~2000 dd, which at Subang's 27.8 C lowland mean implies 127 days against
-- Ciherang's published 110-125, so every padi block predicted 'late'. Potato
-- carried 1400 dd, which at the 24.5 C highland cell matures in 62 days
-- against a 90-day minimum, and read 'implausible'.
--
-- So each variety's gdd_requirement is now derived as the degree-days its own
-- published duration accumulates at the temperature that crop is actually
-- farmed at in West Java, read from the live climate normals:
--
--   padi, jagung  ->  Subang lowland   -6.25,107.75   27.8 C annual mean
--   cabai         ->  Subang town      -6.50,107.75   27.7 C
--   kentang,      ->  Jalancagak       -6.75,107.75   24.5 C
--   wortel, beri      (highland shoulder)
--
-- Re-derive and re-check plausibility at any time with:
--   pnpm tsx --env-file=.env scripts/derive-gdd.ts
--
-- This makes the two columns consistent by construction. It does NOT make the
-- durations themselves verified — days_to_harvest_* is still the provisional
-- input, so the derived GDD inherits its status.

insert into variety (commodity_id, name, gdd_requirement, base_temp_c,
                     days_to_harvest_min, days_to_harvest_max,
                     yield_per_ha_min, yield_per_ha_max)

-- padi: base temp VERIFIED (12 C), gdd DERIVED at 27.8 C, yields PROVISIONAL
select id, 'Ciherang',    1860, 12, 110, 125, 5.0, 7.0 from commodity where slug='padi'
union all
select id, 'IR64',        1780, 12, 105, 120, 4.5, 6.5 from commodity where slug='padi'

-- jagung: base temp VERIFIED (10 C), gdd DERIVED at 27.8 C, DTM + yields PROVISIONAL
union all
select id, 'Bisi-18',     1830, 10,  95, 110, 7.0, 9.5 from commodity where slug='jagung'
union all
select id, 'Pioneer P35', 1740, 10,  90, 105, 7.5, 10.0 from commodity where slug='jagung'

-- wortel: base temp VERIFIED (6 C), gdd DERIVED at 24.5 C, DTM + yields PROVISIONAL
union all
select id, 'Lokal Cipanas', 1845, 6,  90, 110, 15.0, 25.0 from commodity where slug='wortel'
union all
select id, 'Nantes',        1755, 6,  85, 105, 18.0, 28.0 from commodity where slug='wortel'

-- cabai: base temp PROVISIONAL (10 C assumed, warm-season), gdd DERIVED at 27.7 C,
-- all else PROVISIONAL
union all
select id, 'Cabai rawit',  1865, 10,  90, 120,  6.0, 10.0 from commodity where slug='cabai'
union all
select id, 'Cabai merah',  1955, 10,  95, 125,  8.0, 12.0 from commodity where slug='cabai'

-- kentang: base temp VERIFIED (2 C), gdd DERIVED at 24.5 C, DTM + yields PROVISIONAL
union all
select id, 'Granola',      2355,  2,  90, 120, 15.0, 25.0 from commodity where slug='kentang'
union all
select id, 'Atlantic',     2245,  2,  85, 115, 18.0, 28.0 from commodity where slug='kentang'

-- beri: gdd DERIVED at 24.5 C, everything else PROVISIONAL
union all
select id, 'Stroberi lokal', 1850, 5, 80, 110, 8.0, 15.0 from commodity where slug='beri'
union all
select id, 'Stroberi Kalifornia', 1945, 5, 85, 115, 10.0, 18.0 from commodity where slug='beri'

-- generik: deliberately mid-range. This is the fallback for any commodity a
-- kader registers that has no varietal data of its own. PROVISIONAL by design.
union all
select id, 'Umum', 1865, 10, 90, 120, 5.0, 10.0 from commodity where slug='generik'
on conflict (commodity_id, name) do update set
  gdd_requirement     = excluded.gdd_requirement,
  base_temp_c         = excluded.base_temp_c,
  days_to_harvest_min = excluded.days_to_harvest_min,
  days_to_harvest_max = excluded.days_to_harvest_max,
  yield_per_ha_min    = excluded.yield_per_ha_min,
  yield_per_ha_max    = excluded.yield_per_ha_max;
