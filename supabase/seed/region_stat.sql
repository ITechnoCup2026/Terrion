-- Atlas base layer. Without this the map is empty and reads as broken.
--
-- WHAT IS REAL HERE: the 38 province codes and names are the actual BPS
-- codes, so the TopoJSON join is correct and the map draws properly.
--
-- WHAT IS NOT REAL: every production_tonnes and harvested_area_ha figure is
-- SYNTHETIC. It is shaped to match two published facts -- national padi
-- production and Java's share of it -- but no individual province figure is
-- BPS data, and every row says so in its `source` column.
--
--   Real anchors used for the shape only:
--     national rice production 2024 = 30.62 million tonnes (BPS)
--     Java = 54.19% of national padi production, led by Jawa Timur,
--     Jawa Tengah, Jawa Barat, then Sulawesi Selatan and Sumatera Selatan
--
-- Replace before submission:
--   select distinct source from region_stat;
--   -- every row should cite a BPS table, not 'SINTETIS'
--
-- Source of truth to replace it with:
--   https://www.bps.go.id/id/statistics-table/2/MTQ5OCMy/luas-panen-produksi-dan-produktivitas-padi-menurut-provinsi.html

with province(code, nama, weight) as (values
  ('11','Aceh',                      0.0300),
  ('12','Sumatera Utara',            0.0400),
  ('13','Sumatera Barat',            0.0250),
  ('14','Riau',                      0.0040),
  ('15','Jambi',                     0.0100),
  ('16','Sumatera Selatan',          0.0500),
  ('17','Bengkulu',                  0.0090),
  ('18','Lampung',                   0.0450),
  ('19','Kepulauan Bangka Belitung', 0.0010),
  ('21','Kepulauan Riau',            0.0005),
  ('31','DKI Jakarta',               0.0002),
  ('32','Jawa Barat',                0.1500),
  ('33','Jawa Tengah',               0.1700),
  ('34','DI Yogyakarta',             0.0090),
  ('35','Jawa Timur',                0.1800),
  ('36','Banten',                    0.0330),
  ('51','Bali',                      0.0120),
  ('52','Nusa Tenggara Barat',       0.0230),
  ('53','Nusa Tenggara Timur',       0.0140),
  ('61','Kalimantan Barat',          0.0170),
  ('62','Kalimantan Tengah',         0.0090),
  ('63','Kalimantan Selatan',        0.0220),
  ('64','Kalimantan Timur',          0.0030),
  ('65','Kalimantan Utara',          0.0015),
  ('71','Sulawesi Utara',            0.0090),
  ('72','Sulawesi Tengah',           0.0130),
  ('73','Sulawesi Selatan',          0.0900),
  ('74','Sulawesi Tenggara',         0.0110),
  ('75','Gorontalo',                 0.0060),
  ('76','Sulawesi Barat',            0.0060),
  ('81','Maluku',                    0.0020),
  ('82','Maluku Utara',              0.0015),
  ('91','Papua Barat',               0.0010),
  ('92','Papua Barat Daya',          0.0008),
  ('93','Papua',                     0.0020),
  ('94','Papua Selatan',             0.0030),
  ('95','Papua Tengah',              0.0005),
  ('96','Papua Pegunungan',          0.0005)
),
-- national totals per commodity, in tonnes. padi is the published 2024
-- figure; the rest are order-of-magnitude placeholders.
national(slug, tonnes, yield_t_ha) as (values
  ('padi',    30620000.0, 5.2),
  ('jagung',  16000000.0, 5.5),
  ('cabai',    2900000.0, 9.0),
  ('kentang',  1300000.0, 18.0),
  ('wortel',    700000.0, 20.0),
  ('beri',       25000.0, 12.0)
)
insert into region_stat (region_code, region_name, level, commodity_id, year,
                         production_tonnes, harvested_area_ha, source)
select p.code,
       p.nama,
       'province'::region_level,
       c.id,
       2024,
       round((n.tonnes * p.weight)::numeric, 2),
       round((n.tonnes * p.weight / n.yield_t_ha)::numeric, 2),
       'SINTETIS — kode provinsi BPS asli, angka produksi belum diganti data BPS'
from province p
cross join national n
join commodity c on c.slug = n.slug
on conflict (region_code, commodity_id, year) do update
  set production_tonnes = excluded.production_tonnes,
      harvested_area_ha = excluded.harvested_area_ha,
      source            = excluded.source;
