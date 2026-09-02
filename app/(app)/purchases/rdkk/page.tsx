import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PrintButton } from '@/components/commerce/PrintButton'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page } from '@/components/ui/Page'
import { addDays } from '@/lib/agronomy/dates'
import { currentAppUser } from '@/lib/auth/session'
import { formatNumberId } from '@/lib/format/number'
import { MONTHS_ID } from '@/lib/harvest/format'
import { SUBSIDY_CAP_HA } from '@/lib/rdkk/aggregate'
import { loadSeasonInputs } from '@/lib/rdkk/load'

export const metadata = { title: 'RDKK' }

// The form must show what is planted right now, not what was planted when this
// page was last built.
export const dynamic = 'force-dynamic'

// A filing date, spelled out the way an Indonesian form writes one.
function formatFilingDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export default async function RdkkPage() {
  const user = await currentAppUser()
  if (!user) redirect('/login')
  if (!user.cooperative_id) redirect('/catalog')

  const now = new Date()
  // GET /api/rdkk already returns the cooperative's name/village/district/
  // province alongside the aggregate, so there is nothing else to look up.
  const doc = await loadSeasonInputs({ label: 'musim ini', start: addDays(now, -365), end: now })

  if (doc.rows.length === 0) {
    return (
      <Page>
        <EmptyState
          title="Belum ada yang bisa dicetak"
          description="RDKK dihitung dari tanam yang tercatat 12 bulan terakhir. Daftarkan tanam untuk mengisi formulir ini."
          action={
            <Link href="/purchases" className={buttonVariants({ variant: 'outline' })}>
              Kembali ke pembelian
            </Link>
          }
        />
      </Page>
    )
  }

  return (
    <Page width="wide" className="max-w-4xl print:max-w-none print:px-0 print:py-0">
      {/* Screen-only controls. On paper they would be a row of dead buttons. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/purchases" className={buttonVariants({ variant: 'ghost' })}>
          Kembali ke pembelian
        </Link>
        <PrintButton label="Cetak / simpan PDF" />
      </div>

      {/* The one screen in the product that is not designed by us.
          This is a government form, and everything below reproduces how the
          RDKK is actually typeset: the heading in capitals, the column names
          in capitals, centred, on paper. The house rules against all-caps and
          against weights above 600 stop at this element deliberately — a
          cooperative hands this to a distributor, and a version that looks
          like the rest of our UI is a version that looks wrong to them. */}
      <article className="rounded-lg border border-border bg-card p-4 text-foreground sm:p-6 print:rounded-none print:border-0 print:bg-transparent print:p-0 print:text-black">
        <header className="text-center">
          <h1 className="text-base font-bold uppercase tracking-wide">
            Rencana Definitif Kebutuhan Kelompok (RDKK)
          </h1>
          <p className="mt-1 text-sm">Pupuk Bersubsidi · {doc.meta.seasonLabel}</p>
        </header>

        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground print:text-black">Kelompok</dt>
            <dd className="font-medium">{doc.meta.cooperativeName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground print:text-black">Desa</dt>
            <dd>{doc.meta.village}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground print:text-black">Kabupaten</dt>
            <dd>{doc.meta.district}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground print:text-black">Provinsi</dt>
            <dd>{doc.meta.province}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground print:text-black">Jumlah anggota</dt>
            <dd>{doc.memberCount} orang</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground print:text-black">Luas tanam</dt>
            <dd>{formatNumberId(doc.totalPlantedHa)} ha</dd>
          </div>
        </dl>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-border text-left print:border-black">
                <th className="w-10 px-2 py-2 text-right font-medium">No</th>
                <th className="px-2 py-2 font-medium">Nama anggota</th>
                <th className="px-2 py-2 text-right font-medium">Luas (ha)</th>
                {doc.columns.map(item => (
                  <th key={item} className="px-2 py-2 text-right font-medium uppercase">
                    {item} (kg)
                  </th>
                ))}
                <th className="px-2 py-2 font-medium">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {doc.rows.map((row, i) => (
                <tr key={row.memberId} className="border-b border-border/60 print:border-black/30">
                  <td className="px-2 py-1.5 text-right tabular-nums">{i + 1}</td>
                  <td className="px-2 py-1.5">{row.memberName}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatNumberId(row.plantedHa)}
                  </td>
                  {row.quantitiesKg.map((qty, c) => (
                    <td key={doc.columns[c]} className="px-2 py-1.5 text-right tabular-nums">
                      {/* An em dash, not a nought. This farmer grows nothing this
                          rate applies to; they have not ordered zero sacks. */}
                      {qty === null ? '—' : formatNumberId(qty, 0)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-xs">
                    {row.overSubsidyCap
                      ? `Lebih ${formatNumberId(row.excessHa)} ha dari batas subsidi`
                      : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-semibold print:border-black">
                <td className="px-2 py-2" colSpan={2}>Jumlah</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatNumberId(doc.totalPlantedHa)}
                </td>
                {doc.totals.map((qty, c) => (
                  <td key={doc.columns[c]} className="px-2 py-2 text-right tabular-nums">
                    {qty === null ? '—' : formatNumberId(qty, 0)}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {doc.membersOverCap > 0 && (
          <p className="mt-4 text-xs">
            <span className="font-semibold">
              {doc.membersOverCap} anggota melewati batas {SUBSIDY_CAP_HA} ha.
            </span>{' '}
            Batas pupuk bersubsidi berlaku per petani. Luas di atas batas tetap tercantum
            di formulir ini dan harus diajukan terpisah, bukan dihapus diam-diam.
          </p>
        )}

        {doc.commoditiesWithoutRates.length > 0 && (
          <p className="mt-2 text-xs">
            {doc.commoditiesWithoutRates.length} komoditas yang ditanam musim ini belum
            punya acuan dosis, sehingga luasnya tidak menghasilkan baris kebutuhan di atas.
          </p>
        )}

        {/* The sources are the difference between a form and an assertion. */}
        <section className="mt-5 border-t border-border pt-3 text-xs print:border-black">
          <h2 className="font-semibold">Acuan dosis</h2>
          <ul className="mt-1 grid gap-0.5">
            {doc.sources.map(source => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </section>

        <footer className="mt-8 grid grid-cols-2 gap-8 text-sm break-inside-avoid">
          <div>
            <p>Mengetahui,</p>
            <p className="mt-1 font-medium">Penyuluh Pertanian</p>
            <div className="mt-14 border-t border-border print:border-black" />
          </div>
          <div className="text-right">
            <p>{doc.meta.village}, {formatFilingDate(doc.meta.printedAt)}</p>
            <p className="mt-1 font-medium">Ketua Kelompok</p>
            <div className="mt-14 border-t border-border print:border-black" />
          </div>
        </footer>
      </article>
    </Page>
  )
}
