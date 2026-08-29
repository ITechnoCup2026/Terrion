/**
 * Registers an account. Run by an operator, never by the person signing up.
 *
 *   pnpm register
 *
 * Terrion has no signup form on purpose. A cooperative is a legal entity with a
 * Kemenkop registration and real members, and no form can tell a real one from a
 * name typed into a box. Verification happens offline — a phone call, a
 * penyuluh, a copy of the badan hukum certificate — and this script is what
 * turns that offline check into an account.
 *
 * That is also why the security model holds: `app_user` has a self_read policy
 * and no insert or update policy at all, so nobody can create or promote their
 * own account through the API. Only the service key can, and only from here.
 *
 * Three kinds of account:
 *
 *   pengurus  runs a cooperative — commits it to orders, answers buyers
 *   kader     registers land for a cooperative, cannot commit it
 *   buyer     browses the catalogue, belongs to no cooperative
 *
 * A password is generated unless one is given, and printed once. Record it in
 * docs/test-accounts.local.md, which is gitignored.
 */

import { randomBytes } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types.gen'
import { ask, askChoice, askHidden, confirm } from './lib/prompt'

type Role = 'pengurus' | 'kader' | 'buyer'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const db = createClient<Database>(url, serviceKey, { auth: { persistSession: false } })

// Long enough that a leaked list is not worth grinding, short enough to read
// aloud over a phone once.
const generatePassword = () => `terrion-${randomBytes(6).toString('hex')}`

// Rejects the obvious typo before it becomes an account nobody can sign into.
function assertEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`"${email}" does not look like an email address.`)
  }
}

