import { Logo } from '@/components/ui/Logo'

/**
 * The brand panel beside the auth form.
 *
 * The one screen in the product that is allowed to be a solid field of colour,
 * because it is the only screen with nothing to read on it. Everywhere else
 * green means "the cooperative's own"; here it is simply the ground.
 *
 * What it used to be: two blurred radial glows, a gradient, a frosted eyebrow
 * pill, a headline whose second line changed colour, and three cards drifting
 * up and down on staggered infinite loops. None of that was caused by
 * anything. Motion with no cause is the fastest way to make a product feel
 * synthetic, and a login screen is where a cooperative decides whether this
 * looks like software their bookkeeping can live in.
 *
 * What survives is the one device that comes from the subject: contour lines,
 * the shape of terraced fields read from above.
 *
 * `variant` tailors the copy to what the visitor is actually doing -- a
 * returning koperasi wants proof the season's data is live, a first-time buyer
 * wants proof the market on the other side of the form is real. Hidden below
 * `lg`: there is no room for a brand panel next to a form on a phone, and the
 * form already carries the mark.
 */
type ShowcaseVariant = 'login' | 'signup'

const copy: Record<ShowcaseVariant, {
  headline: string
  body: string
  facts: [string, string][]
}> = {
  login: {
    headline: 'Data yang tumbuh, keputusan yang menghasilkan.',
    body: 'Terrion menghubungkan lahan, panen dan pasokan koperasi dalam satu kalender tanam bersama.',
    facts: [
      ['Perkiraan panen', 'Dari akumulasi suhu, bukan hitungan hari'],
      ['Peringatan penumpukan', 'Sebelum minggu padat itu tiba'],
      ['Kebutuhan pupuk', 'Teragregasi ke format RDKK'],
    ],
  },
  signup: {
    headline: 'Beli langsung dari sumbernya.',
    body: 'Telusuri panen yang diproyeksikan koperasi terverifikasi, lalu ajukan permintaan pasokan tanpa perantara.',
    facts: [
      ['Katalog terbuka', 'Proyeksi panen, bukan stok yang sudah ada'],
      ['Rentang, bukan janji', 'Setiap tonase tampil dengan dasarnya'],
      ['Tanpa perantara', 'Permintaan masuk ke koperasinya langsung'],
    ],
  },
}

export function AuthShowcasePanel({ variant = 'login' }: { variant?: ShowcaseVariant }) {
  const v = copy[variant]

  return (
    <div className="relative hidden overflow-hidden bg-[var(--terrion-green-900)] lg:flex lg:flex-col lg:justify-between lg:p-12">
      <TerraceContours />

      <div className="relative flex items-center gap-2.5">
        <Logo size={30} withWordmark={false} />
        <span className="text-lg font-semibold tracking-tight text-white">Terrion</span>
      </div>

      <div key={variant} className="relative">
        <p className="animate-fade max-w-md text-3xl leading-tight font-semibold text-white">
          {v.headline}
        </p>
        <p
          className="animate-fade mt-4 max-w-sm text-sm leading-relaxed text-white/65"
          style={{ animationDelay: '80ms' }}
        >
          {v.body}
        </p>

        {/* Three facts as a ruled list, standing still. */}
        <dl className="animate-fade mt-10 max-w-sm" style={{ animationDelay: '160ms' }}>
          {v.facts.map(([term, detail]) => (
            <div key={term} className="border-t border-white/15 py-3.5">
              <dt className="text-[0.8125rem] font-medium text-white">{term}</dt>
              <dd className="mt-0.5 text-[0.8125rem] text-white/55">{detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

/** Concentric contour lines, evoking terraced fields seen from above. */
function TerraceContours() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 400"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.1]"
      preserveAspectRatio="xMidYMid slice"
    >
      {[60, 110, 160, 210, 260, 310].map(r => (
        <circle key={r} cx="60" cy="380" r={r} fill="none" stroke="white" strokeWidth="1.25" />
      ))}
    </svg>
  )
}
