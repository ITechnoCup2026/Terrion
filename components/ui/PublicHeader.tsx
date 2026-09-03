'use client'

import { usePathname } from 'next/navigation'

/**
 * The public shell's header — everywhere except the landing page.
 *
 * The landing hero is a full-bleed green card that carries its own wordmark,
 * navigation and call to action along its top edge. Rendering the shared bar
 * above it too would put two navigations within 60px of each other, and the
 * sticky one would sit over the hero's own as the reader scrolls.
 *
 * So this hides itself on `/` and nowhere else. A client component purely to
 * read the path: its children are composed on the server and passed through
 * untouched, so the account menu and the nav still arrive as markup and
 * nothing about the header's contents ships to the browser because of this.
 */
export function PublicHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/') return null

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--public-header)] w-full max-w-5xl items-center justify-between gap-4 px-4">
        {children}
      </div>
    </header>
  )
}
