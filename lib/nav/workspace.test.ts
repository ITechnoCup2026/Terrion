import { describe, expect, it } from 'vitest'

import { flatNavItems } from './items'
import { isBuyerWorkspaceRoute, wearsWorkspaceFrame } from './workspace'

describe('wearsWorkspaceFrame', () => {
  it('gives a signed-in buyer the cooperative frame on each of their screens', () => {
    for (const path of ['/beranda', '/catalog', '/my-requests']) {
      expect(wearsWorkspaceFrame(path, 'buyer')).toBe(true)
    }
  })

  // A listing's own page is where a buyer actually sends a request, so losing
  // the rail there would drop them back into the shop window mid-task.
  it('keeps the frame on a screen beneath one of them', () => {
    expect(wearsWorkspaceFrame('/catalog/8f2c', 'buyer')).toBe(true)
  })

  // The catalogue serves a stranger and an account holder from one URL. The
  // stranger has no workspace to put in a rail.
  it('leaves a signed-out visitor on the public header', () => {
    expect(wearsWorkspaceFrame('/catalog', null)).toBe(false)
  })

  // A brochure with a workspace rail down its left is not a brochure.
  it('never dresses the landing page as a workspace', () => {
    expect(wearsWorkspaceFrame('/', 'buyer')).toBe(false)
  })

  // Shared by WhatsApp, usually to somebody with no account at all.
  it('leaves a shared garden alone', () => {
    expect(wearsWorkspaceFrame('/garden/abc123', 'buyer')).toBe(false)
  })

  it('gives cooperative roles nothing here — their own shell answers first', () => {
    expect(wearsWorkspaceFrame('/catalog', 'kader')).toBe(false)
    expect(wearsWorkspaceFrame('/catalog', 'pengurus')).toBe(false)
  })

  // The near-miss a naive startsWith would get wrong.
  it('does not match a route that merely begins with one', () => {
    expect(isBuyerWorkspaceRoute('/catalogue')).toBe(false)
    expect(isBuyerWorkspaceRoute('/berandalain')).toBe(false)
  })

  // The rail and the frame are two views of one list. If a buyer destination
  // is added to the nav and not here, it renders with no rail at all.
  it('covers every buyer destination except the map, which frames itself', () => {
    const railed = flatNavItems('buyer')
      .map(i => i.href)
      .filter(href => href !== '/atlas')

    for (const href of railed) expect(isBuyerWorkspaceRoute(href)).toBe(true)
    expect(isBuyerWorkspaceRoute('/atlas')).toBe(false)
  })
})
