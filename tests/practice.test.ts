import { describe, expect, it } from 'vitest'
import { buildPracticeOrder, type PracticeCandidate } from '../src/domain/practice.ts'

const pool: PracticeCandidate[] = [
  { id: 'p-a1', revision: 1, clubId: 'a' },
  { id: 'p-a2', revision: 1, clubId: 'a' }, // second puzzle for the same club
  { id: 'p-b', revision: 1, clubId: 'b' },
  { id: 'p-c', revision: 2, clubId: 'c' },
  { id: 'p-d', revision: 1, clubId: 'd' },
]

describe('buildPracticeOrder', () => {
  it('is deterministic for a given seed (stable across renders and refreshes)', () => {
    expect(buildPracticeOrder(pool, 42)).toEqual(buildPracticeOrder(pool, 42))
  })

  it('different seeds can give different orders', () => {
    const orders = new Set(Array.from({ length: 20 }, (_, seed) => JSON.stringify(buildPracticeOrder(pool, seed))))
    expect(orders.size).toBeGreaterThan(1)
  })

  it('uses one puzzle per club, so no club repeats until the pool is exhausted', () => {
    for (let seed = 0; seed < 50; seed++) {
      const order = buildPracticeOrder(pool, seed)
      const clubs = order.map((ref) => pool.find((c) => c.id === ref.id && c.revision === ref.revision)!.clubId)
      expect(new Set(clubs).size).toBe(clubs.length)
      expect(order).toHaveLength(4)
    }
  })

  it('keeps the revision of the chosen puzzle', () => {
    const order = buildPracticeOrder(pool, 1)
    expect(order.find((r) => r.id === 'p-c')?.revision).toBe(2)
  })

  it('does not start a new cycle with the club that just finished, when an alternative exists', () => {
    for (let seed = 0; seed < 50; seed++) {
      const order = buildPracticeOrder(pool, seed, 'b')
      expect(order[0].id).not.toBe('p-b')
    }
  })

  it('handles a single-club pool and an empty pool', () => {
    expect(buildPracticeOrder([pool[2]], 1, 'b')).toHaveLength(1)
    expect(buildPracticeOrder([], 1)).toEqual([])
  })
})
