import { describe, it, expect } from 'vitest'
import { tileAt } from './hittest'
import { allocateTiles } from '@/lib/tilegrid/allocate'

const rect = { left: 0, top: 0 } as DOMRect
const layout = allocateTiles({ plotAreaHa: 1.0, blocks: [
  { id: 'a', areaHa: 0.5, orderIndex: 0 },
  { id: 'b', areaHa: 0.5, orderIndex: 1 },
]})

describe('tileAt', () => {
  it('maps the origin to tile 0 at scale 1 with no offset', () => {
    const hit = tileAt({ scale: 1, offsetX: 0, offsetY: 0 }, 32, layout, 5, 5, rect)
    expect(hit).toEqual({ col: 0, row: 0, index: 0, blockIndex: 0 })
  })

  it('accounts for scale', () => {
    const hit = tileAt({ scale: 2, offsetX: 0, offsetY: 0 }, 32, layout, 70, 5, rect)
    expect(hit!.col).toBe(1)   // 70/2 = 35 → col 1
  })

  it('accounts for offset', () => {
    const hit = tileAt({ scale: 1, offsetX: 64, offsetY: 0 }, 32, layout, 70, 5, rect)
    expect(hit!.col).toBe(0)   // (70-64)/1 = 6 → col 0
  })

  it('returns null outside the grid', () => {
    expect(tileAt({ scale: 1, offsetX: 0, offsetY: 0 }, 32, layout, -10, 5, rect)).toBeNull()
    expect(tileAt({ scale: 1, offsetX: 0, offsetY: 0 }, 32, layout, 99_999, 5, rect)).toBeNull()
  })

  it('returns null on an empty trailing tile', () => {
    const last = layout.cols * layout.rows - 1
    if (layout.tiles[last] === 0) {
      const c = last % layout.cols, r = Math.floor(last / layout.cols)
      const hit = tileAt({ scale: 1, offsetX: 0, offsetY: 0 }, 32, layout,
                         c * 32 + 5, r * 32 + 5, rect)
      expect(hit).toBeNull()
    }
  })
})
