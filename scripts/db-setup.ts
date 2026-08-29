/**
 * Applies the schema and the reference seed data to the linked project.
 *
 *   pnpm db:setup
 *
 * There is no migrations folder: the schema lives in supabase/schemas/ as
 * declarative SQL, numbered so the order is part of the filename rather than
 * something a runner has to infer. 01_tenancy defines the types every later
 * file references, and 07_rls is last because a policy cannot be written
 * against a table that does not exist yet.
 *
 * Safe to re-run. The schema files use bare `create table`, so applying them
 * to a project that already has the schema raises "already exists" — that is
 * reported as `already applied` rather than as a failure, because it is the
 * expected answer to "make sure the schema is there".
 *
 * It never drops anything. `pnpm db:reset` is the separate command for that,
 * with its own confirmation.
 */

import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const CLI = './node_modules/.bin/supabase'

// Numbered filenames are the running order; sorting them is the whole scheduler.
function filesIn(dir: string): string[] {
  return readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
}

// Postgres codes for "this object is already here": duplicate type, table,
// column, object and constraint. Each means the file has already been applied.
const ALREADY_THERE = ['42710', '42P07', '42701', '42P16', '42P06']

function apply(path: string): 'applied' | 'skipped' {
  process.stdout.write(`  ${path} … `)
  try {
    // The CLI prints its own errors as JSON on stdout with a zero exit in some
    // versions, so both streams are captured and inspected rather than trusted.
    const out = execFileSync(CLI, ['db', 'query', '--linked', '-f', path], {
      stdio: 'pipe', encoding: 'utf8',
    })
    if (/\"_tag\":\"Error\"/.test(out)) throw Object.assign(new Error('query error'), { stdout: out })
    console.log('ok')
    return 'applied'
  } catch (e) {
    const err = e as { stdout?: Buffer | string; stderr?: Buffer | string }
    const detail = `${err.stdout ?? ''}${err.stderr ?? ''}`
    if (ALREADY_THERE.some(code => detail.includes(code))) {
      console.log('already applied')
      return 'skipped'
    }
    console.log('FAILED')
    const message = detail.match(/ERROR:[^\\"]+/)?.[0] ?? detail.trim().split('\n').slice(-3).join('\n')
    throw new Error(`${path}\n  ${message}`)
  }
}

function main() {
  console.log('Applying schema to the linked Supabase project.\n')

  console.log('Schema:')
  let fresh = 0
  for (const f of filesIn('supabase/schemas')) {
    if (apply(join('supabase/schemas', f)) === 'applied') fresh += 1
  }

  // Reference data is not demo data: commodities, varieties, published
  // fertiliser rates and farm-gate prices are what the model computes against,
  // and an empty app still needs all of it.
  console.log('\nReference data:')
  for (const f of filesIn('supabase/seed')) apply(join('supabase/seed', f))

  if (fresh === 0) {
    console.log('\nSchema was already in place; nothing structural changed.')
  }
  console.log('\nDone. Next: pnpm register')
}

try {
  main()
} catch (e) {
  console.error(`\n${e instanceof Error ? e.message : e}`)
  process.exit(1)
}