/** The cooperative this account will belong to: an existing one, or a new one. */
async function resolveCooperative(role: Exclude<Role, 'buyer'>): Promise<string> {
  const { data: coops, error } = await db
    .from('cooperative').select('id, name, village, district').order('name')
  if (error) throw new Error(`Could not list cooperatives: ${error.message}`)

  if (coops.length > 0) {
    console.log('\nCooperatives already registered:')
    coops.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} — ${c.village}, ${c.district}`))
  } else {
    console.log('\nNo cooperatives registered yet.')
  }

  const answer = await ask(
    coops.length > 0
      ? `\nPick a number, or type "new" to register a cooperative: `
      : `\nType "new" to register the first cooperative: `,
  )

  if (answer.toLowerCase() !== 'new') {
    const index = Number(answer) - 1
    const chosen = coops[index]
    if (!chosen) throw new Error(`"${answer}" is not one of the listed cooperatives.`)
    return chosen.id
  }

  // A kader works for a cooperative that already exists; the person who brings
  // a cooperative onto Terrion is its pengurus. Letting a kader create one would
  // mean the cooperative's first account cannot commit it to anything.
  if (role === 'kader') {
    throw new Error('A kader joins an existing cooperative. Register its pengurus first.')
  }

  console.log('\nRegistering a new cooperative.')
  const name = await ask('  Name (e.g. Koperasi Tani Sumber Rejeki): ')
  if (name.length < 3) throw new Error('The cooperative needs a name.')

  const { data: clash } = await db
    .from('cooperative').select('id').eq('name', name).maybeSingle()
  if (clash) throw new Error(`A cooperative named "${name}" is already registered.`)

  const village = await ask('  Village: ')
  const district = await ask('  District (e.g. Kabupaten Subang): ')
  const province = await ask('  Province: ')

  // The cooperative's own coordinates, used to snap it to a weather grid cell.
  // Not a plot location and never shown publicly at plot precision.
  const lat = Number(await ask('  Latitude  (e.g. -6.2833): '))
  const lng = Number(await ask('  Longitude (e.g. 107.8167): '))
  if (!Number.isFinite(lat) || lat < -11 || lat > 6) {
    throw new Error(`Latitude ${lat} is outside Indonesia.`)
  }
  if (!Number.isFinite(lng) || lng < 95 || lng > 141) {
    throw new Error(`Longitude ${lng} is outside Indonesia.`)
  }
  if (!village || !district || !province) {
    throw new Error('Village, district and province are all required.')
  }

  console.log(`\n  ${name}`)
  console.log(`  ${village}, ${district}, ${province}  (${lat}, ${lng})`)
  console.log('\n  Registering a cooperative asserts that it exists and that you have')
  console.log('  verified it. Nothing downstream re-checks this.')
  if (!await confirm('  Create it?')) throw new Error('Cancelled.')

  const { data: created, error: insertError } = await db
    .from('cooperative')
    .insert({ name, village, district, province, lat, lng })
    .select('id').single()
  if (insertError) throw new Error(`Could not create the cooperative: ${insertError.message}`)

  console.log(`  Created "${name}".`)
  return created.id
}

/** The auth user for this email, created if it does not exist yet. */
async function ensureAuthUser(
  email: string, chosenPassword: string,
): Promise<{ id: string; password: string | null }> {
  // listUsers pages, and a project with more than one page of users would
  // otherwise silently miss an existing account and fail on the insert.
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`Could not read the user list: ${error.message}`)
    const existing = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (existing) return { id: existing.id, password: null }
    if (data.users.length < 200) break
  }

  const { data, error } = await db.auth.admin.createUser({
    email, password: chosenPassword, email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(`Could not create the account: ${error?.message ?? 'unknown error'}`)
  }
  return { id: data.user.id, password: chosenPassword }
}

async function main() {
  console.log('Register a Terrion account.')
  console.log('Verification of the cooperative happens offline; this records the result.\n')

  const role = await askChoice('Role', ['pengurus', 'kader', 'buyer'] as const)

  const email = (await ask('Email: ')).toLowerCase()
  assertEmail(email)

  const fullName = await ask('Full name (e.g. Pak Slamet Riyadi): ')
  if (fullName.length < 2) throw new Error('A full name is required.')

  // A buyer has no cooperative by construction — the buyer_has_no_coop check
  // constraint in the schema enforces exactly this.
  const organisation = role === 'buyer'
    ? await ask('Organisation (e.g. PT Pangan Nusantara): ')
    : null
  const cooperativeId = role === 'buyer' ? null : await resolveCooperative(role)

  const typed = await askHidden('\nPassword (blank to generate one): ')
  if (typed && typed.length < 8) throw new Error('A typed password must be at least 8 characters.')
  const password = typed || generatePassword()

  const user = await ensureAuthUser(email, password)
  if (!user.password) console.log(`\n${email} already had an account — reusing it.`)

  // Upsert rather than insert: re-running this to fix a role or move somebody
  // between cooperatives should work, not collide on the primary key.
  const { error: profileError } = await db.from('app_user').upsert({
    id: user.id,
    role,
    cooperative_id: cooperativeId,
    full_name: fullName,
    organisation,
  })
  if (profileError) throw new Error(`Could not save the profile: ${profileError.message}`)

  const { data: coop } = cooperativeId
    ? await db.from('cooperative').select('name').eq('id', cooperativeId).maybeSingle()
    : { data: null }

  console.log('\n--- registered ---')
  console.log(`  ${fullName}`)
  console.log(`  ${email}  (${role})`)
  console.log(`  ${coop?.name ?? organisation ?? 'no cooperative'}`)
  if (user.password) {
    console.log(`  password: ${user.password}`)
    console.log('\nThis password is shown once. Record it in docs/test-accounts.local.md')
    console.log('(gitignored) and pass it to its owner over something private.')
  } else {
    console.log('\nThe existing password is unchanged.')
  }
  if (role !== 'buyer') {
    console.log('\nThey can sign in now. The cooperative starts empty — register land')
    console.log('through the app, or fill it with a season using: pnpm seed')
  }
}

main().catch(e => {
  console.error(`\n${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
