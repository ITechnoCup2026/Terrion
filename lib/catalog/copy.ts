// The sentences the catalogue, the request form and the inbox say out loud.
//
// These live here rather than inside components because the rule they encode
// is legal, not cosmetic: Terrion is the system provider, never a party to the
// contract, and never a broker of futures or advance payment. Keeping the
// strings in one tested module turns that from something review must remember
// into something the suite enforces.

import { formatNumberId } from '@/lib/format/number'

/** Shown on every confirmation. Spec section 10, quoted exactly. */
export const LEGAL_FRAMING =
  'Permintaan ini dikirim ke koperasi, yang akan menerima atau menolak. ' +
  'Terrion adalah penyedia sistem, bukan pihak dalam kontrak, dan tidak menjamin pengiriman.'

/** Lowercase, because the guard test compares against lowercased copy. */
export const FORBIDDEN_TERMS = [
  'futures',
  'kontrak berjangka',
  'uang muka',
  'pembayaran di muka',
  'panjar',
] as const

export type DeliveryPreference =
  | 'antar_ke_gudang'
  | 'ambil_di_koperasi'
  | 'belum_ditentukan'

export const DELIVERY_PREFERENCES = [
  { value: 'antar_ke_gudang',   label: 'Antar ke gudang pembeli' },
  { value: 'ambil_di_koperasi', label: 'Ambil sendiri di koperasi' },
  { value: 'belum_ditentukan',  label: 'Belum ditentukan' },
] as const satisfies readonly { value: DeliveryPreference; label: string }[]

/**
 * Who is asking, as the inbox shows it.
 *
 * The organisation leads because it is the party the cooperative would be
 * contracting with; the person is who to telephone about it. Buyers registered
 * by an operator before organisations were required may have none, so the name
 * stands alone rather than trailing an empty bracket.
 */
export function requestBuyerLabel(name: string, organisation: string | null): string {
  const org = organisation?.trim()
  return org ? `${org} (${name})` : name
}

/** The preference as one line, because the schema has nowhere else to put it. */
export function deliveryPreferenceNote(value: DeliveryPreference): string {
  const found = DELIVERY_PREFERENCES.find(p => p.value === value)
  return `Preferensi pengiriman: ${found?.label ?? 'Belum ditentukan'}.`
}

/**
 * Said when a buyer asks for more than the week is projected to yield.
 *
 * Informative, not blocking. The projection is an estimate and the cooperative
 * decides; refusing the request here would treat a model output as a promise.
 */
export function overVolumeWarning(requestedTonnes: number, projectedTonnes: number): string {
  return (
    `Anda meminta ${formatNumberId(requestedTonnes)} ton, sedangkan minggu ini ` +
    `diproyeksikan ${formatNumberId(projectedTonnes)} ton. Koperasi mungkin hanya ` +
    'dapat memenuhi sebagian.'
  )
}

/** One line naming what is on offer and from whom. */
export function listingSummary(input: { tonnes: number; cooperativeName: string }): string {
  return `${formatNumberId(input.tonnes)} ton diproyeksikan oleh ${input.cooperativeName}.`
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'

/**
 * One word per state, and the same word everywhere.
 *
 * A pengurus presses **Terima**, so the state that button produces is
 * **Diterima** — an action keeps its name through the whole flow. Four screens
 * had drifted off that: the buyer's filter tabs said "Disetujui (ACC)", their
 * badges said "Disetujui", the pengurus's inbox said "Diterima", and the
 * account menu and command palette said "ACC". Four names for one event, two
 * of them office slang, on a screen whose entire job is telling a buyer
 * whether they have a contract.
 *
 * `all` is here rather than in each filter bar because both inboxes offer it
 * and both used to spell it themselves.
 */
export const REQUEST_STATUS_LABEL: Record<RequestStatus | 'all', string> = {
  all: 'Semua',
  pending: 'Menunggu',
  accepted: 'Diterima',
  declined: 'Ditolak',
  withdrawn: 'Ditarik',
}

/** The same state as a sentence, naming who did it. */
export function requestStatusLabel(status: RequestStatus): string {
  switch (status) {
    case 'pending':   return 'Menunggu jawaban koperasi'
    case 'accepted':  return 'Diterima koperasi'
    case 'declined':  return 'Ditolak koperasi'
    case 'withdrawn': return 'Ditarik pembeli'
  }
}

export const CATALOG_EMPTY = {
  title: 'Belum ada panen yang diproyeksikan',
  description:
    'Tidak ada koperasi dengan panen terproyeksi dalam 12 minggu ke depan. ' +
    'Katalog terisi sendiri begitu koperasi mencatat tanam.',
}

export const FILTERS_EMPTY = {
  title: 'Tidak ada yang cocok dengan filter Anda',
  description: 'Coba longgarkan filter komoditas, wilayah, volume, atau rentang waktu.',
}

export const INBOX_EMPTY = {
  title: 'Belum ada permintaan masuk',
  description:
    'Permintaan kontrak pasokan dari pembeli akan muncul di sini, ' +
    'lengkap dengan volume dan minggu panen yang diminta.',
}
