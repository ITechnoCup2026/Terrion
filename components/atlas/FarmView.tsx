'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { commodityStyle } from '@/lib/catalog/commodity-style'
import type { AtlasFarm } from '@/lib/atlas/load'

/**
 * Visiting one cooperative's land, full screen.
 *
 * The farm is drawn rather than mapped. Every plot becomes a tile sized by its
 * hectares and coloured by what is growing on it, laid out on a grid — which is
 * a picture of the cooperative's season, not of where anybody's field is. That
 * distinction is the point: the data behind this comes from `public_plot`,
 * which has no coordinate column at all, so there is nothing here that could
 * place a farmer's land even if the layout implied otherwise.
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

  // The dialog owns Escape while it is open; the Atlas behind it checks for
  // this component first, so the two never both act on one press.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kunjungi kebun koperasi"
      className="animate-[fade_0.25s_ease-out_both] absolute inset-0 z-50 flex flex-col bg-[#0b1410]/95 backdrop-blur-sm"
    >
      <header className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
        <div>
          <p className="text-[0.6875rem] text-white/50">Kunjungi kebun</p>
          <h2 className="mt-0.5 text-lg font-semibold text-white">
            {farm?.name ?? 'Memuat…'}
          </h2>
          {farm && (
            <p className="mt-0.5 text-xs text-white/60">
              {farm.village}, {farm.district}, {farm.province} · {farm.plots.length} lahan ·{' '}
              {farm.totalHectares.toFixed(2).replace('.', ',')} ha
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="interactive shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          Tutup · Esc
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {failed && (
          <p className="mx-auto mt-16 max-w-sm text-center text-sm text-white/60">
            Kebun ini belum bisa ditampilkan. Coba lagi nanti.
          </p>
        )}

        {!farm && !failed && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {farm && farm.plots.length === 0 && (
          <p className="mx-auto mt-16 max-w-sm text-center text-sm text-white/60">
            Koperasi ini belum mendaftarkan lahan.
          </p>
        )}

        {farm && farm.plots.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {farm.plots.map((plot, i) => {
              // The first crop decides the tile's colour. A plot growing two
              // things is rare and the second is named in the caption anyway.
              const style = commodityStyle(plot.crops[0] ?? '')
              const idle = plot.crops.length === 0
              return (
                // A link, not a card. Every tile here already has a public page
                // of its own -- the one a cooperative shares with a buyer -- and
                // until now the only route to it was copying a code out of the
                // signed-in app. The Atlas ends at the field it names.
                <Link
                  key={plot.publicId}
                  href={`/garden/${plot.publicId}`}
                  className="rise interactive group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/25"
                  style={{ ['--rise-delay' as string]: `${Math.min(i, 18) * 35}ms` }}
                >
                  <div
                    className="relative flex h-20 items-center justify-center"
                    style={{ backgroundColor: idle ? 'rgb(255 255 255 / 0.04)' : style.tint }}
                  >
                    {idle ? (
                      // Registered land with nothing growing is a real state and
                      // gets a furrow pattern rather than a crop that is not there.
                      <div
                        aria-hidden
                        className="size-full opacity-25"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(90deg, transparent 0 5px, rgb(255 255 255 / .35) 5px 6px)',
                        }}
                      />
                    ) : (
                      <svg
                        aria-hidden viewBox="0 0 24 24"
                        className="size-9 transition-transform duration-500 group-hover:scale-110"
                        fill="none" stroke={style.hue} strokeWidth="1.25"
                        strokeLinecap="round" strokeLinejoin="round"
                      >
                        <path d={style.glyph} />
                      </svg>
                    )}
                  </div>

                  <div className="p-2.5">
                    <p className="truncate text-xs font-medium text-white">{plot.name}</p>
                    <p className="truncate text-[0.7rem] text-white/50">{plot.memberName}</p>
                    <p className="mt-1 font-mono text-[0.7rem] text-white/70">
                      {plot.areaHa.toFixed(2).replace('.', ',')} ha
                    </p>
                    <p className="mt-0.5 truncate text-[0.7rem] text-white/50">
                      {plot.crops.length ? plot.crops.join(', ') : 'Belum ditanami'}
                    </p>
                    <p className="mt-1.5 text-[0.7rem] font-medium text-[#e8b021] opacity-0 transition-opacity group-hover:opacity-100">
                      Buka halaman lahan
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {farm && farm.plots.length > 0 && (
        <footer className="border-t border-white/10 px-4 py-3">
          <p className="text-[0.7rem] leading-relaxed text-white/45">
            Susunan petak adalah gambaran musim koperasi, bukan denah lokasi. Titik
            koordinat lahan tidak pernah ditampilkan di halaman publik.
          </p>
        </footer>
      )}
    </div>
  )
}
