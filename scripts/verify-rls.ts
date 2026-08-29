/**
 * Proves the RLS policies, not just the shape of the queries.
 *
 *   pnpm demo:rls
 *
 * scripts/verify-commerce.ts uses the service role key, which bypasses row
 * level security altogether -- it would pass even if every policy had been
 * dropped. This script signs in as the real test accounts with the anon key,
 * so each statement is judged by Postgres exactly as a browser session is.
 *
 * Credentials are read at runtime from docs/test-accounts.local.md, which is
 * gitignored, so nothing secret lives in this file.
 */

import { readFileSync } from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types.gen'

const ACCOUNTS_FILE = 'docs/test-accounts.local.md'

const BUYER = 'buyer@terrion.test'
/** Belongs to the demo cooperative, which owns every catalogue listing. */
const DEMO_PENGURUS = 'pengurus-subang@terrion.test'
/** Belongs to the other cooperative -- the cross-tenant control. */
const OTHER_PENGURUS = 'pengurus@terrion.test'
/** Same cooperative as OTHER_PENGURUS, one rung down -- the role control. */
const KADER = 'kader@terrion.test'

// Passwords from the local accounts table, keyed by email because the role
// column is a human label while the email is what actually signs in.
function readAccounts(): Map<string, string> {
  const accounts = new Map<string, string>()
  for (const line of readFileSync(ACCOUNTS_FILE, 'utf8').split('\n')) {
    const cells = line.split('|').map(c => c.trim())
    if (cells.length < 4) continue
    const [, , email, password] = cells
    if (!email.includes('@')) continue
    accounts.set(email, password.replace(/`/g, ''))
  }
  return accounts
}

// A client carrying one user's session, so RLS sees a real auth.uid().
async function signIn(email: string, password: string) {
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data, error } = await db.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw new Error(`sign in failed for ${email}: ${error?.message}`)
  return { db, userId: data.user.id }
}

// PASS/FAIL line, so a wrong answer is visible rather than buried in output.
function check(label: string, actual: unknown, expected: unknown): boolean {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(actual)}` +
    (ok ? '' : ` (expected ${JSON.stringify(expected)})`))
  return ok
}

async function main() {
  const accounts = readAccounts()
  for (const email of [BUYER, DEMO_PENGURUS, OTHER_PENGURUS, KADER]) {
    if (!accounts.has(email)) {
      throw new Error(`${email} is missing from ${ACCOUNTS_FILE}. ` +
        'Run: node --env-file=.env scripts/seed-test-users.mjs')
    }
  }

  const service = createServiceClient()
  const results: boolean[] = []

  // The demo cooperative is the one with listings; the other is the control.
  const { data: coops } = await service.from('cooperative').select('id, name').order('name')
  const demo = coops!.find(c => c.name.includes('Subang Jaya'))!
  const control = coops!.find(c => c.name.includes('Sumber Rejeki'))!
  const { data: commodity } = await service.from('commodity').select('id').limit(1).single()

  const buyerSession = await signIn(BUYER, accounts.get(BUYER)!)
  const demoSession = await signIn(DEMO_PENGURUS, accounts.get(DEMO_PENGURUS)!)
  const otherSession = await signIn(OTHER_PENGURUS, accounts.get(OTHER_PENGURUS)!)
  const kaderSession = await signIn(KADER, accounts.get(KADER)!)

  // Which cooperative each pengurus actually sits on, read past RLS so the
  // report cannot be fooled by a policy hiding the answer.
  const coopOf = async (userId: string) => {
    const { data } = await service.from('app_user')
      .select('cooperative_id').eq('id', userId).single()
    return coops!.find(c => c.id === data?.cooperative_id)?.name ?? 'no cooperative'
  }
  console.log(`\nbuyer            ${BUYER}`)
  console.log(`demo pengurus    ${DEMO_PENGURUS} -> ${await coopOf(demoSession.userId)}`)
  console.log(`control pengurus ${OTHER_PENGURUS} -> ${await coopOf(otherSession.userId)}`)

  // --- buyer_insert: with check (buyer_id = auth.uid()) --------------------
  console.log('\n--- buyer_insert ---')
  const { data: created, error: insertError } = await buyerSession.db
    .from('supply_contract_request').insert({
      cooperative_id: demo.id,
      buyer_id: buyerSession.userId,
      buyer_name: 'verify-rls buyer',
      commodity_id: commodity!.id,
      volume_kg: 1000,
      window_start: '2026-09-07',
      window_end: '2026-09-13',
      notes: 'verify-rls probe',
    }).select('id').single()
  results.push(check('buyer inserts as themselves', insertError === null, true))
  if (!created) throw new Error(`insert blocked: ${insertError?.message}`)

  // Spoofing somebody else's buyer_id must be refused by the policy.
  const { error: spoofError } = await buyerSession.db
    .from('supply_contract_request').insert({
      cooperative_id: demo.id,
      buyer_id: demoSession.userId,
      buyer_name: 'verify-rls spoof probe',
      commodity_id: commodity!.id,
      volume_kg: 1000,
      window_start: '2026-09-07',
      window_end: '2026-09-13',
    })
  results.push(check('buyer cannot insert as someone else', spoofError !== null, true))

  // --- coop_or_buyer_read --------------------------------------------------
  console.log('\n--- coop_or_buyer_read ---')
  const { data: ownRows } = await buyerSession.db
    .from('supply_contract_request').select('id').eq('id', created.id)
  results.push(check('buyer reads their own request', ownRows?.length ?? 0, 1))

  const { data: demoReads } = await demoSession.db
    .from('supply_contract_request').select('id').eq('id', created.id)
  results.push(check(`pengurus of ${demo.name} reads it`, demoReads?.length ?? 0, 1))

  const { data: otherReads } = await otherSession.db
    .from('supply_contract_request').select('id').eq('id', created.id)
  results.push(check(
    `pengurus of ${control.name} cannot read it`, otherReads?.length ?? 0, 0))

  // --- coop_respond --------------------------------------------------------
  console.log('\n--- coop_respond ---')
  const { data: foreignUpdate } = await otherSession.db
    .from('supply_contract_request')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', created.id).select('id')
  results.push(check('a foreign pengurus accepts nothing', foreignUpdate?.length ?? 0, 0))

  const { data: stillPending } = await service.from('supply_contract_request')
    .select('status').eq('id', created.id).single()
  results.push(check('status is still pending', stillPending!.status, 'pending'))

  // The positive case: the cooperative that owns the harvest can answer.
  const { data: ownUpdate } = await demoSession.db
    .from('supply_contract_request')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', created.id).select('id')
  results.push(check(`pengurus of ${demo.name} accepts it`, ownUpdate?.length ?? 0, 1))

  const { data: accepted } = await service.from('supply_contract_request')
    .select('status, responded_at').eq('id', created.id).single()
  results.push(check('status is accepted', accepted!.status, 'accepted'))
  results.push(check('responded_at is set', accepted!.responded_at !== null, true))

  await service.from('supply_contract_request').delete().eq('id', created.id)
  console.log('\n  probe deleted')

  // --- input_order: tenant policy on both the header and its lines ---------
  console.log('\n--- input_order tenant ---')
  const { data: order, error: orderError } = await demoSession.db.from('input_order')
    .insert({ cooperative_id: demo.id, season_label: 'verify-rls probe', status: 'draft' })
    .select('id').single()
  results.push(check('pengurus creates an order for their own cooperative',
    orderError === null, true))

  if (order) {
    const { error: lineError } = await demoSession.db.from('input_order_line').insert({
      input_order_id: order.id, item: 'urea', quantity: 10, unit: 'karung 50 kg',
    })
    results.push(check('and its lines', lineError === null, true))

    const { data: foreignSees } = await otherSession.db
      .from('input_order').select('id').eq('id', order.id)
    results.push(check(
      `pengurus of ${control.name} cannot see it`, foreignSees?.length ?? 0, 0))

    const { data: foreignLines } = await otherSession.db
      .from('input_order_line').select('id').eq('input_order_id', order.id)
    results.push(check('nor its lines', foreignLines?.length ?? 0, 0))

    await service.from('input_order').delete().eq('id', order.id)
    console.log('  probe deleted')
  }

  // Writing an order for somebody else's cooperative must be refused.
  const { error: foreignOrderError } = await otherSession.db.from('input_order')
    .insert({ cooperative_id: demo.id, season_label: 'verify-rls probe', status: 'draft' })
  results.push(check('cannot create an order for another cooperative',
    foreignOrderError !== null, true))

  // --- tenancy: the tables that hold a cooperative's land ------------------
  //
  // Each denial is paired with a positive control. "Zero rows for the other
  // cooperative" is also what a policy that denies everything produces, so
  // without proving each session still sees its own data these checks would
  // pass against a completely broken table.
  console.log('\n--- tenancy: plot, member, block ---')

  const demoPlots = await service.from('plot').select('id').eq('cooperative_id', demo.id)
  const demoPlotIds = (demoPlots.data ?? []).map(p => p.id)
  const demoMembers = await service.from('member').select('id').eq('cooperative_id', demo.id)
  const demoMemberIds = (demoMembers.data ?? []).map(m => m.id)
  const demoBlocks = await service.from('block').select('id').in('plot_id', demoPlotIds)
  const demoBlockIds = (demoBlocks.data ?? []).map(b => b.id)

  console.log(`  ${demo.name} holds ${demoPlotIds.length} plots, ` +
    `${demoMemberIds.length} members, ${demoBlockIds.length} blocks`)

  // Supabase caps a single .in() list, and the demo cooperative has more blocks
  // than is comfortable to inline; a slice is enough to prove the policy.
  const sample = <T,>(ids: T[], n = 50) => ids.slice(0, n)

  for (const [session, name, ownVisible] of [
    [demoSession, demo.name, true],
    [otherSession, control.name, false],
  ] as const) {
    const { data: plots } = await session.db.from('plot')
      .select('id').in('id', sample(demoPlotIds))
    const { data: members } = await session.db.from('member')
      .select('id').in('id', sample(demoMemberIds))
    const { data: blocks } = await session.db.from('block')
      .select('id').in('id', sample(demoBlockIds))

    if (ownVisible) {
      results.push(check(`${name} sees its own plots`, (plots?.length ?? 0) > 0, true))
      results.push(check(`${name} sees its own members`, (members?.length ?? 0) > 0, true))
      results.push(check(`${name} sees its own blocks`, (blocks?.length ?? 0) > 0, true))
    } else {
      results.push(check(`${name} sees none of their plots`, plots?.length ?? 0, 0))
      results.push(check(`${name} sees none of their members`, members?.length ?? 0, 0))
      results.push(check(`${name} sees none of their blocks`, blocks?.length ?? 0, 0))
    }
  }

  // The positive control for the outsider: it must still see its own land, or
  // the three zeroes above prove nothing.
  const { data: ownPlots } = await otherSession.db.from('plot').select('id')
  results.push(check(
    `${control.name} still sees its own plots`, (ownPlots?.length ?? 0) > 0, true))

  // H2 step 3: opening another cooperative's plot URL directly. The page reads
  // exactly this query and calls notFound() on an empty result.
  const { data: directHit } = await otherSession.db.from('plot')
    .select('id, name').eq('id', demoPlotIds[0]).maybeSingle()
  results.push(check('a foreign plot URL resolves to nothing', directHit, null))

  // --- role separation ------------------------------------------------------
  //
  // Tenancy is not authority. The anon key ships in the browser bundle, so a
  // signed-in kader can call PostgREST directly with their own token; if the
  // policies only scoped by cooperative, every requireRole(['pengurus']) guard
  // in app/actions would be advisory. Each denial below is paired with the
  // write that must still succeed, because a policy that denies everything
  // produces the same zeroes as one that works.
  console.log('\n--- role separation ---')

  const kaderOrder = await kaderSession.db.from('input_order')
    .insert({ cooperative_id: control.id, season_label: 'RLS PROBE', status: 'draft' })
    .select('id')
  results.push(check('a kader cannot commit the cooperative to an order',
    (kaderOrder.data?.length ?? 0) === 0, true))
  if (kaderOrder.data?.[0]) {
    await service.from('input_order').delete().eq('id', kaderOrder.data[0].id)
  }

  const kaderCoop = await kaderSession.db.from('cooperative')
    .update({ name: control.name }).eq('id', control.id).select('id')
  results.push(check('a kader cannot rewrite the cooperative row',
    (kaderCoop.data?.length ?? 0) === 0, true))

  // Positive control: the kader's own job must still work.
  const kaderMember = await kaderSession.db.from('member')
    .insert({ cooperative_id: control.id, name: 'RLS PROBE anggota' }).select('id')
  results.push(check('a kader can still register a member',
    (kaderMember.data?.length ?? 0) > 0, true))
  if (kaderMember.data?.[0]) {
    await service.from('member').delete().eq('id', kaderMember.data[0].id)
  }

  // Positive control: the role that IS allowed must still get through, or the
  // two denials above would also pass with the table simply locked.
  const pengurusOrder = await otherSession.db.from('input_order')
    .insert({ cooperative_id: control.id, season_label: 'RLS PROBE', status: 'draft' })
    .select('id')
  results.push(check('a pengurus can still commit the cooperative to an order',
    (pengurusOrder.data?.length ?? 0) > 0, true))
  if (pengurusOrder.data?.[0]) {
    await service.from('input_order').delete().eq('id', pengurusOrder.data[0].id)
  }

  // --- who can actually answer this request? -------------------------------
  const { count: demoStaff } = await service.from('app_user')
    .select('id', { count: 'exact', head: true })
    .eq('cooperative_id', demo.id).eq('role', 'pengurus')
  console.log('\n--- reachability ---')
  console.log(`  pengurus accounts at ${demo.name}: ${demoStaff ?? 0}`)
  results.push(check(
    'the cooperative owning every listing has someone who can answer',
    (demoStaff ?? 0) > 0, true))

  const passed = results.filter(Boolean).length
  console.log(`\n${passed}/${results.length} policy checks passed`)
  if (passed !== results.length) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
