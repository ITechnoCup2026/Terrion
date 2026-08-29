// Indonesian month names, long form.
//
// `lib/harvest/format.ts` owns the *abbreviated* set, because a harvest window
// has to stay short enough to sit inline in a table cell. Prose — an alert
// sentence, an RDKK heading — wants the full name, so it lives here rather
// than being spelled out again at each call site.

export const MONTHS_ID_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const
