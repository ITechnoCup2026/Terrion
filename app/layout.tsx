import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'

import './globals.css'

/**
 * IBM Plex Sans for everything a person reads, IBM Plex Mono for figures that
 * have to line up in a column.
 *
 * One superfamily rather than two unrelated faces, so the mono digits share
 * the sans's proportions and a tonnage in a table does not look pasted in from
 * another document. Plex was drawn for dense technical text: open apertures, a
 * large x-height, and unambiguous 1/l/I and 0/O — which matters when the
 * reader is a kader entering a figure on a phone in bright sun.
 *
 * Weights stop at 600. The product's hierarchy is carried by size, space and
 * colour; a heavier weight on a screen of figures only makes it louder. Adding
 * a 700 here is how that rule gets quietly broken.
 *
 * The variable names matter — globals.css maps `--font-sans` and `--font-mono`
 * onto these, and if the two ever disagree the whole app silently falls back
 * to the browser's default serif.
 */
const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Terrion',
    template: '%s · Terrion',
  },
  description:
    'Proyeksi panen, agregasi kebutuhan pupuk dan katalog pasokan untuk koperasi tani.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="id"
      className={`${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
