-- sprite_row indexes public/sprites/crops.png (5 stages x 6 rows).
-- Row 0 is padi, which doubles as the generic fallback: green growing,
-- golden ripe, stubble is the universal crop silhouette, so any commodity
-- without bespoke art still renders correctly.

insert into commodity (slug, name, sprite_row) values
  ('generik',  'Komoditas lain', 0),
  ('padi',     'Padi',           0),
  ('jagung',   'Jagung',         1),
  ('wortel',   'Wortel',         2),
  ('cabai',    'Cabai',          3),
  ('kentang',  'Kentang',        4),
  ('beri',     'Beri',           5)
on conflict (slug) do update
  set name = excluded.name, sprite_row = excluded.sprite_row;
