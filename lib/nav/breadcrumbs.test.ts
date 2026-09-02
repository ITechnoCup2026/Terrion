import { describe, expect, it } from 'vitest'

import { breadcrumbsFor } from './breadcrumbs'

describe('breadcrumbsFor', () => {
  it('ends on the section itself when you are standing on it', () => {
    expect(breadcrumbsFor('/plots')).toEqual([
      { label: 'Operasi' },
      { label: 'Lahan' },
    ])
  })

  it('links back to the section from a named child', () => {
    expect(breadcrumbsFor('/plots/new')).toEqual([
      { label: 'Operasi' },
      { label: 'Lahan', href: '/plots' },
      { label: 'Daftarkan lahan' },
    ])
  })

  // A plot id is not a name, so the leaf says what kind of thing it is and the
  // page's own heading prints the name.
  it('names the kind of a record whose id is all the URL carries', () => {
    expect(breadcrumbsFor('/plots/8f2c-11ee')).toEqual([
      { label: 'Operasi' },
      { label: 'Lahan', href: '/plots' },
      { label: 'Detail lahan' },
    ])
  })

  it('carries the trading group for a purchases child', () => {
    expect(breadcrumbsFor('/purchases/rdkk')).toEqual([
      { label: 'Perdagangan' },
      { label: 'Pembelian', href: '/purchases' },
      { label: 'Ekspor RDKK' },
    ])
  })

  it('ignores a trailing slash', () => {
    expect(breadcrumbsFor('/dashboard/')).toEqual([
      { label: 'Operasi' },
      { label: 'Dashboard' },
    ])
  })

  // A buyer's navigation is one group, and a section label above the only
  // section names nothing -- the rail drops it, so the trail drops it too.
  it('drops the section crumb for a reader who has only one section', () => {
    expect(breadcrumbsFor('/catalog', 'buyer')).toEqual([{ label: 'Katalog' }])
    expect(breadcrumbsFor('/catalog/8f2c-11ee', 'buyer')).toEqual([
      { label: 'Katalog', href: '/catalog' },
      { label: 'Detail pasokan' },
    ])
  })

  it('keeps the section crumb for a role that has several', () => {
    expect(breadcrumbsFor('/purchases', 'pengurus')).toEqual([
      { label: 'Perdagangan' },
      { label: 'Pembelian' },
    ])
  })

  // A buyer cannot reach the cooperative's screens, so their trail says nothing
  // about one -- the filtered groups are the ones searched.
  it('returns nothing for a page the role cannot reach', () => {
    expect(breadcrumbsFor('/dashboard', 'buyer')).toEqual([])
  })

  // The prefix trap that isActivePath exists to avoid, reaching this far.
  it('returns nothing for a path no nav item owns', () => {
    expect(breadcrumbsFor('/plotsomething')).toEqual([])
    expect(breadcrumbsFor('/login')).toEqual([])
  })
})
