import {
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Map,
  ShoppingCart,
  Sprout,
  Store,
  type LucideIcon,
} from 'lucide-react'

import type { UserRole } from '@/lib/auth/roles'

/**
 * The cooperative app's navigation, as data.
 *
 * It used to be a flat four-item array inside <AppNav>, which is why the
 * sidebar could not say anything about the shape of the product: "Lahan" and
 * "Dashboard" are what you look at, "Pembelian" and "Permintaan" are what you
 * commit the cooperative to, and the catalogue is somebody else's screen you
 * are allowed to visit. An ERP earns its density from that grouping -- a rail
 * of six unlabelled links is a menu, a rail of three named groups is a map of
 * the business.
 *
 * Three things need the same list and previously had none in common: the
 * sidebar, the breadcrumb trail, and the command palette. A destination added
 * here appears in all three.
 */

export type NavItem = {
  href: string
  label: string
  /** One line for the command palette and the collapsed rail's tooltip. */
  hint: string
  icon: LucideIcon
  /**
   * Who this page is actually for. A kader who follows "Permintaan" is
   * redirected straight back to the dashboard by the page's own guard, so
   * showing them the link is an invitation to a dead end -- the guard stays
   * (this is not a security boundary), but the rail stops lying.
   */
  roles?: readonly UserRole[]
}

export type NavGroup = {
  /** The rail's section label. Null for the first group, which needs none. */
  label: string
  items: readonly NavItem[]
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Operasi',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        hint: 'Proyeksi panen 12 minggu dan penumpukan',
        icon: LayoutDashboard,
      },
      {
        href: '/plots',
        label: 'Lahan',
        hint: 'Daftar lahan koperasi dan jadwal panennya',
        icon: Sprout,
      },
    ],
  },
  {
    label: 'Perdagangan',
    items: [
      {
        href: '/purchases',
        label: 'Pembelian',
        hint: 'Kebutuhan pupuk musim ini dan pesanan kelompok',
        icon: ShoppingCart,
      },
      {
        href: '/requests',
        label: 'Permintaan',
        hint: 'Permintaan pasokan dari pembeli',
        icon: Inbox,
        roles: ['pengurus'],
      },
    ],
  },
  {
    label: 'Publik',
    items: [
      {
        href: '/catalog',
        label: 'Katalog',
        hint: 'Pasokan koperasi seperti yang dilihat pembeli',
        icon: Store,
        roles: ['buyer'],
      },
      {
        href: '/my-requests',
        label: 'Permintaan Saya',
        hint: 'Status pengajuan kontrak pasokan Anda: diterima, menunggu, ditolak',
        icon: ClipboardList,
        roles: ['buyer'],
      },
      {
        href: '/atlas',
        label: 'Atlas',
        hint: 'Peta koperasi se-nusantara',
        icon: Map,
      },
    ],
  },
]

/** The groups a given role may see, with empty groups dropped. */
export function navGroupsFor(role: UserRole): NavGroup[] {
  return NAV_GROUPS
    .map(group => ({ ...group, items: group.items.filter(i => !i.roles || i.roles.includes(role)) }))
    .filter(group => group.items.length > 0)
}

/** Every destination in one flat list — what the command palette searches. */
export function flatNavItems(role: UserRole): NavItem[] {
  return navGroupsFor(role).flatMap(g => g.items)
}
