-- Buyer identity on a supply request.
--
-- These two columns are declared in 06_commerce.sql, which is where the table
-- is defined and the only file to read if you want to know its shape. This
-- file exists solely so an EXISTING project picks them up: db:setup applies
-- each schema file whole and reports "already applied" when `create table`
-- raises 42P07, which means an edit inside 06 never reaches a database that
-- already has the table.
--
-- Every statement here is idempotent, so a fresh project runs it as a no-op
-- immediately after 06 created the columns anyway.

alter table supply_contract_request add column if not exists buyer_name         text;
alter table supply_contract_request add column if not exists buyer_organisation text;

-- Requests written before the columns existed have nobody recorded against
-- them. Say so rather than leaving a null the UI has to guess at, so the
-- not-null constraint below can be applied without dropping rows.
update supply_contract_request
   set buyer_name = 'Pembeli tidak tercatat'
 where buyer_name is null;

alter table supply_contract_request alter column buyer_name set not null;
