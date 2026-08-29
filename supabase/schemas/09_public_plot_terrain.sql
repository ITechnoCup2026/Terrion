-- The decorative terrain seed, exposed to the public plot page.
--
-- public_plot is the honest boundary for /garden: it has no lat, no lng and no
-- nik_hash, so the page cannot leak a location by accident. terrain_seed is
-- safe to add because it carries no geography at all -- it selects which
-- hand-composed edge motifs frame the diagram, and the scenery is captioned as
-- illustration on the canvas itself.
--
-- Without it the public page would have to invent its own seed, and a farmer
-- showing the page to family would see a different landscape from the one the
-- kader sees on the same plot.
--
-- Declared here rather than edited into 07_rls.sql because db:setup applies
-- each file whole and reports "already applied" once the view exists.
--
-- terrain_seed is LAST in the select list on purpose. `create or replace view`
-- can append a trailing column but cannot renumber existing ones; inserting it
-- mid-list raises 42P16, which db-setup.ts counts as "already applied" and
-- reports as success. The first version of this file failed exactly that way.

create or replace view public_plot as
  select p.public_id, p.name, p.area_ha, p.tile_size_m2,
         m.name as member_name, c.village, c.district, p.terrain_seed
  from plot p
  join member m on m.id = p.member_id
  join cooperative c on c.id = p.cooperative_id;

grant select on public_plot to anon, authenticated;
