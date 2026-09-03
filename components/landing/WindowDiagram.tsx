import { Z_EARLY } from '@/lib/agronomy/predict'

/**
 * The one picture on the landing page that argues rather than illustrates.
 *
 * Terrion's most consequential design decision is that it never returns a
 * harvest DATE. `predictHarvest` runs the crop's growing-degree-day clock
 * twice — once against a warm climate anomaly, once against a cool one, at
 * ±1.2816 standard deviations — and returns the two dates that bracket it. So
 * the honest answer to "when do we harvest" is a WINDOW at 80% confidence, and
 * everything downstream (the catalogue, the collision detector, the dashboard)
 * is built on a window rather than a point.
 *
 * That is a hard thing to say in a sentence and an easy one to draw: a single
 * date struck through, and beneath it the band the product actually returns.
 * The figure is the argument, so it is worth the room it takes.
 *
 * The confidence label is COMPUTED from `Z_EARLY`, never typed. The z-score
 * and the percentage it implies are one fact written twice, and they have
 * drifted before: the spec said "±1 SD" in one paragraph and "P10/P90 · 80%
 * confidence" in the next, which is why that constant carries a comment
 * explaining the disagreement. A landing page that hard-codes "80%" is one
 * tuning commit away from advertising a number the model no longer produces.
 *
 * A server component. It renders the same every time and ships no JavaScript.
 */

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

/** Week boundaries down the track, as percentages. Structural, not decorative:
 *  without them the band is a length, and with them it is a countable number
 *  of weeks — which is the unit the whole product reasons in. */
const WEEKS = [0, 20, 40, 60, 80, 100]

/** Where the band sits on the track. Deliberately not live data: this figure
 *  explains the SHAPE of every answer, and drawing one cooperative's real
 *  window here would invite a reader to take it as that cooperative's. */
const BAND = { start: 30, end: 66 }
const MID = (BAND.start + BAND.end) / 2

export function WindowDiagram() {
  const confidence = Math.round(confidenceWithin(Z_EARLY) * 100)

  return (
    <figure className="panel p-6 sm:p-7 shadow-sm transition-all hover:border-[var(--terrion-green-300)]">
      {/* Comparison: Calendar Date vs GDD Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-red-50/60 p-3.5 border border-red-200/50">
          <div className="flex items-center gap-2.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-red-100 text-xs text-red-600 font-bold">
              ✕
            </span>
            <span className="rail text-red-700/80">Kalender Rigit</span>
          </div>
          <span className="font-mono text-[0.875rem] font-medium text-red-900/70 line-through decoration-red-400">
            Panen 14 Oktober
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[var(--terrion-green-50)] p-3.5 border border-[var(--terrion-green-200)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--terrion-green-200)] text-xs text-[var(--terrion-green-700)] font-bold">
              ✓
            </span>
            <span className="rail text-[var(--terrion-green-700)] font-semibold">
              Model Terrion GDD
            </span>
          </div>
          <span className="font-mono text-[0.9375rem] font-bold text-[var(--terrion-green-700)]">
            Panen 8–21 Oktober
          </span>
        </div>
      </div>

      {/* The track diagram */}
      <div className="mt-7 pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="rail text-xs">Akurasi Distribusi</span>
          <span className="badge-tag">{confidence}% Keyakinan (±1.28 SD)</span>
        </div>

        <div className="relative mt-4 h-[4.5rem] rounded-lg bg-muted/40 p-2 border border-border/70">
          {WEEKS.map(left => (
            <span
              key={left}
              aria-hidden
              className="absolute top-5 h-4 w-px bg-border/80"
              style={{ left: `${left}%` }}
            />
          ))}
          <span
            aria-hidden
            className="absolute top-[2.25rem] right-2 left-2 h-px bg-border"
          />

          {/* The band */}
          <span
            aria-hidden
            className="band absolute top-[1.875rem] h-3 rounded-full bg-[var(--terrion-green-700)] shadow-sm"
            style={{
              left: `${BAND.start}%`,
              width: `${BAND.end - BAND.start}%`,
              ['--band-delay' as string]: '240ms',
            }}
          />

          {/* Center line */}
          <span
            aria-hidden
            className="absolute top-4 h-6 w-0.5 bg-[var(--terrion-gold-500)] shadow-sm"
            style={{ left: `${MID}%` }}
          />

          <span
            className="rail absolute top-1 -translate-x-1/2 font-semibold text-[0.625rem] text-[var(--terrion-green-700)]"
            style={{ left: `${BAND.start}%` }}
          >
            P10 (8 Okt)
          </span>
          <span
            className="rail absolute top-1 -translate-x-1/2 font-semibold text-[0.625rem] text-[var(--terrion-green-700)]"
            style={{ left: `${BAND.end}%` }}
          >
            P90 (21 Okt)
          </span>
          <span
            className="rail absolute top-[3.1rem] -translate-x-1/2 text-[0.625rem] font-medium text-[var(--terrion-gold-600)]"
            style={{ left: `${MID}%` }}
          >
            Median GDD
          </span>
        </div>
      </div>

      <figcaption className="mt-5 border-t border-border pt-4 font-mono text-[0.6875rem] leading-relaxed text-[var(--terrion-ink-faint)] flex items-start gap-2">
        <span className="shrink-0 size-4 rounded-full bg-[var(--terrion-green-50)] text-[var(--terrion-green-700)] text-[0.625rem] flex items-center justify-center font-bold">
          i
        </span>
        <span>
          Dihitung dari akumulasi suhu harian (Growing Degree-Days) dari stasiun cuaca terdekat. Tanaman matang berdasar energi yang diserap, bukan hitungan kalender.
        </span>
      </figcaption>
    </figure>
  )
}
