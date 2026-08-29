import { describe, it, expect } from 'vitest'
import { neighboursOf, type PlotNeighbour } from './siblings'

const plot = (publicId: string, name = publicId): PlotNeighbour =>
  ({ publicId, name, memberName: 'Anggota', areaHa: 1 })

const list = [plot('a'), plot('b'), plot('c')]

describe('neighboursOf', () => {
  it('reports the position in the cooperative', () => {
    expect(neighboursOf(list, 'b')).toMatchObject({ position: 2, total: 3 })
  })

  it('gives both neighbours in the middle', () => {
    const n = neighboursOf(list, 'b')
    expect(n.previous?.publicId).toBe('a')
    expect(n.next?.publicId).toBe('c')
  })

  // The ends are ends. A "next" on the last plot that lands back on the first
  // tells the reader they have finished by silently starting over.
  it('does not wrap at the first plot', () => {
    const n = neighboursOf(list, 'a')
    expect(n.previous).toBeNull()
    expect(n.next?.publicId).toBe('b')
  })

  it('does not wrap at the last plot', () => {
    const n = neighboursOf(list, 'c')
    expect(n.previous?.publicId).toBe('b')
    expect(n.next).toBeNull()
  })

  it('lists every other plot, in order, without the current one', () => {
    expect(neighboursOf(list, 'b').others.map(p => p.publicId)).toEqual(['a', 'c'])
  })

  it('offers nothing for a cooperative with one plot', () => {
    const n = neighboursOf([plot('only')], 'only')
    expect(n).toMatchObject({ position: 1, total: 1, previous: null, next: null })
    expect(n.others).toEqual([])
  })

  // Not worth throwing over: the page still renders, it just has no siblings.
  it('survives a plot missing from its own list', () => {
    const n = neighboursOf(list, 'ghost')
    expect(n).toMatchObject({ position: 0, total: 3, previous: null, next: null })
    expect(n.others).toHaveLength(3)
  })

  it('handles an empty list', () => {
    expect(neighboursOf([], 'a')).toMatchObject({ position: 0, total: 0, others: [] })
  })

  it('does not mutate its input', () => {
    const before = list.map(p => p.publicId)
    neighboursOf(list, 'b')
    expect(list.map(p => p.publicId)).toEqual(before)
  })
})
