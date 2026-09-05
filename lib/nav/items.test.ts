import { describe, expect, it } from 'vitest'

import { flatNavItems, navGroupsFor } from './items'

describe('navGroupsFor', () => {
  // Every cooperative page redirects a buyer to /login, so a rail that offers
  // them one is a rail pointing at a dead end. This was latent until buyers
  // got a rail of their own: an item with no `roles` means everyone.
  it('offers a buyer nothing the cooperative owns', () => {
    const hrefs = flatNavItems('buyer').map(i => i.href)
    expect(hrefs).toEqual(['/catalog', '/my-requests', '/atlas'])
  })

  it('gives a buyer one group, so the rail has no section label to print', () => {
    expect(navGroupsFor('buyer')).toHaveLength(1)
  })

  // A kader may draw plans -- proposing stores nothing -- but only a pengurus
  // may apply one. That split lives in the page guard and the backend, not in
  // the rail, so the link is offered to both.
  it('offers planning to everyone who works inside the cooperative', () => {
    expect(flatNavItems('kader').map(i => i.href)).toContain('/plans')
    expect(flatNavItems('pengurus').map(i => i.href)).toContain('/plans')
    expect(flatNavItems('buyer').map(i => i.href)).not.toContain('/plans')
  })

  it('keeps the pengurus-only inbox away from a kader', () => {
    expect(flatNavItems('kader').map(i => i.href)).not.toContain('/requests')
    expect(flatNavItems('pengurus').map(i => i.href)).toContain('/requests')
  })

  it('still gives the cooperative its own screens', () => {
    expect(flatNavItems('pengurus').map(i => i.href)).toEqual(
      ['/dashboard', '/plots', '/plans', '/purchases', '/requests', '/atlas'],
    )
  })
})
