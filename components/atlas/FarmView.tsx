'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { AtlasFarm } from '@/lib/atlas/load'
import { formatNumberId } from '@/lib/format/number'

/**
 * One cooperative's land, inside the Atlas panel.
 *
 * It used to be a full-screen modal that covered the map, which contradicted
 * the thing the Atlas exists to do: drilling from country to province to
 * regency is a camera move precisely so the levels feel like one place, and
 * then the last step threw the place away. It is now the deepest state of the
 * same column, and the map you arrived through is still behind it.
 *
 * A list, not a grid of tiles. At panel width a tile is 160px holding four
 * lines of text under a decorative crop glyph; a row fits the same four lines
 * legibly and lets twenty plots be read by running down one edge. The crop
 * keeps its colour as the bar on the leading edge, which is the same device
 * the catalogue card and the plot list use for the same purpose.
 *
 * The farm is drawn rather than mapped, and that is a privacy property, not a
 * layout choice: `public_plot` has no coordinate column at all, so there is
 * nothing here that could place a farmer's field even if the design implied
 * it. The footer says so out loud.
 *
 * Fetched on open rather than with the map: nobody visits forty farms, and
 * loading them all up front would pay for every one of them.
 */
export function FarmView({
  cooperativeId,
  onClose,
}: {
  cooperativeId: string
  onClose: () => void
}) {
  const [farm, setFarm] = useState<AtlasFarm | null>(null)
  const [failed, setFailed] = useState(false)

  // The parent remounts this per cooperative (key={farmId}), so state starts
  // fresh on its own — resetting it here instead would set state synchronously
  // inside an effect and cascade an extra render on every open.
  useEffect(() => {
    let alive = true
    fetch(`/api/atlas/farm/${cooperativeId}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(data => alive && setFarm(data))
      .catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [cooperativeId])

  // This view owns Escape while it is open; the Atlas behind it checks for an
  // open farm first, so the two never both act on one press. No body-scroll
  // lock any more — it is a column in the page, not a modal over it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="interactive -ml-1 inline-flex items-center gap-1.5 rounded px-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Kembali ke peta
        </button>

        <h1 className="mt-2 text-base font-medium text-foreground">
          {farm?.name ?? 'Memuat…'}
        </h1>
        {farm && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {farm.village}, {farm.district} · {formatNumberId(farm.plots.length)} lahan ·{' '}
            {formatNumberId(farm.totalHectares, 2)} ha
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {failed && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Kebun ini belum bisa ditampilkan. Coba lagi nanti.
          </p>
        )}

        {!farm && !failed && (
          <ul aria-busy="true" className="divide-y divide-border">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <span className="h-10 w-1 shrink-0 animate-pulse rounded-full bg-muted" />
                <span className="flex-1 space-y-1.5">
                  <span className="block h-3 w-2/3 animate-pulse rounded bg-muted" />
                  <span className="block h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                </span>
              </li>
            ))}
          </ul>
        )}

        {farm && farm.plots.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Koperasi ini belum mendaftarkan lahan.
          </p>
        )}

        {farm && farm.plots.length > 0 && (
          <ul className="divide-y divide-border">
            {farm.plots.map(plot => {
              // The first crop decides the bar's colour. A plot growing two
              // things is rare and the second is named in the line below.
              const idle = plot.crops.length === 0
              const style = commodityStyle(plot.crops[0] ?? '')

              return (
                // A link, not a card. Every plot here already has a public page
                // of its own -- the one a cooperative shares with a buyer -- and
                // until now the only route to it was copying a code out of the
                // signed-in app. The Atlas ends at the field it names.
                <li key={plot.publicId}>
                  <Link
                    href={`/garden/${plot.publicId}`}
                    className="interactive group flex gap-3 px-4 py-3 hover:bg-muted"
                  >
                    <span
                      aria-hidden
                      className="w-1 shrink-0 rounded-full"
                      style={{ background: idle ? 'var(--border)' : style.hue }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[0.8125rem] font-medium text-foreground underline-offset-4 group-hover:underline">
                          {plot.name}
                        </span>
                        <span className="shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground">
                          {formatNumberId(plot.areaHa, 2)} ha
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-muted-foreground">
                        {plot.memberName}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-[var(--terrion-ink-faint)]">
                        {plot.crops.length ? plot.crops.join(', ') : 'Belum ditanami'}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {farm && farm.plots.length > 0 && (
        <footer className="shrink-0 border-t border-border px-4 py-3">
          <p className="text-[0.625rem] leading-relaxed text-[var(--terrion-ink-faint)]">
            Daftar ini adalah gambaran musim koperasi, bukan denah lokasi. Titik
            koordinat lahan tidak pernah ditampilkan di halaman publik.
          </p>
        </footer>
      )}
    </div>
  )
}
