-- Weekly farm-gate reference prices, used by impact figure 1 (effective price
-- received per kg, against a local reference).
--
-- EVERY ROW IS SYNTHETIC. The base prices are plausible Indonesian farm-gate
-- levels and the weekly variation is deterministic, not random -- so the demo
-- reproduces exactly -- but none of it is Badan Pangan Nasional or BPS data.
-- Every row says so in its `source` column.
--
-- Replace before submission:
--   select distinct source from reference_price;
--
-- Source of truth to replace it with:
--   Badan Pangan Nasional panel harga  https://panelharga.badanpangan.go.id
--
-- 156 weeks ending on the most recent Monday, for Jawa Barat -- the demo
-- province, since the generated cooperative sits in Kabupaten Subang.
--
-- Three years, not the 52 weeks originally seeded. Impact figure 1 compares a
-- block's actual price against the reference for the week it was SOLD in, and
-- the generator lays down two prior seasons so L2 has something to calibrate
-- against -- harvests reach ~112 weeks back. With 52 weeks the reference
-- window and the harvest history did not overlap at all, so every block was
-- dropped for want of a comparison and the figure read "no data" forever.

with base(slug, price, amplitude) as (values
  ('padi',     6500.0,  400.0),
  ('jagung',   4800.0,  350.0),
  ('cabai',   45000.0, 18000.0),
  ('kentang', 12000.0,  2500.0),
  ('wortel',   8000.0,  1800.0),
  ('beri',    35000.0,  6000.0)
),
weeks(week_start) as (
  select (date_trunc('week', current_date) - (n || ' weeks')::interval)::date
  from generate_series(0, 155) as n
)
insert into reference_price (commodity_id, province, week_start, price_per_kg, source)
select c.id,
       'Jawa Barat',
       w.week_start,
       round((b.price + b.amplitude *
              sin(2 * pi() * extract(doy from w.week_start) / 365.0))::numeric, 2),
       'SINTETIS — ganti dengan panel harga Badan Pangan Nasional'
from base b
join commodity c on c.slug = b.slug
cross join weeks w
on conflict (commodity_id, province, week_start) do update
  set price_per_kg = excluded.price_per_kg,
      source       = excluded.source;
