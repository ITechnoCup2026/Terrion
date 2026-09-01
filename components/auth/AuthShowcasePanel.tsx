import { Building2, Handshake, Leaf, MapPin, Sprout, TrendingUp } from 'lucide-react'

import { Logo } from '@/components/ui/Logo'

/**
 * The left-hand brand panel on the auth screens.
 *
 * Mirrors the brand board's showcase card: deep green ground, a gold glow
 * standing in for the logo's sun, contour lines standing in for terraced
 * fields, and the "Data yang Tumbuh, Keputusan yang Menghasilkan" line.
 * Hidden below `lg` -- there is no room for a mood panel next to a form on a
 * phone, and the form itself already carries the logo.
 *
 * `variant` tailors the copy and stats to what the visitor is actually doing:
 * a returning koperasi wants proof the season's data is live, a first-time
 * buyer wants proof the market on the other side of the form is real. Same
 * frame, same brand mark, different evidence.
 */
type ShowcaseVariant = 'login' | 'signup'

const copy: Record<ShowcaseVariant, {
  eyebrow: string
  headline: [string, string]
  body: string
  glow: string
  stats: { icon: typeof Sprout; label: string; value: string; delay: string }[]
}> = {
  login: {
    eyebrow: 'Musim ini, berjalan',
    headline: ['Data yang Tumbuh,', 'Keputusan yang Menghasilkan.'],
    body: 'Terrion menghubungkan lahan, panen dan pasokan koperasi dalam satu kalender tanam bersama.',
    glow: 'var(--terrion-gold-500)',
    stats: [
      { icon: Sprout, label: 'Lahan aktif', value: '1.248 Ha', delay: '0ms' },
      { icon: TrendingUp, label: 'Perkiraan panen', value: 'Okt 2026', delay: '600ms' },
      { icon: Leaf, label: 'Pasokan tersedia', value: '820 Ton', delay: '1200ms' },
    ],
  },
  signup: {
    eyebrow: 'Untuk pembeli baru',
    headline: ['Beli Langsung dari', 'Sumbernya.'],
    body: 'Telusuri panen yang diproyeksikan koperasi verifikasi, lalu ajukan permintaan pasokan tanpa perantara.',
    glow: 'var(--terrion-green-500)',
    stats: [
      { icon: Building2, label: 'Koperasi terverifikasi', value: '46', delay: '0ms' },
      { icon: MapPin, label: 'Provinsi tercakup', value: '9', delay: '600ms' },
      { icon: Handshake, label: 'Model kemitraan', value: 'Langsung', delay: '1200ms' },
    ],
  },
}

export function AuthShowcasePanel({ variant = 'login' }: { variant?: ShowcaseVariant }) {
  const v = copy[variant]

  return (
    <div
      className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
      style={{
        background:
          `radial-gradient(60rem 40rem at 15% -10%, color-mix(in oklch, ${v.glow}, transparent 70%), transparent 55%),` +
          'linear-gradient(160deg, var(--terrion-green-900), var(--terrion-green-700))',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl transition-[background] duration-700"
        style={{ background: `color-mix(in oklch, ${v.glow}, transparent 55%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full blur-3xl"
        style={{ background: 'color-mix(in oklch, var(--terrion-green-500), transparent 55%)' }}
      />
      <TerraceContours />

      <BrandMark />

      <div key={variant} className="relative">
        <span
          className="animate-fade inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm"
        >
          {v.eyebrow}
        </span>

        <p
          className="animate-fade mt-4 text-3xl font-semibold leading-tight text-white"
          style={{ animationDelay: '80ms' }}
        >
          {v.headline[0]}
          <br />
          <span style={{ color: 'var(--terrion-gold-200)' }}>{v.headline[1]}</span>
        </p>
        <p
          className="animate-fade mt-4 max-w-sm text-sm leading-relaxed text-white/70"
          style={{ animationDelay: '160ms' }}
        >
          {v.body}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          {v.stats.map(stat => <FloatingStat key={stat.label} {...stat} />)}
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
