/**
 * Supabase auth failures, in Indonesian, for the buyer signup form.
 *
 * Every message here is one a stranger can act on. That is the whole test: a
 * buyer found the catalogue thirty seconds ago and has nobody to telephone, so
 * "invalid" tells them nothing and "Gagal mendaftar: Email address
 * \"diana@pangannusantara.test\" is invalid" tells them nothing in English.
 *
 * The raw Supabase message is never passed through. It is written for the
 * developer reading a server log, and it names internals -- which is fine in a
 * log and wrong on a signup form.
 */

/** The shape of a Supabase AuthError, narrowed to what is actually needed. */
export type SupabaseAuthErrorLike = {
  code?: string
  message?: string
}

const MESSAGES: Record<string, string> = {
  // Supabase refuses reserved TLDs outright -- .test, .invalid, .example and
  // .localhost never reach a mailbox, so it will not create an account for
  // one. docs/TESTING.md walks the reader straight into this, which is how it
  // became a bug report.
  email_address_invalid:
    'Alamat email ini tidak diterima. Domain seperti .test, .example dan .invalid ' +
    'tidak bisa menerima surat, jadi tidak bisa dipakai mendaftar. Gunakan alamat ' +
    'email yang benar-benar aktif.',

  // Confirmation mail goes out through the project's SMTP, which is rate
  // limited. The account was NOT created, so retrying later genuinely works.
  over_email_send_rate_limit:
    'Terlalu banyak email konfirmasi dikirim dari sistem ini dalam waktu singkat. ' +
    'Tunggu beberapa menit, lalu coba lagi.',

  over_request_rate_limit:
    'Terlalu banyak percobaan dari perangkat ini. Tunggu sebentar, lalu coba lagi.',

  weak_password:
    'Kata sandi terlalu mudah ditebak. Gunakan minimal 8 karakter dengan kombinasi ' +
    'huruf dan angka.',

  signup_disabled:
    'Pendaftaran akun baru sedang ditutup. Hubungi pengelola Terrion.',

  email_provider_disabled:
    'Pendaftaran dengan email sedang tidak aktif. Hubungi pengelola Terrion.',

  validation_failed:
    'Ada isian yang belum benar. Periksa kembali email dan kata sandi Anda.',

  // Also used by the login form (app/actions/login.ts) -- Supabase returns
  // this same code for a wrong password and for an email with no account,
  // and the two must read identically so a login form can't be used to
  // find out who has an account.
  invalid_credentials:
    'Email atau kata sandi salah. Periksa kembali, atau daftar jika belum punya akun.',

  email_not_confirmed:
    'Email Anda belum dikonfirmasi. Buka tautan konfirmasi yang dikirim ke email Anda.',
}

const FALLBACK =
  'Gagal mendaftar. Coba lagi sebentar lagi, dan hubungi pengelola Terrion jika terus berulang.'

/** The sentence to show a buyer for one Supabase auth failure. */
export function signupErrorMessage(error: SupabaseAuthErrorLike): string {
  if (!error.code) return FALLBACK
  return MESSAGES[error.code] ?? FALLBACK
}
