import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Fragment } from 'react'

import { Logo } from '@/components/ui/Logo'

/**
 * The pieces the login and signup forms share around the fields themselves.
 *
 * They exist because the two pages had been keeping the same blocks in step
 * by hand -- a heading, an error note and a footnote -- and the pair had
 * already drifted once. Each one here is a landing-page device
 * used the way the landing page uses it, so restyling the poster restyles the
 * forms with it.
 */

/**
 * The heading block above the form.
 *
 * The mark is repeated here only below `lg`, where the poster is hidden and
 * the form would otherwise be a page of inputs with no brand on it at all.
 *
 * There is no eyebrow. It used to open with the landing page's numbered rail
 * -- "01 — MASUK · KOPERASI & PEMBELI" -- which is a device for telling one
 * section of a long page from the next. These pages have one section, and the
 * reader arrived by clicking "Masuk", so the rail spent a line and a run of
 * caps restating the thing they had just done. The heading says it.
 *
 * `emphasis` is drawn with `.band-underline` -- the harvest band, at heading
 * scale. It is the landing page's single ornament and it is spent once per
 * screen, so `title` carries the sentence up to the phrase and `emphasis`
 * carries the phrase that matters. Gold means "somebody has to decide
 * something" everywhere else in the product; on the way in, that decision is
 * the one the reader is here to make.
 */
export function AuthHeading({
  title,
  emphasis,
  subtitle,
}: {
  title: string
  emphasis: string
  subtitle: string
}) {
  return (
    <div className="rise flex flex-col items-start gap-4">
      <Link
        href="/"
        aria-label="Terrion, kembali ke beranda"
        className="interactive lg:hidden"
      >
        <Logo size={40} withWordmark={false} />
      </Link>

      <div>
        <h1 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.25] font-extrabold tracking-tight text-[var(--terrion-green-700)]">
          {title} <span className="band-underline">{emphasis}</span>
        </h1>
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  )
}

/**
 * A refusal the server could explain, shown in the form. Red, because red is
 * the product's "declined, failed, past a hard cap" and nothing else.
 */
export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm leading-relaxed text-destructive"
    >
      {children}
    </p>
  )
}

/**
 * The small print under the form, on the landing's one tinted ground.
 *
 * The green-50 box separates the note from the form the way every other aside
 * on the landing page is separated. What changed is the routes out of it.
 *
 * They were `.cta-rule` links -- mono, small caps, 0.1em tracking, each with
 * a solid rule across its full width. That is the landing page's device for a
 * single call to action standing alone in a section. Two of them side by side,
 * carrying labels as long as "Lihat katalog tanpa masuk", set two heavy ruled
 * bars under a paragraph of 12px text: more ink than the note itself, and no
 * way to tell which one the reader was meant to take.
 *
 * So they are sentence-case links now, and they are ranked. The first is the
 * one route a visitor without an account can actually take -- green, weighted,
 * underlined in the light green so the rule reads as a link rather than as a
 * border. The rest are alternatives: same size, quieter ink, underline only on
 * hover, behind a dot separator. Neither competes with the submit button,
 * which is the only filled thing on the screen.
 */
export function AuthNote({
  children,
  links,
}: {
  children: React.ReactNode
  links: { href: string; label: string }[]
}) {
  return (
    <div className="rise mt-6 rounded-xl border border-[var(--terrion-green-200)] bg-[var(--terrion-green-50)] p-4">
      <p className="text-xs leading-relaxed text-[var(--terrion-green-900)]">
        {children}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.8125rem]">
        {links.map(({ href, label }, i) => (
          <Fragment key={href}>
            {i > 0 && (
              <span
                aria-hidden
                className="size-1 rounded-full bg-[var(--terrion-green-300)]"
              />
            )}
            {i === 0 ? (
              <Link
                href={href}
                className="interactive group inline-flex items-center gap-1 rounded-md font-semibold text-[var(--terrion-green-700)] underline decoration-[var(--terrion-green-300)] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--terrion-green-700)]"
              >
                {label}
                <ArrowRight
                  aria-hidden
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            ) : (
              <Link
                href={href}
                className="interactive rounded-md text-[var(--terrion-green-900)]/70 underline-offset-4 transition-colors hover:text-[var(--terrion-green-700)] hover:underline"
              >
                {label}
              </Link>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
