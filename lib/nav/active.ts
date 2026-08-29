// Which navigation item the current URL belongs to.
//
// Kept out of the component because the interesting case is a near-miss:
// a naive `startsWith` marks "Lahan" active on /plotsomething, which nothing
// in a rendered page makes obvious.

/**
 * True when `href` is the nav item that owns `pathname` — the exact page or
 * any page beneath it. A trailing slash on the current path is ignored. The
 * root item `/` owns only itself, never every page under it.
 */
export function isActivePath(pathname: string, href: string): boolean {
  const current = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const target = href.length > 1 ? href.replace(/\/+$/, '') : href

  if (target === '/') return current === '/'
  return current === target || current.startsWith(`${target}/`)
}
