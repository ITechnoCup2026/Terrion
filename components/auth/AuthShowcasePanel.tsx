import { Leaf, Sprout, TrendingUp } from 'lucide-react'

import { Logo } from '@/components/ui/Logo'

/**
 * The left-hand brand panel on the auth screens.
 *
 * Mirrors the brand board's showcase card: deep green ground, a gold glow
 * standing in for the logo's sun, contour lines standing in for terraced
 * fields, and the "Data yang Tumbuh, Keputusan yang Menghasilkan" line.
 * Hidden below `lg` -- there is no room for a mood panel next to a form on a
 * phone, and the form itself already carries the logo.
 */
export function AuthShowcasePanel() {
  return (
    <div
      className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
      style={{
        background:
          'radial-gradient(60rem 40rem at 15% -10%, color-mix(in oklch, var(--terrion-gold-500), transparent 70%), transparent 55%),' +
          'linear-gradient(160deg, var(--terrion-green-900), var(--terrion-green-700))',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'color-mix(in oklch, var(--terrion-gold-500), transparent 55%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full blur-3xl"
        style={{ background: 'color-mix(in oklch, var(--terrion-green-500), transparent 55%)' }}
      />
      <TerraceContours />

      <BrandMark />

      <div className="relative">
        <p className="text-3xl font-semibold leading-tight text-white">
          Data yang <span style={{ color: 'var(--terrion-gold-200)' }}>Tumbuh</span>,
          <br />
          Keputusan yang{' '}
          <span style={{ color: 'var(--terrion-gold-200)' }}>Menghasilkan</span>.
        </p>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
          Terrion menghubungkan lahan, panen dan pasokan koperasi dalam satu kalender
          tanam bersama.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <FloatingStat icon={Sprout} label="Lahan aktif" value="1.248 Ha" delay="0ms" />
          <FloatingStat icon={TrendingUp} label="Perkiraan panen" value="Okt 2026" delay="600ms" />
          <FloatingStat icon={Leaf} label="Pasokan tersedia" value="820 Ton" delay="1200ms" />
        </div>
      </div>
    </div>
  )
}

function BrandMark() {
  return (
    <div className="relative flex items-center gap-2">
      <Logo size={36} withWordmark={false} />
      <span className="text-lg font-semibold tracking-tight text-white">Terrion</span>
    </div>
  )
}

function FloatingStat({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: typeof Sprout
  label: string
  value: string
  delay: string
}) {
  return (
    <div
      className="animate-float flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm"
      style={{ animationDelay: delay }}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: 'color-mix(in oklch, var(--terrion-gold-500), transparent 25%)' }}
      >
        <Icon aria-hidden className="size-4 text-white" />
      </span>
      <div>
        <p className="text-[0.65rem] text-white/60">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  )
}

/** Faint concentric contour lines, evoking terraced fields seen from above. */
function TerraceContours() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 400"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
      preserveAspectRatio="xMidYMid slice"
    >
      {[60, 110, 160, 210, 260].map(r => (
        <circle
          key={r}
          cx="60"
          cy="380"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}
