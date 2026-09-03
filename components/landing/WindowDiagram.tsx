import { Calendar, Flame, Info } from 'lucide-react'

import { Z_EARLY } from '@/lib/agronomy/predict'

/** Share of a normal distribution within ±z. Abramowitz & Stegun 26.2.17. */
function confidenceWithin(z: number): number {
  const t = 1 / (1 + 0.2316419 * z)
  const density = 0.3989422804014327 * Math.exp(-(z * z) / 2)
  const upperTail =
    density *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return 1 - 2 * upperTail
}

const WEEKS = [0, 20, 40, 60, 80, 100]
const BAND = { start: 30, end: 66 }
const MID = (BAND.start + BAND.end) / 2

export function WindowDiagram() {
  const confidence = Math.round(confidenceWithin(Z_EARLY) * 100)

  return (
    <figure className="panel p-6 sm:p-7 shadow-sm border border-border bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3.5 mb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--terrion-green-700)] flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-[var(--terrion-green-600)]" />
          Model GDD vs Kalender Kaku
        </span>
        <span className="badge-tag bg-[var(--terrion-green-50)] text-[var(--terrion-green-700)] border-[var(--terrion-green-200)]">
          {confidence}% Confidence
        </span>
      </div>

      {/* Comparison: Calendar Date vs GDD Range */}
      <div className="space-y-3">
        {/* Rigid Calendar Card */}
        <div className="flex items-center justify-between rounded-xl bg-red-50/60 p-3.5 border border-red-200/60">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-red-100 text-red-700 font-bold">
              <Calendar className="size-4" />
            </span>
            <div>
              <span className="block text-xs font-bold text-red-900">
                Kalender Konvensional
              </span>
              <span className="text-[0.6875rem] text-red-700/80">Asumsi kaku 100 hari</span>
            </div>
          </div>
          <span className="text-xs font-bold text-red-900/60 line-through decoration-red-400">
            Panen 14 Okt
          </span>
        </div>

        {/* Terrion GDD Model Card */}
        <div className="flex items-center justify-between rounded-xl bg-[var(--terrion-green-50)] p-3.5 border border-[var(--terrion-green-300)] shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--terrion-green-700)] text-white">
              <Flame className="size-4 text-[var(--terrion-gold-500)]" />
            </span>
            <div>
              <span className="block text-xs font-bold text-[var(--terrion-green-700)]">
                Model Suhu GDD Terrion
              </span>
              <span className="text-[0.6875rem] text-[var(--terrion-green-900)] font-medium">Akumulasi Suhu Riil (Anomali ±1.28 SD)</span>
            </div>
          </div>
          <span className="text-xs font-extrabold text-[var(--terrion-green-700)] bg-white px-2.5 py-1 rounded-md border border-[var(--terrion-green-200)] shadow-2xs">
            8 – 21 Oktober
          </span>
        </div>
      </div>

      {/* The track diagram */}
      <div className="mt-6 pt-4 border-t border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold text-foreground">
            Interval Panen (80% Confidence)
          </span>
          <span className="text-[0.6875rem] text-muted-foreground">
            Data Suhu Riil
          </span>
        </div>

        <div className="relative mt-2 h-16 rounded-xl bg-slate-50 p-3 border border-border/80">
          {WEEKS.map(left => (
            <span
              key={left}
              aria-hidden
              className="absolute top-5 h-3 w-px bg-border"
              style={{ left: `${left}%` }}
            />
          ))}
          <span
            aria-hidden
            className="absolute top-6 right-3 left-3 h-px bg-border/80"
          />

          {/* The GDD band */}
          <span
            aria-hidden
            className="band absolute top-[1.375rem] h-2.5 rounded-full bg-[var(--terrion-green-700)]"
            style={{
              left: `${BAND.start}%`,
              width: `${BAND.end - BAND.start}%`,
            }}
          />

          {/* Median GDD indicator line */}
          <span
            aria-hidden
            className="absolute top-3 h-6 w-0.5 bg-[var(--terrion-gold-500)]"
            style={{ left: `${MID}%` }}
          />

          <span
            className="absolute top-0.5 -translate-x-1/2 text-[0.625rem] font-bold text-[var(--terrion-green-700)]"
            style={{ left: `${BAND.start}%` }}
          >
            P10 (8 Okt)
          </span>
          <span
            className="absolute top-0.5 -translate-x-1/2 text-[0.625rem] font-bold text-[var(--terrion-green-700)]"
            style={{ left: `${BAND.end}%` }}
          >
            P90 (21 Okt)
          </span>
          <span
            className="absolute top-[2.75rem] -translate-x-1/2 text-[0.625rem] font-bold text-[var(--terrion-gold-600)]"
            style={{ left: `${MID}%` }}
          >
            Median GDD
          </span>
        </div>
      </div>

      <figcaption className="mt-5 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground flex items-start gap-2 bg-[var(--terrion-green-50)]/50 p-3 rounded-lg border border-[var(--terrion-green-200)]/60">
        <Info className="size-4 shrink-0 text-[var(--terrion-green-700)] mt-0.5" />
        <span>
          Tanaman merespons derajat suhu harian, bukan tanggal di kalender. Terrion mensimulasikan akumulasi energi panas harian untuk memberikan rentang kepastian panen yang realistis.
        </span>
      </figcaption>
    </figure>
  )
}
