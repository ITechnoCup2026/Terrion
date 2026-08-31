/**
 * This repo has no backend attached -- the Supabase project it used to talk
 * to was removed. Every remaining caller sits behind a currentAppUser() guard
 * that always redirects before this would actually run, so throwing here is
 * safe: it only fires if new code calls this without that guard.
 *
 * Typed `any` on purpose -- restoring the generated Database type would mean
 * restoring the schema, which is the whole thing being removed. Re-wire this
 * to a real client when the backend comes back.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createServerClient(): Promise<any> {
  throw new Error('Tidak ada backend yang terhubung.')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServiceClient(): any {
  throw new Error('Tidak ada backend yang terhubung.')
}
