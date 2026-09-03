'use client'

import { usePathname } from 'next/navigation'

/**
 * The public shell's outermost box — and the only place the landing theme is
 * switched on.
 *
 * The theme goes on the element that contains the footer as well as the page,
 * because the footer is not the page's to colour: it lives in the layout and
 * is shared with the catalogue and the garden.
 *
 * `.landing` redefines the design tokens rather than restyling anything,
 * which is what lets the supply ruler — a component the landing page does not
 * own — sit correctly on this surface without knowing the landing page exists.
 *
 * A client component purely to read the path, exactly like `<PublicHeader>`:
 * its children are composed on the server and passed through untouched, so
 * nothing about the shell's contents ships to the browser because of this.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const landing = usePathname() === '/'

  return (
    <div
      className={
        landing
          ? 'landing flex min-h-full flex-1 flex-col'
          : 'flex min-h-full flex-1 flex-col'
      }
    >
      {/* `.reveal` rests at opacity 0 and is turned on by an observer, and the
          map's provinces rest unfilled until that same observer reaches them.
          Everything is server-rendered, so this is the only thing standing
          between a reader without JavaScript and the page. */}
      {landing && (
        <noscript>
          <style>{
            '.reveal{opacity:1!important;transform:none!important}' +
            '.province-lit{fill-opacity:var(--lit-fill,0.3)!important}'
          }</style>
        </noscript>
      )}

      {children}
    </div>
  )
}
