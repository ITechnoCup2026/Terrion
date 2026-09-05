import type { UserRole } from '@/lib/auth/roles'
import { isActivePath } from '@/lib/nav/active'

/**
 * Which frame a public route wears: the marketing header, or the workspace
 * rail the cooperative side uses.
 *
 * Kept out of <PublicShell> for the same reason isImmersiveRoute is kept out
 * of <AppShell> — the interesting cases are near-misses that nothing in a
 * rendered page makes obvious. `/catalog/8f2c` is a buyer's screen and
 * `/catalogue` is not one; `/` is a brochure even to a buyer who is signed in;
 * and a kader is never here at all, because their own shell answers first.
 */

/**
 * The buyer's own screens, as opposed to the pages they merely visit.
 *
 * /atlas is deliberately absent even though it sits in their rail: it is a
 * full-viewport map that supplies its own chrome, exactly as it does for a
 * kader who reaches it from theirs.
 */
const BUYER_WORKSPACE: readonly string[] = ['/beranda', '/catalog', '/my-requests']

/** True when `pathname` is one of a buyer's working screens, or beneath one. */
export function isBuyerWorkspaceRoute(pathname: string): boolean {
  return BUYER_WORKSPACE.some(href => isActivePath(pathname, href))
}

/**
 * True when this reader, on this path, should get <AppShell> rather than the
 * public header.
 *
 * A signed-out visitor never does: the catalogue is a shop window to them and
 * there is no workspace to name in a rail. Neither does a kader or a pengurus
 * — every route this governs redirects them away, and the cooperative shell is
 * already theirs one directory over.
 */
export function wearsWorkspaceFrame(pathname: string, role: UserRole | null): boolean {
  return role === 'buyer' && isBuyerWorkspaceRoute(pathname)
}
