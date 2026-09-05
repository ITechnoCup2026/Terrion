import { Archipelago } from '@/components/landing/Archipelago'
import { Logo } from '@/components/ui/Logo'
import { loadAtlasCooperativesIfUp } from '@/lib/atlas/load'

/**
 * The brand panel beside the auth form -- the landing hero, at half a screen.
 *
 * It used to be a flat field of green-900 with six concentric circles behind
 * it, which was honest enough but belonged to no other screen in the product.
 * A reader arriving from the landing poster met a different picture, a
 * different type scale and a different green, and the seam between "the site"
 * and "the app" landed exactly on the screen where they are deciding whether
 * to trust it.
 *
 * So this is the same poster, composed for a tall column instead of a wide
 * stage. Every device is the landing page's own, used the same way:
 *
 *   `.hero-stage`  the same gradient ground and the same slow aurora behind
 *                  the map, so the two screens are lit alike.
 *   `<Archipelago>` the real centrepiece, drawn from the same boundary file
 *                  the Atlas uses and lit only where a cooperative has
 *                  actually registered. The contour circles were a drawing of
 *                  nothing; this is the product's coverage.
 *   `.hero-line`   the display words rising out of their own mask, as one
 *                  sentence across two lines rather than two blocks fading in.
 *   `.range-band`  the reading the map produces -- a window, never a date.
 *                  It is the one figure the whole product is about, and the
 *                  auth screen is a fine place to show it doing its job.
 *
 * `variant` tailors the copy to what the visitor is actually doing -- a
 * returning koperasi wants proof the season's data is live, a first-time buyer
 * wants proof the market on the other side of the form is real. Hidden below
 * `lg`: there is no room for a poster next to a form on a phone, and the form
 * already carries the mark.
 */
type ShowcaseVariant = 'login' | 'signup'

const copy: Record<ShowcaseVariant, {
  /** Set as one sentence across two lines; the second is the ghost half. */
  words: [string, string]
  body: string
  /** The reading drawn on the scale: what it is, and on what basis. */
  reading: { label: string; basis: string }
  facts: [string, string][]
}> = {
  login: {
    words: ['PANEN', 'TERBACA'],
    body: 'Terrion menghubungkan lahan, panen dan pasokan koperasi dalam satu kalender tanam bersama.',
    reading: { label: 'Rentang Panen Terbaca', basis: '8–21 Oktober · 80% confidence' },
    facts: [
      ['Perkiraan panen', 'Dari akumulasi suhu, bukan hitungan hari'],
      ['Peringatan penumpukan', 'Sebelum minggu padat itu tiba'],
      ['Kebutuhan pupuk', 'Teragregasi ke format RDKK'],
    ],
  },
  signup: {
    words: ['PASOKAN', 'TERBUKA'],
    body: 'Telusuri panen yang diproyeksikan koperasi terverifikasi, lalu ajukan permintaan pasokan tanpa perantara.',
    reading: { label: 'Ketersediaan Terbaca', basis: '12 minggu ke depan · katalog terbuka' },
    facts: [
      ['Katalog terbuka', 'Proyeksi panen, bukan stok yang sudah ada'],
      ['Rentang, bukan janji', 'Setiap tonase tampil dengan dasarnya'],
      ['Tanpa perantara', 'Permintaan masuk ke koperasinya langsung'],
    ],
  },
}

export async function AuthShowcasePanel({
  variant = 'login',
}: {
  variant?: ShowcaseVariant
}) {
  const v = copy[variant]

  // Decoration, and it must never be the reason a login page fails to render.
  // `loadAtlasCooperativesIfUp` already absorbs an unreachable backend; this
  // absorbs the rest, and an empty set simply draws the archipelago unlit.
  let provinces = new Set<string>()
  try {
    const cooperatives = await loadAtlasCooperativesIfUp()
    provinces = new Set((cooperatives ?? []).map(c => c.province.toLowerCase()))
  } catch {
    // The outline alone still says what it needs to.
  }

  return (
    <div className="hero-stage relative hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
      {/* The centrepiece, behind the type and sized by its own width -- it is
          a 4:1 drawing, so a height would only letterbox it.

          It is centred, and the two blocks of type are anchored to the top and
          bottom edges instead of being stacked down the middle. That is the
          landing hero's composition, and it is not a stylistic echo: the map's
          ink is all in a horizontal band across its middle, so a paragraph set
          over that band is a paragraph read through Sulawesi. Type at the
          corners, picture between them -- each gets a clean field, at every
          height the panel can take. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <Archipelago
          provincesWithCooperatives={provinces}
          emphasis={3.0}
          className="h-auto w-[120%] max-w-none text-[var(--terrion-green-300)] opacity-65 drop-shadow-[0_24px_48px_rgb(7_49_36/0.5)]"
        />
      </div>

      {/* Top: the mark, and the sentence it belongs to. */}
      <div className="relative z-10">
        <div className="enter flex items-center gap-2.5">
          <Logo size={30} withWordmark={false} />
          <span className="text-lg font-semibold tracking-tight text-white">Terrion</span>
        </div>

        {/* One sentence across two lines, each rising out of its own mask.
            The second half is set in ghost so the pair reads as one line
            layered over the map rather than as two headings. */}
        <p className="mt-9 max-w-md">
          <span className="hero-line block">
            <span
              className="auth-word"
              style={{ ['--enter-delay' as string]: '120ms' }}
            >
              {v.words[0]}
            </span>
          </span>
          <span className="hero-line block">
            <span
              className="auth-word text-white/85"
              style={{ ['--enter-delay' as string]: '280ms' }}
            >
              {v.words[1]}
            </span>
          </span>
        </p>

        <p
          className="enter mt-4 max-w-xs text-[0.8125rem] leading-relaxed text-white/70"
          style={{ ['--enter-delay' as string]: '520ms' }}
        >
          {v.body}
        </p>
      </div>

      {/* Bottom: the reading the map produces, then what produces it.

          The reading is set as a labelled scale rather than a card -- a bold
          line, a quiet line, and the range drawn on a hairline underneath.
          Nothing boxed: the stage is the box. */}
      <div className="relative z-10">
        <div
          className="enter max-w-xs"
          style={{ ['--enter-delay' as string]: '660ms' }}
        >
          <p className="text-[0.9375rem] font-bold text-white">{v.reading.label}</p>
          <p className="mt-0.5 font-mono text-[0.75rem] text-white/60">
            {v.reading.basis}
          </p>
          <div aria-hidden className="range-band relative mt-4 h-px w-full bg-white/30">
            <span className="absolute inset-y-0 left-[26%] right-[28%] bg-[var(--terrion-green-300)]" />
            <span className="hero-knob absolute -top-[0.4375rem] left-[26%]" />
            <span className="hero-knob absolute -top-[0.4375rem] left-[72%]" />
          </div>
        </div>

        {/* Three facts as a ruled list, standing still. */}
        <dl className="mt-10 max-w-sm">
          {v.facts.map(([term, detail], i) => (
            <div
              key={term}
              className="enter border-t border-white/15 py-3"
              style={{ ['--enter-delay' as string]: `${780 + i * 90}ms` }}
            >
              <dt className="text-[0.8125rem] font-medium text-white">{term}</dt>
              <dd className="mt-0.5 text-[0.8125rem] text-white/55">{detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
