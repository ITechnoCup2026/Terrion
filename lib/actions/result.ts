/**
 * What a Server Action gives back when it fails.
 *
 * A Server Action that throws does not hand the browser its message. In a
 * production build Next strips it and React substitutes a numbered
 * placeholder -- `resolveErrorProd` in react-server-dom-webpack, minified
 * error #441. So every carefully written Indonesian refusal in app/actions/
 * was invisible to the people it was written for. The one in stagger.ts is
 * the clearest case: docs/TESTING.md Act VII instructs the reader to click
 * "Terapkan penggeseran" and check that the app "refuses, and says why", and
 * in a production build it has only ever said "Minified React error #441".
 *
 * Hence two kinds of failure, and only one of them speaks:
 *
 *   ExpectedFailure   something a real person did that they can undo. The
 *                     listing went away, the blocks are already planted, the
 *                     account has no cooperative. Its message IS the UI copy
 *                     and reaches the browser unchanged.
 *
 *   anything else     a bug. Its message names tables, columns and constraint
 *                     names, so the reader gets a generic sentence and the
 *                     original goes to the server log where it is useful.
 */

import { isBackendDown } from '@/lib/api/client'

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

/** A failure whose message is meant for the person who caused it. */
export class ExpectedFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExpectedFailure'
  }
}

const GENERIC =
  'Terjadi kesalahan di sistem. Coba lagi, dan hubungi pengelola Terrion jika terus berulang.'

// Not a bug, and not something to telephone anyone about: the action never
// reached the server, so nothing was written and trying again later is the
// whole remedy. GENERIC would send a pengurus looking for a fault that is not
// theirs.
const UNREACHABLE =
  'Server sedang tidak bisa dihubungi, jadi perubahan ini belum tersimpan. Coba lagi beberapa saat lagi.'

/** Narrows an ActionResult to its failure branch. */
export function isFailure<T>(
  result: ActionResult<T>,
): result is { ok: false; message: string } {
  return !result.ok
}

/**
 * Runs an action body and converts any throw into a result.
 *
 * Never rejects: a rejected Server Action is the thing this exists to prevent.
 */
export async function attempt<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() }
  } catch (error) {
    if (error instanceof ExpectedFailure) {
      return { ok: false, message: error.message }
    }
    if (isBackendDown(error)) {
      console.error('[action] backend unreachable', error)
      return { ok: false, message: UNREACHABLE }
    }
    // Not a fault the reader can act on, so it is logged rather than shown.
    console.error('[action] unexpected failure', error)
    return { ok: false, message: GENERIC }
  }
}
