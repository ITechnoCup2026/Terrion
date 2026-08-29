/**
 * Which routes take over the whole screen.
 *
 * One page in the cooperative app is a picture rather than a document: the
 * farm. It wants every pixel, no page scroll and no padding, with the header
 * and the navigation floating over it instead of pushing it down.
 *
 * Kept out of the shell component because the interesting cases are the
 * near-misses -- /plots is a list, /plots/new is a form, and both sit directly
 * under the route that is immersive.
 */

/** True when `pathname` is a single plot's farm view. */
export function isImmersiveRoute(pathname: string): boolean {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const segments = trimmed.split('/').filter(Boolean)

  // Exactly /plots/<something>. The list above it and the form beside it are
  // ordinary pages, and nothing is routed below it.
  if (segments.length !== 2 || segments[0] !== 'plots') return false
  return segments[1] !== 'new'
}
