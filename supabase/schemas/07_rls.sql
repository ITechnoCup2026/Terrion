-- The caller's cooperative, as a stable function.
-- security definer is what stops the policies on app_user recursing into app_user.
create or replace function current_cooperative_id() returns uuid
language sql stable security definer set search_path = public as $$
  select cooperative_id from app_user where id = auth.uid()
$$;

-- The caller's role, by the same security definer trick and for the same
-- reason: a policy that read app_user directly would recurse into app_user's
-- own policy.
create or replace function current_user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from app_user where id = auth.uid()
$$;

alter table cooperative             enable row level security;
alter table app_user                enable row level security;
alter table member                  enable row level security;
alter table plot                    enable row level security;
alter table block                   enable row level security;
alter table cooperative_capacity    enable row level security;
alter table calibration             enable row level security;
alter table input_order             enable row level security;
alter table input_order_line        enable row level security;
alter table supply_contract_request enable row level security;

-- reference + weather: public read, no public write
alter table commodity       enable row level security;
alter table variety         enable row level security;
alter table fertiliser_rate enable row level security;
alter table reference_price enable row level security;
alter table region_stat     enable row level security;
alter table weather_daily   enable row level security;
alter table weather_normals enable row level security;

create policy ref_read on commodity       for select using (true);
create policy ref_read on variety         for select using (true);
create policy ref_read on fertiliser_rate for select using (true);
create policy ref_read on reference_price for select using (true);
create policy ref_read on region_stat     for select using (true);
create policy ref_read on weather_daily   for select using (true);
create policy ref_read on weather_normals for select using (true);

-- cooperative: public read (the Atlas needs it), owner write
create policy coop_read  on cooperative for select using (true);
create policy coop_write on cooperative for update
  using (id = current_cooperative_id() and current_user_role() = 'pengurus');

create policy self_read on app_user for select using (id = auth.uid());

-- tenant-scoped.
--
-- Each table gets two policies rather than one `for all`, because tenancy and
-- authority are different questions. Anyone in the cooperative may READ its
-- rows; only the role the application already requires may write them.
--
-- The split matters because the anon key is public by design -- it ships in the
-- browser bundle -- so a signed-in kader can call PostgREST directly with their
-- own token. With a single `for all` policy, every requireRole(['pengurus'])
-- guard in app/actions was advisory: the database would happily accept the
-- write that the Server Action refused. Permissive policies OR together, so the
-- read policy keeps SELECT open to the whole cooperative while only the write
-- policy governs INSERT, UPDATE and DELETE.
create policy tenant_read on member for select
  using (cooperative_id = current_cooperative_id());
create policy tenant_write on member for all
  using (cooperative_id = current_cooperative_id() and current_user_role() in ('kader', 'pengurus'))
  with check (cooperative_id = current_cooperative_id() and current_user_role() in ('kader', 'pengurus'));

-- A kader registers land in the field; that is the whole point of the role.
create policy tenant_read on plot for select
  using (cooperative_id = current_cooperative_id());
create policy tenant_write on plot for all
  using (cooperative_id = current_cooperative_id() and current_user_role() in ('kader', 'pengurus'))
  with check (cooperative_id = current_cooperative_id() and current_user_role() in ('kader', 'pengurus'));

create policy tenant_read on block for select
  using (exists (select 1 from plot p
                 where p.id = block.plot_id
                   and p.cooperative_id = current_cooperative_id()));
create policy tenant_write on block for all
  using (current_user_role() in ('kader', 'pengurus')
         and exists (select 1 from plot p
                     where p.id = block.plot_id
                       and p.cooperative_id = current_cooperative_id()))
  with check (current_user_role() in ('kader', 'pengurus')
         and exists (select 1 from plot p
                     where p.id = block.plot_id
                       and p.cooperative_id = current_cooperative_id()));

-- Stated capacity is a board decision, not a field observation.
create policy tenant_read on cooperative_capacity for select
  using (cooperative_id = current_cooperative_id());
create policy tenant_write on cooperative_capacity for all
  using (cooperative_id = current_cooperative_id() and current_user_role() = 'pengurus')
  with check (cooperative_id = current_cooperative_id() and current_user_role() = 'pengurus');

-- Read-only to every signed-in user. Calibration is fitted by the L2 job under
-- the service role, which bypasses RLS; nothing in the app writes it, so no
-- write policy exists to be abused.
create policy tenant_read on calibration for select
  using (cooperative_id = current_cooperative_id());

-- Committing the cooperative to an order is a pengurus act -- this is the rule
-- createInputOrder states, now enforced where it cannot be bypassed.
create policy tenant_read on input_order for select
  using (cooperative_id = current_cooperative_id());
create policy tenant_write on input_order for all
  using (cooperative_id = current_cooperative_id() and current_user_role() = 'pengurus')
  with check (cooperative_id = current_cooperative_id() and current_user_role() = 'pengurus');

create policy tenant_read on input_order_line for select
  using (exists (select 1 from input_order o
                 where o.id = input_order_line.input_order_id
                   and o.cooperative_id = current_cooperative_id()));
create policy tenant_write on input_order_line for all
  using (current_user_role() = 'pengurus'
         and exists (select 1 from input_order o
                     where o.id = input_order_line.input_order_id
                       and o.cooperative_id = current_cooperative_id()))
  with check (current_user_role() = 'pengurus'
         and exists (select 1 from input_order o
                     where o.id = input_order_line.input_order_id
                       and o.cooperative_id = current_cooperative_id()));

-- commerce: readable by the cooperative or the buyer
create policy coop_or_buyer_read on supply_contract_request for select
  using (cooperative_id = current_cooperative_id() or buyer_id = auth.uid());
create policy buyer_insert on supply_contract_request for insert
  with check (buyer_id = auth.uid());
-- Accepting or declining binds the cooperative to a buyer, so it is a pengurus
-- act. respondToRequest says so; without the role test here, saying so was all
-- it did.
create policy coop_respond on supply_contract_request for update
  using (cooperative_id = current_cooperative_id() and current_user_role() = 'pengurus');

-- The public farmer page reads this view, not `plot`.
-- lat, lng and nik_hash are absent by construction, which is stronger than a
-- column-list policy: there is no column to leak.
create view public_plot as
  select p.public_id, p.name, p.area_ha, p.tile_size_m2,
         m.name as member_name, c.village, c.district, p.terrain_seed
  from plot p
  join member m on m.id = p.member_id
  join cooperative c on c.id = p.cooperative_id;

grant select on public_plot to anon, authenticated;
