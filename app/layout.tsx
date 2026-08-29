import type { Metadata } from 'next'
import { Fira_Code, Fira_Sans } from 'next/font/google'

import './globals.css'

/**
 * Fira Sans for everything, Fira Code for figures that must line up.
 *
 * Chosen for a data product rather than for personality: Fira Sans is a
 * humanist sans with unambiguous digits and a large x-height, which is what a
 * kader reads on a phone in a field. The variable name matters — globals.css
 * maps `--font-sans` onto it, and if the two ever disagree the whole app
 * silently falls back to the browser's default serif.
 */
const firaSans = Fira_Sans({
  variable: '--font-fira-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const firaCode = Fira_Code({
  variable: '--font-fira-code',
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
      className={`${firaSans.variable} ${firaCode.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
