'use server'

import { signupSchema } from '@/lib/schemas/signup'
import { signupErrorMessage } from '@/lib/auth/signup-errors'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Registers a buyer from the public signup form.
 *
 * A buyer is the one account Terrion lets a stranger create for themselves. A
 * cooperative cannot be: it is a legal entity whose existence somebody has to
 * verify offline, which is what `pnpm register` records. A buyer holds no
 * tenant data and can do exactly two things -- ask a cooperative for produce,
 * and read the answer -- so the offline check buys nothing.
 *
 * Two clients are used, deliberately:
 *
 *   the anon client   creates the auth user, so the project's own email
 *                     confirmation setting applies. Self-registration must
 *                     prove the address belongs to the person, because the
 *                     organisation they type is what a pengurus now sees when
 *                     deciding whether to supply them.
 *
 *   the service client writes the app_user row, because app_user carries a
 *                      self_read policy and no insert policy at all. That is
 *                      the property that stops anyone creating or promoting
 *                      their own account through the API, and it is why the
 *                      role below is a literal rather than anything derived
 *                      from the request.
 */
/**
 * Why failure is a RESULT here and not an exception.
 *
 * A Server Action that throws does not hand the browser its message. Next
 * strips it in a production build and React replaces the whole error with a
 * numbered placeholder -- `resolveErrorProd` in react-server-dom-webpack,
 * which is minified error #441. The form's catch block then faithfully
 * displays "Minified React error #441" to a buyer who typed their name into a
 * box thirty seconds ago.
 *
 * So every failure a real person can cause and act on is a value. What remains
 * a throw is the genuinely unexpected -- and that is what error.tsx is for.
 */
export type SignupResult =
  | { outcome: 'signed_in' }
  | { outcome: 'confirm_email'; email: string }
  | { outcome: 'error'; message: string }

export async function signUpBuyer(raw: unknown): Promise<SignupResult> {
  // safeParse, not parse: the form validates against this same schema before
  // submitting, so a failure here means the request did not come from the
  // form. Its messages are already the Indonesian ones the form would show.
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    return { outcome: 'error', message: parsed.error.issues[0]?.message ?? 'Isian tidak valid.' }
  }
  const input = parsed.data

  // The cookie-aware anon client, so a session (when the project does not
  // require confirmation) is written where the rest of the app looks for it.
  const db = await createServerClient()
  const { data, error } = await db.auth.signUp({
    email: input.email,
    password: input.password,
  })

  if (error) {
    // The English original goes to the server log, where a developer wants it;
    // the buyer gets a sentence they can act on.
    console.error('[signup] auth.signUp failed', { code: error.code, message: error.message })
    return { outcome: 'error', message: signupErrorMessage(error) }
  }
  if (!data.user) {
    console.error('[signup] auth.signUp returned no user and no error')
    return { outcome: 'error', message: signupErrorMessage({}) }
  }

  // Supabase returns a user with no identities for an address that is already
  // registered, rather than an error, so that a signup form cannot be used to
  // discover who has an account. Answer identically and write nothing.
  if (data.user.identities?.length === 0) {
    return { outcome: 'confirm_email', email: input.email }
  }

  const admin = createServiceClient()
  const { error: profileError } = await admin.from('app_user').insert({
    id: data.user.id,
    role: 'buyer',            // never from input -- see the note above
    cooperative_id: null,     // enforced again by the buyer_has_no_coop constraint
    full_name: input.fullName,
    organisation: input.organisation,
  })

  if (profileError) {
    // An auth user with no app_user row reads as signed-out everywhere and
    // cannot be registered again, because the address is now taken. Undo it
    // rather than leave that behind.
    await admin.auth.admin.deleteUser(data.user.id)
    // Nothing the buyer typed caused this and nothing they type will fix it,
    // so they get the generic sentence and the cause goes to the log.
    console.error('[signup] app_user insert failed', profileError)
    return { outcome: 'error', message: signupErrorMessage({}) }
  }

  return data.session ? { outcome: 'signed_in' } : { outcome: 'confirm_email', email: input.email }
}
