/**
 * Fills the signed-in user's cooperative with a season of data.
 *
 *   pnpm seed            fill the cooperative with a season of data
 *   pnpm seed --clear    empty it again, so the empty states can be seen
 *
 * Prompts for the email and password of a cooperative account, signs in with
 * the ANON key so the credentials are actually verified by Supabase rather than
 * trusted, reads which cooperative that account belongs to, and hands that id
 * to the generator.
 *
 * The point of the prompt is that this runs AFTER a first sign-in, so the empty
 * state can be seen before any data exists. Nothing here is wired into the app:
 * there is no seeding endpoint, and the only way to run it is from a terminal
 * by somebody who already knows a working password.
 *
 * The cooperative row and its accounts are left alone — only members, plots and
 * blocks are cleared and rebuilt — because deleting the cooperative would
 * cascade away the app_user row of the person who just signed in.
 */

import { spawn } from 'node:child_process'

import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types.gen'
import { askCredentials } from './lib/prompt'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env')
  }

  const clearOnly = process.argv.includes('--clear')

  console.log(clearOnly
    ? 'Empty a cooperative, so its empty states can be seen.'
    : 'Fill a cooperative with a season of demo data.')
  console.log('Sign in as an account that belongs to the cooperative you want to change.\n')

  const { email, password } = await askCredentials()

  if (!email || !password) throw new Error('Email and password are both required.')

  // The anon key, not the service key: this must fail for a wrong password the
  // same way the login form does.
  const db = createClient<Database>(url, anonKey)
  const { data: auth, error: signInError } = await db.auth.signInWithPassword({ email, password })
  if (signInError || !auth.user) {
    throw new Error(`Sign in failed: ${signInError?.message ?? 'unknown error'}`)
  }

  const { data: profile, error: profileError } = await db
    .from('app_user').select('role, cooperative_id, full_name').eq('id', auth.user.id).maybeSingle()
  if (profileError) throw new Error(`Could not read the profile: ${profileError.message}`)
  if (!profile) {
    throw new Error('That account has no app_user profile yet. Run scripts/seed-test-users.mjs first.')
  }
  if (!profile.cooperative_id) {
    throw new Error(`${email} is a ${profile.role} with no cooperative — there is nothing to fill. `
      + 'Sign in as a kader or pengurus instead.')
  }

  const { data: coop } = await db
    .from('cooperative').select('name').eq('id', profile.cooperative_id).maybeSingle()

  const coopName = coop?.name ?? profile.cooperative_id
  console.log(`\nSigned in as ${profile.full_name} (${profile.role}).`)

  if (clearOnly) {
    // Members cascade to plots and plots to blocks. The cooperative row and the
    // accounts on it are untouched, so the person who just signed in can still
    // sign in afterwards.
    console.log(`Emptying "${coopName}".`)
    const { error: memberError } = await db.from('member')
      .delete().eq('cooperative_id', profile.cooperative_id)
    if (memberError) throw new Error(`Could not clear members: ${memberError.message}`)
    const { error: plotError } = await db.from('plot')
      .delete().eq('cooperative_id', profile.cooperative_id)
    if (plotError) throw new Error(`Could not clear plots: ${plotError.message}`)

    const { count } = await db.from('plot')
      .select('id', { count: 'exact', head: true }).eq('cooperative_id', profile.cooperative_id)
    console.log(`Done — ${count ?? 0} plots remain. Reload the app to see the empty state.`)
    return
  }

  console.log(`Filling "${coopName}".`)
  console.log('Existing members, plots and blocks in this cooperative will be replaced.\n')

  // The generator runs as its own process so it keeps using the service role
  // for the bulk writes, while the credentials above stay in this one.
  const child = spawn(
    'npx',
    ['tsx', '--env-file=.env', 'scripts/generate-synthetic.ts'],
    {
      stdio: 'inherit',
      env: { ...process.env, TERRION_SEED_COOPERATIVE_ID: profile.cooperative_id },
    },
  )
  child.on('exit', code => process.exit(code ?? 0))
}

main().catch(e => {
  console.error(`\n${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
