import { describe, expect, it } from 'vitest'
import { baseScore, successScore } from '../src/domain/scoring.ts'

describe('scoring-v1 base score', () => {
  const table: Record<number, number[]> = {
    3: [1000, 650, 300],
    4: [1000, 770, 530, 300],
    5: [1000, 830, 650, 480, 300],
  }
  for (const [n, scores] of Object.entries(table)) {
    it(`matches the spec table for ${n} reveals`, () => {
      const actual = scores.map((_, i) => baseScore(Number(n), i + 1))
      expect(actual).toEqual(scores)
    })
  }

  it('rounds halves up (N=5, K=2 is 825 -> 830; K=4 is 475 -> 480)', () => {
    expect(baseScore(5, 2)).toBe(830)
    expect(baseScore(5, 4)).toBe(480)
  })

  it('is monotonically decreasing in K', () => {
    for (let n = 3; n <= 5; n++) {
      for (let k = 2; k <= n; k++) expect(baseScore(n, k)).toBeLessThan(baseScore(n, k - 1))
    }
  })

  it('rejects out-of-range input', () => {
    expect(() => baseScore(2, 1)).toThrow(RangeError)
    expect(() => baseScore(6, 1)).toThrow(RangeError)
    expect(() => baseScore(4, 0)).toThrow(RangeError)
    expect(() => baseScore(4, 5)).toThrow(RangeError)
    expect(() => baseScore(4.5, 1)).toThrow(RangeError)
  })
})

describe('scoring-v1 success score', () => {
  it('spec example: 4 reveals, solved after 3 with 1 mistake = 430', () => {
    expect(successScore(4, 3, 1)).toBe(430)
  })

  it('spec example: last reveal after two mistakes = 100', () => {
    expect(successScore(4, 4, 2)).toBe(100)
  })

  it('stays within 100..1000 for every legal combination', () => {
    for (let n = 3; n <= 5; n++) {
      for (let k = 1; k <= n; k++) {
        for (let w = 0; w <= 2; w++) {
          const score = successScore(n, k, w)
          expect(score).toBeGreaterThanOrEqual(100)
          expect(score).toBeLessThanOrEqual(1000)
        }
      }
    }
  })

  it('never goes below the floor of 100', () => {
    expect(successScore(3, 3, 2)).toBe(100) // 300 - 200
    expect(successScore(5, 5, 2)).toBe(100)
  })

  it('does not accept 3 mistakes for a solved round', () => {
    expect(() => successScore(4, 1, 3)).toThrow(RangeError)
  })
})
